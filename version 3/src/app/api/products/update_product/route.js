import { NextResponse } from "next/server";
import { primaryPool } from "../../../../../database/database";
import { authenticateAdmin } from "../../../../../middleware/authAdmin";
import eventEmitter from "../../../../../utils/eventEmitter";
import "../../../../../listeners/cache_Events/products_cache_remove";

export async function PUT(req) {
    const { success } = await authenticateAdmin(req);
    if (!success) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await primaryPool.connect();
    const { sku, name, selling_price } = await req.json();

    if (!sku) {
        return NextResponse.json({ error: "SKU is required for updating a product" }, { status: 400 });
    }

    try {
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

        values.push(sku);

        const query = `
            UPDATE products
            SET ${updateFields.join(", ")}
            WHERE sku = $${index}
            RETURNING *`;

        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        await client.query("COMMIT");

        eventEmitter.emit("cache:invalidate:products");

        return NextResponse.json({ success: true, product: result.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
