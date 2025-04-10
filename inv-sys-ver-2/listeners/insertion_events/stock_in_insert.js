// listeners/stockInDB.js
import eventEmitter from "../utils/eventEmitter";
import { primaryPool } from "../database/database";
import "../activity_log"

eventEmitter.on("stock_in:insert", async ({ store_id, product_id, supplier_id, quantity, purchase_price  , oldData}) => {
    const client = await primaryPool.connect();
    try {
        // Insert into stock_in table
        const res = await client.query(
            `INSERT INTO stock_in (store_id, product_id, supplier_id, quantity, purchase_price, timestamp) 
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
            [store_id, product_id, supplier_id, quantity, purchase_price]
        );

        const insertedStockInId = res.rows[0].stock_in_id;

        // ✅ Emit activity log
        eventEmitter.emit("activity:log", {
            action: "insert_into_stock_in",
            store_id,
            model: "stock_in",
            model_id: insertedStockInId, // Use the returned stock_in_id from DB
            metadata: {
              old_data: oldData , 
              new_data: res.rows[0]
            }
        });

        console.log(`🟢 Stock-In logged for store ${store_id} with ID ${insertedStockInId}`);
    } catch (error) {
        console.error("❌ Failed to insert into stock_in:", error.message);
    } finally {
        client.release();
    }
});
