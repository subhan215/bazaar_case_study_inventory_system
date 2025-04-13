import { NextResponse } from "next/server";
import { openDb } from "../../../../../utils/db";

export async function DELETE(req, { params }) {
    const db = await openDb();
    const txn = await db.run("BEGIN TRANSACTION");

    try {
        const { sku, supplier_id, quantity, purchase_price, reason } = await req.json(); // purchase_price from input

        if (!reason || !['damaged', 'expired', 'lost'].includes(reason)) {
            return NextResponse.json({ error: "Invalid or missing reason" }, { status: 400 });
        }

        const productRes = await db.get(
            "SELECT product_id FROM products WHERE sku = ?", 
            [sku]
        );
        if (!productRes) throw new Error("Product not found");

        const productId = productRes.product_id;
        const stockRes = await db.get(
            `SELECT quantity FROM inventory 
             WHERE product_id = ? AND supplier_id = ? AND purchase_price = ?`,
            [productId, supplier_id, purchase_price]
        );

        if (!stockRes || stockRes.quantity < quantity) {
            throw new Error("Insufficient stock from this supplier at the given purchase price");
        }
        await db.run(
            "UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND supplier_id = ? AND purchase_price = ?",
            [quantity, productId, supplier_id, purchase_price]
        );

        await db.run(
            `INSERT INTO removed_stock (product_id, supplier_id, quantity, purchase_price, reason, timestamp) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [productId, supplier_id, quantity, purchase_price, reason]
        );

        await db.run("COMMIT");
        return NextResponse.json({ success: true, message: "Stock removed successfully" });

    } catch (error) {
        await db.run("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
