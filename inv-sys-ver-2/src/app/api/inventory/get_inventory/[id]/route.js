import { NextResponse } from "next/server";
import { replicaPool } from "../../../../../../database/database"; // Use the replica pool for read operations
import { authenticateStore } from "../../../../../../middleware/authStore";
import redis from "../../../../../../utils/redis";

export async function GET(req, { params }) {
    const { storeId } = await authenticateStore(req);
    if (!storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params; // Store ID from URL params
    if (storeId != parseInt(id)) {
        return NextResponse.json({ error: "Unauthorized store access" }, { status: 403 });
    }

    const cacheKey = `all_inventory:${id}`; // Unique key for each store's inventory

    try {
        // 1️⃣ Check Redis Cache First
        const cachedInventory = await redis.get(cacheKey);
        if (cachedInventory) {
            console.log("✅ Serving from Cache");
            return NextResponse.json({ success: true, inventory: cachedInventory, message: "Data from Redis caching" });
        }

        // 2️⃣ Fetch from Database if not cached
        const client = await replicaPool.connect(); // Use the replica pool to read from the database
        const result = await client.query(
            `SELECT p.sku, p.name, i.purchase_price, i.quantity, s.name as supplier
             FROM inventory i
             JOIN products p ON i.product_id = p.product_id
             JOIN suppliers s on i.supplier_id = s.supplier_id
             WHERE i.store_id = $1
             ORDER BY p.sku, i.purchase_price ASC`,
            [id]
        );

        client.release();

        const inventoryData = result.rows;

        // Store the fetched data in Redis for caching
        await redis.set(cacheKey, JSON.stringify(inventoryData), { EX: 300 });
        console.log("🔄 Fetching from Database & Storing in Cache");
        return NextResponse.json({ success: true, inventory: inventoryData });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
