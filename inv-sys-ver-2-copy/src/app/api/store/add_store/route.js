import { NextResponse } from "next/server";
import crypto from "crypto"; // For generating a random password
import bcrypt from "bcrypt"; // For hashing the password
import pool from "../../../../../database/database";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";

export async function POST(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const client = await pool.connect();
    const { name, location } = await req.json();

    try {
        // Generate a random 12-character password
        const plainPassword = crypto.randomBytes(8).toString("hex");

        // Hash the password with bcrypt (salt rounds = 10)
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Insert store with the hashed password
        const result = await client.query(
            "INSERT INTO stores (name, location, password) VALUES ($1, $2, $3) RETURNING store_id, name, location",
            [name, location, hashedPassword]
        );

        return NextResponse.json({
            success: true,
            store: result.rows[0],
            generatedPassword: plainPassword // Send plain password only for initial display (optional)
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
