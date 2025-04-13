import { NextResponse } from "next/server";
import pool from "../../../../../../database/database";
import { authenticateStore } from "../../../../../../middleware/authStore";

export async function PUT(req, { params }) {
    const { storeId } = await authenticateStore(req);
    if (!storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await pool.connect();
    const { id } = await params;
    if (storeId != parseInt(id)) {
        return NextResponse.json({ error: "Unauthorized store access" }, { status: 403 });
    }

    const { sku, supplier_id, quantity, purchase_price } = await req.json();

    try {
        await client.query("BEGIN");

        // Fetch Product ID from DB
        const productRes = await client.query(
            "SELECT product_id FROM products WHERE sku = $1",
            [sku]
        );

        if (productRes.rows.length === 0) throw new Error("Product not found");

        const productId = productRes.rows[0].product_id;

        // Fetch Inventory from DB
        const existingStockRes = await client.query(
            `SELECT inventory_id, quantity FROM inventory 
             WHERE store_id = $1 AND product_id = $2 AND supplier_id = $3 AND purchase_price = $4`,
            [id, productId, supplier_id, purchase_price]
        );

        if (existingStockRes.rows.length > 0) {
            // If stock exists with the same purchase price, update quantity
            const { inventory_id, quantity: existingQuantity } = existingStockRes.rows[0];

            await client.query(
                `UPDATE inventory 
                 SET quantity = $1, updated_at = NOW() 
                 WHERE inventory_id = $2`,
                [existingQuantity + quantity, inventory_id]
            );
        } else {
            // Insert new stock entry
            await client.query(
                `INSERT INTO inventory (store_id, product_id, supplier_id, quantity, purchase_price, updated_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [id, productId, supplier_id, quantity, purchase_price]
            );
        }

        // Log Stock-In Event
        await client.query(
            `INSERT INTO stock_in (store_id, product_id, supplier_id, quantity, purchase_price, timestamp) 
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [id, productId, supplier_id, quantity, purchase_price]
        );

        await client.query("COMMIT");

        return NextResponse.json({ success: true, message: "Stock updated successfully" });

    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
