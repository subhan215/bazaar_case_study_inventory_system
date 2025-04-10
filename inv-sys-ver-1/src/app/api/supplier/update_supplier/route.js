import { NextResponse } from "next/server";
import { openDb } from "../../../../../utils/db";

export async function PUT(req) {
    const db = await openDb();
    const txn = await db.run("BEGIN TRANSACTION");

    try {
        const body = await req.json();
        const { supplier_id, name, contact, address } = body;

        if (!supplier_id || (!name && !contact && !address)) {
            throw new Error("Missing required fields");
        }

        const existingSupplier = await db.get("SELECT * FROM suppliers WHERE supplier_id = ?", [supplier_id]);
        if (!existingSupplier) throw new Error("Supplier not found");

        await db.run(
            `UPDATE suppliers 
             SET name = COALESCE(?, name), 
                 contact = COALESCE(?, contact), 
                 address = COALESCE(?, address)
             WHERE supplier_id = ?`,
            [name, contact, address, supplier_id]
        );

        await db.run("COMMIT");
        return NextResponse.json({ success: true, message: "Supplier updated successfully" });
    } catch (error) {
        await db.run("ROLLBACK");
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
}
