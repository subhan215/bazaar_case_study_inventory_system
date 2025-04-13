import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

const ADMIN_SECRET_KEY = process.env.ADMIN_JWT_SECRET || "adminsupersecret";
const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_HASHED_PASSWORD = process.env.ADMIN_HASHED_PASSWORD;

export async function POST(req) {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId");
    const password = searchParams.get("password");

    console.log(ADMIN_HASHED_PASSWORD)
    if (!adminId || !password) {
        return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    if (adminId !== ADMIN_ID) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }
    const hashedPassword = Buffer.from(process.env.ADMIN_HASHED_PASSWORD, "base64").toString("utf-8");

    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    
    if (!isPasswordValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign({ adminId }, ADMIN_SECRET_KEY, { expiresIn: "23h" });
    return NextResponse.json({ token }, { status: 200 });
}
