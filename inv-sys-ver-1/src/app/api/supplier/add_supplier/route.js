import { openDb } from "../../../../../utils/db";
const { NextResponse } = require("next/server");

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, contact, address } = body;

        if (!name || !contact || !address) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const db = await openDb();
        await db.run(
            'INSERT INTO suppliers (name, contact, address) VALUES (?, ?, ?)',
            [name, contact, address]
        );

        return NextResponse.json({ success: true, message: "Supplier added successfully" });
    } catch (error) {
        console.error("Error in add supplier API:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
