import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const SECRET_KEY = process.env.JWT_SECRET || "superman123";

export async function authenticateStore(req) {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return { storeId: decoded.storeId , success:true }; 
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 403 });
    }
}
