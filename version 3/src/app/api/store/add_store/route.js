import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { primaryPool } from "../../../../../database/database";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";

export async function POST(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await primaryPool.connect();
    const { name, location } = await req.json();

    try {
        await client.query("BEGIN");

        const existingStoreRes = await client.query(
            "SELECT * FROM stores WHERE name = $1 AND location = $2 AND is_deleted = false",
            [name, location]
        );

        if (existingStoreRes.rows.length > 0) {
            const store = existingStoreRes.rows[0];
            await client.query(
                "UPDATE stores SET is_deleted = true WHERE store_id = $1",
                [store.store_id]
            );

            await client.query("COMMIT");

            return NextResponse.json({
                success: true,
                store: store,
                message: "Store marked as deleted"
            });
        }

        const plainPassword = crypto.randomBytes(8).toString("hex");

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const result = await client.query(
            "INSERT INTO stores (name, location, password) VALUES ($1, $2, $3) RETURNING store_id, name, location",
            [name, location, hashedPassword]
        );

        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            store: result.rows[0],
            generatedPassword: plainPassword
        });
    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
