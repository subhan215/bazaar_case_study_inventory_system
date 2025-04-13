import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import { primaryPool } from "../../../../../database/database";

export async function DELETE(req, { params }) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");

    const client = await primaryPool.connect();

    try {
        await client.query("BEGIN");
        const checkRes = await client.query(
            "SELECT * FROM suppliers WHERE supplier_id = $1 AND is_deleted = false",
            [supplierId]
        );

        if (checkRes.rows.length === 0) {
            return NextResponse.json({ error: "Supplier not found or already deleted" }, { status: 404 });
        }

        await client.query(
            "UPDATE suppliers SET is_deleted = true, deleted_at = NOW() WHERE supplier_id = $1",
            [supplierId]
        );

        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: `Supplier with ID ${supplierId} marked as deleted.`,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
