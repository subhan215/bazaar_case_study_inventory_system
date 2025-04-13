import { NextResponse } from "next/server";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import { primaryPool } from "../../../../../database/database";

export async function POST(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await primaryPool.connect();
    const { name, contact, address } = await req.json();

    try {
        await client.query("BEGIN");

        const existingSupplierRes = await client.query(
            "SELECT * FROM suppliers WHERE contact = $1 AND is_deleted = true",
            [contact]
        );

        let result;

        if (existingSupplierRes.rows.length > 0) {
            result = await client.query(
                "UPDATE suppliers SET is_deleted = false, name = $2, address = $3 WHERE contact = $1 RETURNING *",
                [contact, name, address]
            );
        } else {
            result = await client.query(
                "INSERT INTO suppliers (name, contact, address) VALUES ($1, $2, $3) RETURNING *",
                [name, contact, address]
            );
        }

        await client.query("COMMIT");

        return NextResponse.json({ success: true, supplier: result.rows[0] });

    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
