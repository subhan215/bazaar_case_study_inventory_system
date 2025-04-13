import { NextResponse } from "next/server";
import { replicaPool } from "../../../../database/database";
import { authenticateAdmin } from "../../../../middleware/authAdmin";
import { authenticateStore } from "../../../../middleware/authStore";
import redis from "../../../../utils/redis";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const report_type = searchParams.get("report_type");
        const store_id = searchParams.get("store_id");
        const supplier_id = searchParams.get("supplier_id");
        const product_id = searchParams.get("product_id");
        const start_date = searchParams.get("start_date");
        const end_date = searchParams.get("end_date");

        let authenticatedStoreId = null;
        let isAdminAuthenticated = false;

        const adminAuth = await authenticateAdmin(req);
        if (adminAuth.success) {
            isAdminAuthenticated = true;
        } else {
            const storeAuth = await authenticateStore(req);
            if (storeAuth.storeId) {
                authenticatedStoreId = storeAuth.storeId;
            } else {
                return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
            }
        }

        if (!isAdminAuthenticated && authenticatedStoreId != parseInt(store_id)) {
            return NextResponse.json({ success: false, error: "Unauthorized: Store mismatch" }, { status: 403 });
        }

        if (!["sales", "stock-in", "removed-stock", "inventory"].includes(report_type)) {
            return NextResponse.json({ success: false, error: "Invalid report type" }, { status: 400 });
        }

        const cacheKey = `report:${report_type}:${store_id}:${supplier_id}:${product_id}:${start_date}:${end_date}`;

        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return NextResponse.json({ success: true, data: cachedData, message: "Cache response" });
        }

        let query = "";
        let params = [];
        let conditions = [];

        if (report_type === "sales") {
            query = `
                SELECT s.store_id, p.sku, p.name, s.supplier_id, s.purchase_price, 
                       s.selling_price, 
                       SUM(s.quantity) AS total_sold, 
                       MAX(s.timestamp) AS last_sale,
                       SUM(s.quantity * s.selling_price) AS total_revenue,
                       AVG(s.selling_price) AS average_selling_price
                FROM sales s
                JOIN products p ON s.product_id = p.product_id
            `;
            if (store_id) {
                params.push(store_id);
                conditions.push(`s.store_id = $${params.length}`);
            }
            if (supplier_id) {
                params.push(supplier_id);
                conditions.push(`s.supplier_id = $${params.length}`);
            }
            if (start_date && end_date) {
                params.push(start_date, end_date);
                conditions.push(`s.timestamp BETWEEN $${params.length - 1} AND $${params.length}`);
            }
            if (product_id) {
                params.push(product_id);
                conditions.push(`s.product_id = $${params.length}`);
            }
            query += conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
            query += " GROUP BY s.store_id, p.sku, p.name, s.supplier_id, s.purchase_price, s.selling_price";
        } else if (report_type === "stock-in") {
            query = `
                SELECT si.store_id, p.sku, p.name, si.supplier_id, si.purchase_price, 
                       SUM(si.quantity) AS total_stocked, MAX(si.timestamp) AS last_stocked
                FROM stock_in si
                JOIN products p ON si.product_id = p.product_id
            `;
            if (store_id) {
                params.push(store_id);
                conditions.push(`si.store_id = $${params.length}`);
            }
            if (supplier_id) {
                params.push(supplier_id);
                conditions.push(`si.supplier_id = $${params.length}`);
            }
            if (start_date && end_date) {
                params.push(start_date, end_date);
                conditions.push(`si.timestamp BETWEEN $${params.length - 1} AND $${params.length}`);
            }
            if (product_id) {
                params.push(product_id);
                conditions.push(`si.product_id = $${params.length}`);
            }
            query += conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
            query += " GROUP BY si.store_id, p.sku, p.name, si.supplier_id, si.purchase_price";
        } else if (report_type === "removed-stock") {
            query = `
                SELECT rs.store_id, p.sku, p.name, rs.supplier_id, rs.purchase_price, 
                       SUM(rs.quantity) AS total_removed, MAX(rs.timestamp) AS last_removed
                FROM removed_stock rs
                JOIN products p ON rs.product_id = p.product_id
            `;
            if (store_id) {
                params.push(store_id);
                conditions.push(`rs.store_id = $${params.length}`);
            }
            if (supplier_id) {
                params.push(supplier_id);
                conditions.push(`rs.supplier_id = $${params.length}`);
            }
            if (start_date && end_date) {
                params.push(start_date, end_date);
                conditions.push(`rs.timestamp BETWEEN $${params.length - 1} AND $${params.length}`);
            }
            if (product_id) {
                params.push(product_id);
                conditions.push(`rs.product_id = $${params.length}`);
            }
            query += conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
            query += " GROUP BY rs.store_id, p.sku, p.name, rs.supplier_id, rs.purchase_price";
        } else if (report_type === "inventory") {
            query = `
                SELECT i.store_id, p.sku, p.name, i.supplier_id, i.purchase_price,
                       COALESCE(SUM(i.quantity), 0) - 
                       COALESCE((SELECT SUM(s.quantity) FROM sales s WHERE s.product_id = i.product_id AND s.purchase_price = i.purchase_price), 0) - 
                       COALESCE((SELECT SUM(rs.quantity) FROM removed_stock rs WHERE rs.product_id = i.product_id AND rs.purchase_price = i.purchase_price), 0) 
                       AS available_stock
                FROM inventory i
                JOIN products p ON i.product_id = p.product_id
            `;
            if (store_id) {
                params.push(store_id);
                conditions.push(`i.store_id = $${params.length}`);
            }
            if (supplier_id) {
                params.push(supplier_id);
                conditions.push(`i.supplier_id = $${params.length}`);
            }
            if (product_id) {
                params.push(product_id);
                conditions.push(`i.product_id = $${params.length}`);
            }
            query += conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
            query += " GROUP BY i.store_id, p.sku, p.name, i.supplier_id, i.purchase_price";
        }

        const result = await replicaPool.query(query, params);

        await redis.set(cacheKey, JSON.stringify(result.rows), { EX: 300 });
        await redis.sadd("report_keys", cacheKey);

        return NextResponse.json({ success: true, data: result.rows });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
