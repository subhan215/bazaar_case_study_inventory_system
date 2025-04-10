import { NextResponse } from "next/server";
import { primaryPool } from "../../../../../database/database"; // Use primaryPool for writes
import { authenticateStore } from "../../../../../middleware/authStore";

export async function POST(req) {
    const { success, storeId } = await authenticateStore(req); 
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await primaryPool.connect(); // Use primaryPool for write operations
    const { name, contact, address } = await req.json();

    try {
        // Begin transaction
        await client.query("BEGIN");

        const result = await client.query(
            `INSERT INTO supplier_requests (store_id, supplier_name, contact_details, address, status) 
             VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
            [storeId, name, contact, address]
        );

        // Commit the transaction
        await client.query("COMMIT");

        return NextResponse.json({ success: true, request: result.rows[0] });
    } catch (error) {
        // Rollback in case of error
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
