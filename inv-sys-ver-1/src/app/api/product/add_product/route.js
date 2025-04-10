import { NextResponse } from "next/server";
import { openDb } from "../../../../../utils/db";

export async function POST(req) {
    try {
        const db = await openDb();
        
        const body = await req.json();
        const { sku, name, selling_price } = body;

        // Validation
        if (!sku || !name || !selling_price) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if the product already exists by SKU
        const existingProduct = await db.get("SELECT * FROM products WHERE sku = ?", [sku]);
        if (existingProduct) {
            return NextResponse.json({ error: "Product with this SKU already exists" }, { status: 400 });
        }

        // Insert new product into the database
        const result = await db.run(
            `INSERT INTO products (sku, name, selling_price)
             VALUES (?, ?, ?)`,
            [sku, name, selling_price]
        );

        return NextResponse.json({
            success: true,
            message: "Product added successfully",
            product_id: result.lastID, // Return the product ID of the newly added product
        });
    } catch (error) {
        console.error("Error adding product:", error);
        return NextResponse.json({
            success: false,
            message: "Failed to add product",
            error: error.message,
        }, { status: 500 });
    }
}
