
const { default: eventEmitter } = require("../../utils/eventEmitter");
const { default: redis } = require("../../utils/redis");

eventEmitter.on("report:clear", async () => {
    try {
        const keys = await redis.smembers("report_keys");
        for (const key of keys) {
            await redis.del(key);
        }
        await redis.del("report_keys");
        console.log("✅ [Event] Report keys cleared");
    } catch (err) {
        console.error("❌ [Event] Report cleanup failed:", err.message);
    }
});