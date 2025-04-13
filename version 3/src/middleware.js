import { NextResponse } from "next/server";
import redis from "../utils/redis";

const MAX_REQUESTS = 3;
const WINDOW_TIME = 20;
const THROTTLE_DELAY = 7000;

export async function middleware(req) {
    const ip = req.headers.get("x-real-ip") || 
               req.headers.get("x-forwarded-for") || 
               req.socket?.remoteAddress || 
               "127.0.0.1";

    const key = `rate_limit:${ip}`;

    try {
        let requests = await redis.get(key);
        requests = requests ? parseInt(requests) : 0;

        if (requests >= MAX_REQUESTS) {
            await new Promise((resolve) => setTimeout(resolve, THROTTLE_DELAY));

            requests = await redis.get(key);
            if (requests >= MAX_REQUESTS) {
                return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
            }
        }

        if (requests === 0) {
            await redis.setex(key, WINDOW_TIME, 1);
        } else {
            await redis.incr(key);
        }

        return NextResponse.next();
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const config = {
    matcher: "/api/:path*",
};
