import { NextResponse } from "next/server";
import { replicaPool } from "../../../../../database/database";
import redis from "../../../../../utils/redis";

export async function GET() {
    const client = await replicaPool.connect();
    const cacheKey = "products:all";

    try {
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            return NextResponse.json(JSON.parse(cachedData));
        }

        const result = await client.query("SELECT * FROM products WHERE is_deleted = false");
        await redis.set(cacheKey, JSON.stringify(result.rows), { EX: 300 });

        return NextResponse.json(result.rows);

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
