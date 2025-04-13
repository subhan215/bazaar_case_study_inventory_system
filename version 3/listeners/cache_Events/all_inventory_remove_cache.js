const { default: eventEmitter } = require("../../utils/eventEmitter");
const { default: redis } = require("../../utils/redis");


eventEmitter.on("clearAllInventoryCache", async (storeId) => {
    try {
        const allInventoryKey = `all_inventory:${storeId}`;
        await redis.del(allInventoryKey);
        console.log(`All inventory cache cleared for store ${storeId}`);
    } catch (err) {
        console.error(" Failed to clear all inventory cache:", err);
    }
});