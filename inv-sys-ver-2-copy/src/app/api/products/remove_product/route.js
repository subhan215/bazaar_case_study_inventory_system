import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import pool from "../../../../../database/database";

export async function DELETE(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
        return NextResponse.json({ error: "Missing productId in query parameters" }, { status: 400 });
    }

    const client = await pool.connect();

    try {
        // Start a transaction
        await client.query("BEGIN");

        // ✅ Check if product exists and is not already deleted
        const checkRes = await client.query(
            "SELECT * FROM products WHERE product_id = $1 AND is_deleted = false",
            [productId]
        );

        if (checkRes.rows.length === 0) {
            return NextResponse.json({ error: "Product not found or already deleted" }, { status: 404 });
        }

        // ✅ Perform soft delete
        await client.query(
            "UPDATE products SET is_deleted = true, deleted_at = NOW() WHERE product_id = $1",
            [productId]
        );

        // Commit the transaction
        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: `Product with ID ${productId} marked as deleted.`,
        });
    } catch (error) {
        // Rollback in case of error
        await client.query("ROLLBACK");
        console.error("Error soft deleting product:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
