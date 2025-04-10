import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const ADMIN_SECRET_KEY = process.env.ADMIN_JWT_SECRET || "adminsupersecret";

export async function authenticateAdmin(req) {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    console.log(token)
    try {
        jwt.verify(token, ADMIN_SECRET_KEY);
        console.log("done")
        return { success: true }; // Successfully authenticated
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 403 });
    }
}
