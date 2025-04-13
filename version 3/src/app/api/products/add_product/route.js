import { NextResponse } from "next/server";
import { primaryPool } from "../../../../../database/database";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import eventEmitter from "../../../../../utils/eventEmitter";
import "../../../../../listeners/cache_Events/products_cache_remove";

export async function POST(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await primaryPool.connect();
    const { sku, name, selling_price } = await req.json();

    try {
        await client.query("BEGIN");

        const existingProductRes = await client.query(
            "SELECT * FROM products WHERE sku = $1 AND is_deleted = true",
            [sku]
        );

        let result;

        if (existingProductRes.rows.length > 0) {
            result = await client.query(
                "UPDATE products SET is_deleted = false, name = $2, selling_price = $3 WHERE sku = $1 RETURNING *",
                [sku, name, selling_price]
            );
        } else {
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

        await client.query("COMMIT");

        eventEmitter.emit("cache:invalidate:products");

        return NextResponse.json({ success: true, product: result.rows[0] });

    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
