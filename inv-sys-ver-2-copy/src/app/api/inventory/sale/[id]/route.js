import { NextResponse } from "next/server";
import { authenticateStore } from "../../../../../../middleware/authStore";
import pool from "../../../../../../database/database";

export async function POST(req, { params }) {
    const { storeId } = await authenticateStore(req);
    if (!storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await pool.connect();
    const { id } = await params;
    if (storeId != parseInt(id)) {
        return NextResponse.json({ error: "Unauthorized store access" }, { status: 403 });
    }

    try {
        const { sku, quantity } = await req.json();
        await client.query("BEGIN");

        // Get Product ID, Selling Price, and Supplier ID from DB
        const productRes = await client.query(
            "SELECT product_id, selling_price, supplier_id FROM products WHERE sku = $1",
            [sku]
        );

        if (productRes.rows.length === 0) throw new Error("Product not found");

        const { product_id, selling_price, supplier_id } = productRes.rows[0];
        const totalSellingPrice = selling_price * quantity;

        // Get Inventory Data from DB
        const stockRes = await client.query(
            `SELECT inventory_id, supplier_id, quantity, purchase_price, updated_at
             FROM inventory 
             WHERE store_id = $1 AND product_id = $2 
             ORDER BY purchase_price ASC, updated_at ASC`,
            [storeId, product_id]
        );

        if (stockRes.rows.length === 0) throw new Error("No stock available for this product");

        let remainingQuantity = quantity;
        let totalCost = 0;

        for (const row of stockRes.rows) {
            if (remainingQuantity <= 0) break;

            const { inventory_id, quantity: availableStock, purchase_price } = row;
            const deductQuantity = Math.min(availableStock, remainingQuantity);

            // Update inventory stock
            await client.query(
                "UPDATE inventory SET quantity = quantity - $1 WHERE inventory_id = $2",
                [deductQuantity, inventory_id]
            );

            // Update the remaining quantity
            remainingQuantity -= deductQuantity;
            totalCost += deductQuantity * purchase_price;

            // Calculate the total price and profit for this sale portion
            const portionTotalPrice = selling_price * deductQuantity;
            const portionProfit = portionTotalPrice - (purchase_price * deductQuantity);

            // Insert Sale into Database for this portion of the sale
            await client.query(
                `INSERT INTO sales (store_id, product_id, quantity, selling_price, purchase_price, profit, timestamp, supplier_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
                [storeId, product_id, deductQuantity, selling_price, purchase_price, portionProfit, supplier_id]
            );
        }

        if (remainingQuantity > 0) {
            throw new Error("Not enough stock available to fulfill the order");
        }

        // Calculate total profit for the entire sale
        const profit = totalSellingPrice - totalCost;

        await client.query("COMMIT");

        return NextResponse.json({
            success: true,
            message: "Sale recorded successfully",
            totalSellingPrice,
            profit,
        });

    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
