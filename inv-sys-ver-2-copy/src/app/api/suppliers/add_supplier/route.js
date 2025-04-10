import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import pool from "../../../../../database/database";

export async function POST(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await pool.connect();
    const { name, contact, address } = await req.json();

    try {
        // Begin transaction
        await client.query("BEGIN");

        const result = await client.query(
            "INSERT INTO suppliers (name, contact, address) VALUES ($1, $2, $3) RETURNING *",
            [name, contact, address]
        );

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
