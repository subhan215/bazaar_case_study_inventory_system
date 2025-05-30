import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import pool from "../../../../../database/database";

export async function DELETE(req, { params }) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");

    const client = await pool.connect();

    try {
        // Begin transaction
        await client.query("BEGIN");

        // Check if supplier exists and is not already deleted
        const checkRes = await client.query(
            "SELECT * FROM suppliers WHERE supplier_id = $1 AND is_deleted = false",
            [supplierId]
        );

        if (checkRes.rows.length === 0) {
            // Rollback in case the supplier is not found or already deleted
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Supplier not found or already deleted" }, { status: 404 });
        }

        // Perform soft delete
        await client.query(
            "UPDATE suppliers SET is_deleted = true, deleted_at = NOW() WHERE supplier_id = $1",
            [supplierId]
        );

        // Commit the transaction
        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: `Supplier with ID ${supplierId} marked as deleted.`,
        });
    } catch (error) {
        // Rollback in case of error
        await client.query("ROLLBACK");
        console.error("Error soft deleting supplier:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
