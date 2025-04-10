import { NextResponse } from "next/server";
import crypto from "crypto"; // For generating a random password
import bcrypt from "bcrypt"; // For hashing the password
import { primaryPool } from "../../../../../database/database"; // Use primaryPool for write operations
import { authenticateAdmin } from "../../../../../middleware/authAdmin";

export async function POST(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await primaryPool.connect(); // Use primaryPool for write operations
    const { name, location } = await req.json();

    try {
        // Begin transaction
        await client.query("BEGIN");

        // Check if a store with the same name and location already exists
        const existingStoreRes = await client.query(
            "SELECT * FROM stores WHERE name = $1 AND location = $2 AND is_deleted = false",
            [name, location]
        );

        if (existingStoreRes.rows.length > 0) {
            // If the store exists, mark it as deleted
            const store = existingStoreRes.rows[0];
            await client.query(
                "UPDATE stores SET is_deleted = true WHERE store_id = $1",
                [store.store_id]
            );

            // Commit the transaction after marking as deleted
            await client.query("COMMIT");

            return NextResponse.json({
                success: true,
                store: store, // Return the existing store details
                message: "Store marked as deleted"
            });
        }

        // If the store doesn't exist, generate a random 12-character password
        const plainPassword = crypto.randomBytes(8).toString("hex");

        // Hash the password with bcrypt (salt rounds = 10)
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Insert new store with the hashed password
        const result = await client.query(
            "INSERT INTO stores (name, location, password) VALUES ($1, $2, $3) RETURNING store_id, name, location",
            [name, location, hashedPassword]
        );

        // Commit the transaction after inserting the new store
        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            store: result.rows[0],
            generatedPassword: plainPassword // Send plain password only for initial display (optional)
        });
    } catch (error) {
        // Rollback in case of error
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
