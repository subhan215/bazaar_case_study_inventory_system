import { NextResponse } from "next/server";
import { primaryPool } from "../../../../../../database/database"; // Use primaryPool for writes
import { authenticateAdmin } from "../../../../../../middleware/authAdmin"; // Admin authentication

export async function PATCH(req, { params }) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await primaryPool.connect(); // Use primaryPool for write operations
    const { status } = await req.json(); // 'approved' or 'rejected'
    const { request_id } = params;

    if (!["approved", "rejected"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    try {
        // Begin transaction
        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE supplier_requests 
             SET status = $1 
             WHERE request_id = $2 
             RETURNING *`,
            [status, request_id]
        );

        if (result.rowCount === 0) {
            // Rollback in case request is not found
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Commit the transaction
        await client.query("COMMIT");

        return NextResponse.json({ success: true, request: result.rows[0] });
    } catch (error) {
        // Rollback in case of any error
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
