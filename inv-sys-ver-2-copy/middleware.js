import { NextResponse } from "next/server";
import redis from "./utils/redis";

const MAX_REQUESTS = 3; // Allow 3 requests per minute
const WINDOW_TIME = 20; // Time window in seconds (1 minute)
const THROTTLE_DELAY = 7000; // 5-second delay before retry

export async function middleware(req) {
    console.log("🚀 Middleware Triggered");

    const ip = req.headers.get("x-real-ip") || 
               req.headers.get("x-forwarded-for") || 
               req.socket?.remoteAddress || 
               "127.0.0.1";

    const key = `rate_limit:${ip}`;

    try {
        let requests = await redis.get(key);
        requests = requests ? parseInt(requests) : 0;

        if (requests >= MAX_REQUESTS) {
            console.log(`⏳ Too many requests from ${ip}, throttling for ${THROTTLE_DELAY / 1000}s...`);
            
            // Delay before allowing another request
            await new Promise((resolve) => setTimeout(resolve, THROTTLE_DELAY));

            // Re-check request count after delay
            requests = await redis.get(key);
            if (requests >= MAX_REQUESTS) {
                return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
            }
        }

        // Increment request count and set expiration properly
        if (requests === 0) {
            await redis.setex(key, WINDOW_TIME, 1); // Set count with expiration
        } else {
            await redis.incr(key);
        }

        return NextResponse.next();
    } catch (error) {
        console.error("❌ Rate Limiting Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Apply middleware to API routes
export const config = {
    matcher: "/api/:path*", // Matches all API routes
};
