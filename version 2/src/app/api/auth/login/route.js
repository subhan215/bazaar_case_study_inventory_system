import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import pool from "../../../../../database/database";

const SECRET_KEY = process.env.JWT_SECRET;

export async function POST(req) {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const password = searchParams.get("password");

    if (!storeId || !password) {
        return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
        const result = await client.query("SELECT password FROM stores WHERE store_id = $1", [storeId]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        const isPasswordValid = await bcrypt.compare(password, result.rows[0].password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }
        const token = jwt.sign({ storeId }, SECRET_KEY, { expiresIn: "23h" });

        return NextResponse.json({ token }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
