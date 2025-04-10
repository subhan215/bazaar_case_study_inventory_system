import { NextResponse } from "next/server";
import { replicaPool } from "../../../../../database/database"; // Use replicaPool for reads
import redis from "../../../../../utils/redis";

export async function GET() {
    const client = await replicaPool.connect(); // Use replicaPool for reads
    const cacheKey = "products:all";

    try {
        // ✅ **Check Cache First**
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            console.log("✅ Serving from cache");
            return NextResponse.json(JSON.parse(cachedData)); // Parse the cached data before returning
        }

        // ❌ If no cache, fetch from DB
        console.log("🔍 Fetching from database...");
        const result = await client.query("SELECT * FROM products WHERE is_deleted = false");

        // ✅ **Store Result in Cache (expires in 5 minutes)**
        await redis.set(cacheKey, JSON.stringify(result.rows), { EX: 300 }); // Cache expires in 5 minutes

        return NextResponse.json(result.rows);

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
