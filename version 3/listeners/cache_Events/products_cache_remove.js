const { default: eventEmitter } = require("../../utils/eventEmitter");
const { default: redis } = require("../../utils/redis");

eventEmitter.on("cache:invalidate:products", async () => {
    try {
        await redis.del("products:all");
        console.log("[Event] Products cache invalidated.");
    } catch (err) {
        console.error("[Event] Failed to invalidate products cache:", err.message);
    }
});
