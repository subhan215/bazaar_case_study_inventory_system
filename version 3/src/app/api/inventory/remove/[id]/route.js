import { NextResponse } from "next/server";
import { authenticateStore } from "../../../../../../middleware/authStore";
import { primaryPool, replicaPool } from "../../../../../../database/database";
import eventEmitter from "../../../../../../utils/eventEmitter";
import "../../../../../../listeners/cache_Events/reports_clear";
import "../../../../../../listeners/update_quantity";
import "../../../../../../listeners/insertion_events/remove_insert";
import "../../../../../../listeners/cache_Events/inventory_cache_remove";
import "../../../../../../listeners/cache_Events/all_inventory_remove_cache";

export async function DELETE(req, { params }) {
    const { storeId } = await authenticateStore(req);
    if (!storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { sku, supplier_id, quantity, purchase_price, reason } = await req.json();

    if (!reason || !['damaged', 'expired', 'lost'].includes(reason)) {
        return NextResponse.json({ error: "Invalid or missing reason" }, { status: 400 });
    }

    if (storeId != parseInt(id)) {
        return NextResponse.json({ error: "Unauthorized store access" }, { status: 403 });
    }

    const client = await primaryPool.connect();

    try {
        await client.query("BEGIN");

        const readClient = await replicaPool.connect();
        const productRes = await readClient.query("SELECT product_id FROM products WHERE sku = $1", [sku]);
        readClient.release();

        if (productRes.rows.length === 0) throw new Error("Product not found");
        const productId = productRes.rows[0].product_id;

        const stockRes = await client.query(
            `SELECT * FROM inventory 
             WHERE store_id = $1 AND product_id = $2 AND supplier_id = $3 AND purchase_price = $4`,
            [storeId, productId, supplier_id, purchase_price]
        );
        if (stockRes.rows.length === 0 || stockRes.rows[0].quantity < quantity) {
            throw new Error("Insufficient stock from this supplier at the given purchase price");
        }

        eventEmitter.emit("remove:insert", {
            storeId,
            productId,
            supplierId: supplier_id,
            quantity,
            purchase_price,
            reason,
            oldData: stockRes.rows[0],
        });
        eventEmitter.emit("report:clear");
        eventEmitter.emit("stock:update", {
            quantity,
            operation: "minus",
            storeId,
            productId,
            supplier_id,
            purchase_price,
            oldData: stockRes.rows[0],
            action: "removed_quantity"
        });
        eventEmitter.emit("clearAllInventoryCache", storeId);
        eventEmitter.emit("clearInventoryCache", storeId);

        console.log(`Cache cleared for inventory and removed stock`);

        return NextResponse.json({ success: true, message: "Stock removed successfully" });

    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
