import { NextResponse } from "next/server";
import { openDb } from "../../../../../utils/db";

export async function POST(req) {
    const db = await openDb();
    const txn = await db.run("BEGIN TRANSACTION");

    try {
        const body = await req.json();
        const { product_id, quantity, purchase_price, supplier_id } = body;

        if (!product_id || !quantity || quantity <= 0 || !purchase_price || purchase_price < 0 || !supplier_id) {
            throw new Error("Missing or invalid fields");
        }

        const existingProduct = await db.get("SELECT * FROM products WHERE product_id = ?", [product_id]);
        if (!existingProduct) {
            throw new Error("Product not found");
        }

        await db.run(
            `INSERT INTO inventory (product_id, supplier_id, quantity, purchase_price, updated_at) 
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) 
             ON CONFLICT(product_id, supplier_id, purchase_price) DO UPDATE 
             SET quantity = inventory.quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP`,
            [product_id, supplier_id, quantity, purchase_price]
        );

        await db.run(
            `INSERT INTO stock_in (product_id, quantity, supplier_id, purchase_price, timestamp) 
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [product_id, quantity, supplier_id, purchase_price]
        );

        await db.run("COMMIT");
        return NextResponse.json({ success: true, message: "Stock updated and logged successfully" });

    } catch (error) {
        await db.run("ROLLBACK");
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
}
