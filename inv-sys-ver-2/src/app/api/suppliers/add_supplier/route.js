import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import { primaryPool } from "../../../../../database/database"; // Use primaryPool for writes

export async function POST(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await primaryPool.connect(); // Use primaryPool for write operations
    const { name, contact, address } = await req.json();

    try {
        // Begin transaction
        await client.query("BEGIN");

        // First, check if the supplier already exists (and is not deleted)
        const existingSupplierRes = await client.query(
            "SELECT * FROM suppliers WHERE contact = $1 AND is_deleted = true",
            [contact]
        );

        let result;

        if (existingSupplierRes.rows.length > 0) {
            // If supplier exists and is marked as deleted, update is_deleted to false
            result = await client.query(
                "UPDATE suppliers SET is_deleted = false, name = $2, address = $3 WHERE contact = $1 RETURNING *",
                [contact, name, address]
            );
        } else {
            // If supplier does not exist, insert a new supplier
            result = await client.query(
                "INSERT INTO suppliers (name, contact, address) VALUES ($1, $2, $3) RETURNING *",
                [name, contact, address]
            );
        }

        // Commit transaction
        await client.query("COMMIT");

        return NextResponse.json({ success: true, supplier: result.rows[0] });

    } catch (error) {
        // Rollback in case of error
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
