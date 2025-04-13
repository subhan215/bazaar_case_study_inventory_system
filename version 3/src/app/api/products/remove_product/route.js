import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import { primaryPool } from "../../../../../database/database";
import "../../../../../listeners/cache_Events/products_cache_remove";
import eventEmitter from "../../../../../utils/eventEmitter";

export async function DELETE(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
        return NextResponse.json({ error: "Missing productId in query parameters" }, { status: 400 });
    }

    const client = await primaryPool.connect();

    try {
        await client.query("BEGIN");

        const checkRes = await client.query(
            "SELECT * FROM products WHERE product_id = $1 AND is_deleted = false",
            [productId]
        );

        if (checkRes.rows.length === 0) {
            return NextResponse.json({ error: "Product not found or already deleted" }, { status: 404 });
        }

        await client.query(
            "UPDATE products SET is_deleted = true, deleted_at = NOW() WHERE product_id = $1",
            [productId]
        );

        await client.query("COMMIT");

        eventEmitter.emit("cache:invalidate:products");

        return NextResponse.json({
            success: true,
            message: `Product with ID ${productId} marked as deleted.`,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
