const { primaryPool } = require("../database/database");
const { default: eventEmitter } = require("../utils/eventEmitter");

eventEmitter.on("activity:log", async ({ action, store_id, model, model_id, metadata }) => {
    const client = await primaryPool.connect();

    try {
        const query = `
            INSERT INTO activity_logs (id, action, store_id, model, model_id, metadata)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        `;

        const values = [action, store_id, model, model_id, metadata];

        await client.query(query, values);
        console.log("Activity logged:", { action, store_id, model });

    } catch (error) {
        console.error(" Failed to log activity:", error.message);
    } finally {
        client.release();
    }
});
