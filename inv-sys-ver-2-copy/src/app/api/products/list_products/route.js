import { NextResponse } from "next/server";
import pool from "../../../../../database/database";

export async function GET() {
    const client = await pool.connect();

    try {
        // ❌ Fetch data directly from DB
        console.log("🔍 Fetching from database...");
        const result = await client.query("SELECT * FROM products");

        return NextResponse.json(result.rows);

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
