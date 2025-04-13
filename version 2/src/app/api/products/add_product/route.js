import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import pool from "../../../../../database/database";

export async function POST(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await pool.connect();
    const { sku, name, selling_price } = await req.json();

    try {
        // First, check if the product already exists (and is not deleted)
        const existingProductRes = await client.query(
            "SELECT * FROM products WHERE sku = $1 AND is_deleted = true",
            [sku]
        );

        let result;

        if (existingProductRes.rows.length > 0) {
            // If product exists and is marked as deleted, update is_deleted to false
            result = await client.query(
                "UPDATE products SET is_deleted = false, name = $2, selling_price = $3 WHERE sku = $1 RETURNING *",
                [sku, name, selling_price]
            );
        } else {
            // If product does not exist, insert a new product
            if (selling_price !== undefined) {
                result = await client.query(
                    "INSERT INTO products (sku, name, selling_price) VALUES ($1, $2, $3) RETURNING *",
                    [sku, name, selling_price]
                );
            } else {
                result = await client.query(
                    "INSERT INTO products (sku, name) VALUES ($1, $2) RETURNING *",
                    [sku, name]
                );
            }
        }

        // 🔔 Emit cache invalidation event
        eventEmitter.emit("cache:invalidate:products");

        return NextResponse.json({ success: true, product: result.rows[0] });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
