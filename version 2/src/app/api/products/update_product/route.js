import { NextResponse } from "next/server";
import pool from "../../../../../database/database";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";

export async function PUT(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await pool.connect();
    const { sku, name, selling_price } = await req.json();

    if (!sku) {
        return NextResponse.json({ error: "SKU is required for updating a product" }, { status: 400 });
    }

    try {
        // Start transaction
        await client.query("BEGIN");

        let updateFields = [];
        let values = [];
        let index = 1;

        if (name) {
            updateFields.push(`name = $${index}`);
            values.push(name);
            index++;
        }
        if (selling_price !== undefined) {
            updateFields.push(`selling_price = $${index}`);
            values.push(selling_price);
            index++;
        }

        if (updateFields.length === 0) {
            return NextResponse.json({ error: "No fields provided for update" }, { status: 400 });
        }

        values.push(sku); // SKU is used in WHERE clause

        const query = `
            UPDATE products
            SET ${updateFields.join(", ")}
            WHERE sku = $${index}
            RETURNING *`;

        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Commit the transaction after successful update
        await client.query("COMMIT");

        return NextResponse.json({ success: true, product: result.rows[0] });
    } catch (error) {
        // Rollback in case of error
        await client.query("ROLLBACK");
        console.error("Error updating product:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
