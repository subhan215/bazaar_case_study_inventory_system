import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import pool from "../../../../../database/database";

export async function DELETE(req, { params }) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    const client = await pool.connect();

    try {
        // Begin transaction
        await client.query("BEGIN");

        // ✅ Check if store exists and is not already deleted
        const checkRes = await client.query(
            "SELECT * FROM stores WHERE store_id = $1 AND is_deleted = false",
            [storeId]
        );

        if (checkRes.rows.length === 0) {
            return NextResponse.json({ error: "Store not found or already deleted" }, { status: 404 });
        }

        // ✅ Perform soft delete
        await client.query(
            "UPDATE stores SET is_deleted = true, deleted_at = NOW() WHERE store_id = $1",
            [storeId]
        );

        // Commit transaction after deleting the store
        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: `Store with ID ${storeId} marked as deleted.`,
        });
    } catch (error) {
        // Rollback in case of error
        await client.query("ROLLBACK");
        console.error("Error soft deleting store:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
