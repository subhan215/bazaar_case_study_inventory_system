import { NextResponse } from "next/server";
import { openDb } from "../../../../../utils/db";

export async function POST(req) {
    const db = await openDb();
    const txn = await db.run("BEGIN TRANSACTION");

    try {
        const { sku, quantity } = await req.json();
        if (!sku || !quantity || quantity <= 0) {
            return NextResponse.json({ error: "Invalid SKU or Quantity" }, { status: 400 });
        }

        // Fetch Product ID and Selling Price based on SKU
        const productRes = await db.get(
            "SELECT product_id, selling_price FROM products WHERE sku = ?",
            [sku]
        );
        if (!productRes) throw new Error("Product not found");

        const { product_id, selling_price } = productRes;
        const totalSellingPrice = selling_price * quantity;

        // Fetch stock based on product ID, ordered by purchase price and updated_at (FIFO)
        const stockRes = await db.all(
            `SELECT inventory_id, supplier_id, quantity, purchase_price, updated_at
             FROM inventory 
             WHERE product_id = ?
             ORDER BY purchase_price ASC, updated_at ASC`, // FIFO logic: first by price, then by timestamp
            [product_id]
        );

        if (stockRes.length === 0) throw new Error("No stock available for this product");

        let remainingQuantity = quantity;
        let totalCost = 0;

        // Deduct stock starting from the oldest stock with the same purchase price
        for (const row of stockRes) {
            if (remainingQuantity <= 0) break;

            const { inventory_id, supplier_id, quantity: availableStock, purchase_price } = row;
            const deductQuantity = Math.min(availableStock, remainingQuantity);

            // Update inventory
            await db.run(
                "UPDATE inventory SET quantity = quantity - ? WHERE inventory_id = ?",
                [deductQuantity, inventory_id]
            );

            remainingQuantity -= deductQuantity;
            totalCost += deductQuantity * purchase_price;

            // Calculate profit from the sale portion
            const portionTotalPrice = selling_price * deductQuantity;
            const portionProfit = portionTotalPrice - (purchase_price * deductQuantity);

            // Insert Sale portion into Database for this portion of the sale
            await db.run(
                `INSERT INTO sales (product_id, quantity, total_price, selling_price, purchase_price, profit, timestamp) 
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [product_id, deductQuantity, portionTotalPrice, selling_price, purchase_price, portionProfit]
            );
        }

        if (remainingQuantity > 0) {
            throw new Error("Not enough stock available to fulfill the order");
        }

        // Calculate the total profit for the entire sale
        const profit = totalSellingPrice - totalCost;

        await db.run("COMMIT");

        return NextResponse.json({
            success: true,
            message: "Sale recorded successfully",
            totalSellingPrice,
            profit,
        });

    } catch (error) {
        await db.run("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
