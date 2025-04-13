const { primaryPool } = require("../../database/database");
const { default: eventEmitter } = require("../../utils/eventEmitter");
import "../activity_log";

eventEmitter.on("sale:insert", async ({ storeId, productId, quantity, selling_price, purchase_price, profit, supplierId, oldData }) => {
  const client = await primaryPool.connect();

  try {
    
    await client.query("BEGIN");

    const insertRes = await client.query(
      `INSERT INTO sales (store_id, product_id, quantity, selling_price, purchase_price, profit, timestamp, supplier_id) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       RETURNING *`,
      [storeId, productId, quantity, selling_price, purchase_price, profit, supplierId]
    );

    const insertedSale = insertRes.rows[0];

    console.log(`Sale Insert Event Handled: Store #${storeId}, Product #${productId}`);

    eventEmitter.emit("activity:log", {
      action: "insert_into_sales",
      store_id: storeId,
      model: "sales",
      model_id: insertedSale.sale_id, 
      metadata: { new_data: insertedSale, old_data: oldData }, 
    });

    await client.query("COMMIT");

    client.release();
  } catch (err) {

    await client.query("ROLLBACK");
    console.error("Error handling 'sale:insert' event:", err);
    client.release();
  }
});
