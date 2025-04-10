import { NextResponse } from "next/server";
import { authenticateStore } from "../../../../../../middleware/authStore";
import pool from "../../../../../../database/database";

export async function DELETE(req, { params }) {
    const { storeId } = await authenticateStore(req);
    if (!storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await pool.connect();
    const { id } = await params; // Store ID from URL params
    const { sku, supplier_id, quantity, purchase_price, reason } = await req.json();

    if (!reason || !['damaged', 'expired', 'lost'].includes(reason)) {
        return NextResponse.json({ error: "Invalid or missing reason" }, { status: 400 });
    }

    if (storeId != parseInt(id)) {
        return NextResponse.json({ error: "Unauthorized store access" }, { status: 403 });
    }

    try {
        await client.query("BEGIN");

        // Get Product ID from SKU
        const productRes = await client.query("SELECT product_id FROM products WHERE sku = $1", [sku]);
        if (productRes.rows.length === 0) throw new Error("Product not found");
        const productId = productRes.rows[0].product_id;

        // Check available stock with the given purchase price
        const stockRes = await client.query(
            `SELECT quantity FROM inventory 
             WHERE store_id = $1 AND product_id = $2 AND supplier_id = $3 AND purchase_price = $4`,
            [storeId, productId, supplier_id, purchase_price]
        );

        if (stockRes.rows.length === 0 || stockRes.rows[0].quantity < quantity) {
            throw new Error("Insufficient stock from this supplier at the given purchase price");
        }

        // Deduct stock from inventory
        await client.query(
            "UPDATE inventory SET quantity = quantity - $1 WHERE store_id = $2 AND product_id = $3 AND supplier_id = $4 AND purchase_price = $5",
            [quantity, storeId, productId, supplier_id, purchase_price]
        );

        // Log Removed Stock with the given purchase price
        await client.query(
            `INSERT INTO removed_stock (store_id, product_id, supplier_id, quantity, purchase_price, reason, timestamp) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [storeId, productId, supplier_id, quantity, purchase_price, reason]
        );

        await client.query("COMMIT");

        return NextResponse.json({ success: true, message: "Stock removed successfully" });

    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
