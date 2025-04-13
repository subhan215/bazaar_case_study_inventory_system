import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import { primaryPool } from "../../../../../database/database";

export async function DELETE(req, { params }) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    const client = await primaryPool.connect();

    try {
        const checkRes = await client.query(
            "SELECT * FROM stores WHERE store_id = $1 AND is_deleted = false",
            [storeId]
        );

        if (checkRes.rows.length === 0) {
            return NextResponse.json({ error: "Store not found or already deleted" }, { status: 404 });
        }

        await client.query(
            "UPDATE stores SET is_deleted = true, deleted_at = NOW() WHERE store_id = $1",
            [storeId]
        );

        return NextResponse.json({
            success: true,
            message: `Store with ID ${storeId} marked as deleted.`,
        });
    } catch (error) {
        console.error("Error soft deleting store:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
