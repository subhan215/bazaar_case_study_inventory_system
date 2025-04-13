const { primaryPool } = require("../../database/database");
const { default: eventEmitter } = require("../../utils/eventEmitter");
import "../activity_log";

eventEmitter.on("remove:insert", async ({ storeId, productId, supplierId, quantity, purchase_price, reason, oldData }) => {
  const client = await primaryPool.connect();

  try {
    await client.query("BEGIN");

    const removedStockRes = await client.query(
      `INSERT INTO removed_stock (store_id, product_id, supplier_id, quantity, purchase_price, reason, timestamp) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [storeId, productId, supplierId, quantity, purchase_price, reason]
    );

    const removedStockId = removedStockRes.rows[0].removed_stock_id;

    eventEmitter.emit("activity:log", {
      action: "insert_into_removed_stock",
      store_id: storeId,
      model: "removed_stock",
      model_id: removedStockId,
      metadata: { new_data: removedStockRes.rows[0] , old_data:oldData}
    });

    await client.query("COMMIT");
    console.log(`stock:remove event handled (Removed Stock ID: ${removedStockId})`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to handle stock:remove event:", err);
  } finally {
    client.release();
  }
});
