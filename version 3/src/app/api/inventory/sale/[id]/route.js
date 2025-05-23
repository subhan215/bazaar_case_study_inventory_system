import { NextResponse } from "next/server";
import { authenticateStore } from "../../../../../../middleware/authStore";
import { primaryPool, replicaPool } from "../../../../../../database/database";
import redis from "../../../../../../utils/redis";
import eventEmitter from "../../../../../../utils/eventEmitter";
import "../../../../../../listeners/cache_Events/reports_clear";
import "../../../../../../listeners/update_quantity";
import "../../../../../../listeners/insertion_events/sale_insert";
import "../../../../../../listeners/cache_Events/inventory_cache_remove";
import "../../../../../../listeners/cache_Events/all_inventory_remove_cache";

export async function POST(req, { params }) {
    const { storeId } = await authenticateStore(req);
    if (!storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (storeId != parseInt(id)) {
        return NextResponse.json({ error: "Unauthorized store access" }, { status: 403 });
    }

    let totalProfit = 0;
    const client = await primaryPool.connect();

    try {
        const { sku, quantity } = await req.json();
        await client.query("BEGIN");

        const productCacheKey = `product:${sku}`;
        let productData = await redis.get(productCacheKey);

        if (!productData) {
            const readClient = await replicaPool.connect();
            const productRes = await readClient.query(
                "SELECT * FROM products WHERE sku = $1",
                [sku]
            );
            readClient.release();

            if (productRes.rows.length === 0) throw new Error("Product not found");

            productData = productRes.rows[0];
            await redis.set(productCacheKey, JSON.stringify(productData), { EX: 600 });
        } else {
            productData = JSON.parse(productData);
        }

        const { product_id, selling_price } = productData;
        const totalSellingPrice = selling_price * quantity;

        const inventoryCacheKey = `inventory:${storeId}`;
        let inventoryData = await redis.get(inventoryCacheKey);

        if (!inventoryData) {
            const stockRes = await client.query(
                `SELECT *
                 FROM inventory 
                 WHERE store_id = $1 AND product_id = $2 
                 ORDER BY purchase_price ASC, updated_at ASC`,
                [storeId, product_id]
            );

            if (stockRes.rows.length === 0) throw new Error("No stock available for this product");

            inventoryData = stockRes.rows;
            await redis.set(inventoryCacheKey, JSON.stringify(inventoryData), { EX: 300 });
        } else {
            inventoryData = JSON.parse(inventoryData);
        }

        let remainingQuantity = quantity;
        let totalCost = 0;
        let supplierId = null;

        for (const row of inventoryData) {
            if (remainingQuantity <= 0) break;

            const { quantity: availableStock, purchase_price, supplier_id } = row;
            supplierId = supplier_id;
            const deductQuantity = Math.min(availableStock, remainingQuantity);

            eventEmitter.emit("stock:update", {
                deductQuantity,
                operation: "minus",
                storeId,
                productId: product_id,
                supplier_id,
                purchase_price,
                oldData: row,
                action: "sold"
            });

            remainingQuantity -= deductQuantity;
            totalCost += deductQuantity * purchase_price;
            const profit = (deductQuantity * selling_price) - (deductQuantity * purchase_price);
            totalProfit += profit;

            eventEmitter.emit("sale:insert", {
                storeId,
                productId: product_id,
                quantity: deductQuantity,
                purchase_price,
                selling_price,
                profit,
                supplierId
            });
        }

        if (remainingQuantity > 0) {
            throw new Error("Not enough stock available to fulfill the order");
        }

        await client.query("COMMIT");
        eventEmitter.emit("report:clear");
        eventEmitter.emit("clearAllInventoryCache", storeId);
        eventEmitter.emit("clearInventoryCache", storeId);

        return NextResponse.json({
            success: true,
            message: "Sale recorded successfully",
            totalSellingPrice,
            profit: totalProfit,
        });

    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
