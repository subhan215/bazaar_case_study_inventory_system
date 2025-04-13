import { NextResponse } from "next/server";
import { primaryPool, replicaPool } from "../../../../../../database/database";
import { authenticateStore } from "../../../../../../middleware/authStore";
import redis from "../../../../../../utils/redis";
import eventEmitter from "../../../../../../utils/eventEmitter";
import "../../../../../../listeners/cache_Events/stock_In";
import "../../../../../../listeners/cache_Events/reports_clear";
import "../../../../../../listeners/update_quantity";
import "../../../../../../listeners/cache_Events/inventory_cache_remove";
import "../../../../../../listeners/cache_Events/all_inventory_remove_cache";

export async function PUT(req, { params }) {
    const { storeId } = await authenticateStore(req);
    if (!storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (storeId != parseInt(id)) {
        return NextResponse.json({ error: "Unauthorized store access" }, { status: 403 });
    }

    const client = await primaryPool.connect();

    try {
        const { sku, supplier_id, quantity, purchase_price } = await req.json();
        await client.query("BEGIN");

        const productCacheKey = `product:${sku}`;
        let productData = await redis.get(productCacheKey);

        if (!productData) {
            const readClient = await replicaPool.connect();
            const productRes = await readClient.query(
                "SELECT * FROM products WHERE sku = $1",
                [sku]
            );
            readClient.release();

            if (productRes.rows.length === 0) throw new Error("Product not found");

            productData = productRes.rows[0];
            await redis.set(productCacheKey, JSON.stringify(productData), { EX: 600 });
        }

        const productId = productData.product_id;

        const inventoryCacheKey = `inventory:${storeId}`;
        let inventoryData = await redis.get(inventoryCacheKey);
        let stockRes;

        if (!inventoryData) {
            stockRes = await client.query(
                `SELECT * FROM inventory 
                 WHERE store_id = $1 AND product_id = $2 AND supplier_id = $3 AND purchase_price = $4`,
                [storeId, productId, supplier_id, purchase_price]
            );
            inventoryData = stockRes.rows;
            await redis.set(inventoryCacheKey, JSON.stringify(inventoryData), { EX: 300 });
        } else {
            inventoryData = JSON.parse(inventoryData);
            stockRes = { rows: inventoryData };
        }

        if (inventoryData.length > 0) {
            const { inventory_id, quantity: existingQuantity } = inventoryData[0];
            eventEmitter.emit("stock:update", {
                quantity,
                operation: "plus",
                storeId,
                productId,
                supplier_id,
                purchase_price,
                oldData: stockRes.rows[0],
                action: "removed_quantity"
            });
        } else {
            eventEmitter.emit("stock_in:insert", {
                store_id: storeId,
                product_id: productId,
                supplier_id,
                quantity,
                purchase_price,
            });
        }

        await client.query("COMMIT");
        eventEmitter.emit("report:clear");
        eventEmitter.emit("clearAllInventoryCache", storeId);
        eventEmitter.emit("clearInventoryCache", storeId);

        return NextResponse.json({ success: true, message: "Stock updated successfully" });

    } catch (error) {
        await client.query("ROLLBACK");
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
