// Cache-related events
import redis from "../../utils/redis";
import eventEmitter from "../../utils/eventEmitter";

// Event for clearing inventory cache
eventEmitter.on("clearInventoryCache", async (storeId) => {
    try {
        const inventoryCacheKey = `inventory:${storeId}`;
        await redis.del(inventoryCacheKey);
        console.log(`✅ Inventory cache cleared for store ${storeId}`);
    } catch (err) {
        console.error("❌ Failed to clear inventory cache:", err);
    }
});

