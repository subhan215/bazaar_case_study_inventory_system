import { NextResponse } from "next/server";
import { openDb } from "../../../../../utils/db";

export async function PUT(req) {
    const db = await openDb();
    const txn = await db.run("BEGIN TRANSACTION");

    try {
        const body = await req.json();
        const { product_id, ...updates } = body; 
        if (!product_id) {
            throw new Error("Product ID is required");
        }
        const existingProduct = await db.get("SELECT * FROM products WHERE product_id = ?", [product_id]);
        if (!existingProduct) {
            throw new Error("Product not found");
        }
        if ("selling_price" in updates && updates.selling_price < 0) {
            throw new Error("Selling price cannot be negative");
        }
        const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(", ");
        const updateValues = Object.values(updates);

        if (updateFields.length === 0) {
            throw new Error("No valid fields to update");
        }
        await db.run(
            `UPDATE products 
             SET ${updateFields}, updated_at = CURRENT_TIMESTAMP 
             WHERE product_id = ?`,
            [...updateValues, product_id]
        );

        await db.run("COMMIT");
        return NextResponse.json({ success: true, message: "Product updated successfully" });
    } catch (error) {
        await db.run("ROLLBACK");
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
}
