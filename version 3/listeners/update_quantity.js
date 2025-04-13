const { primaryPool } = require("../database/database");
const { default: eventEmitter } = require("../utils/eventEmitter");
import "../listeners/activity_log"
eventEmitter.on("stock:update", async ({ quantity, operation, storeId, productId, supplier_id, purchase_price, oldData, action }) => {
    const client = await primaryPool.connect();

    try {
        if (!["plus", "minus"].includes(operation)) {
            console.error("Invalid operation:", operation);
            return;
        }

        const quantityChange = operation === "plus" ? quantity : -quantity;

        console.log(`${operation === "plus" ? "Adding" : "Removing"} ${quantity} units for product ${productId} in store ${storeId} from supplier ${supplier_id} at price ${purchase_price}`);
        
        const result = await client.query(
            `
                UPDATE inventory 
                SET quantity = quantity + $1
                WHERE store_id = $2 AND product_id = $3 AND supplier_id = $4 AND purchase_price = $5
                RETURNING *
                `,
            [quantityChange, storeId, productId, supplier_id, purchase_price]
        );

        if (result.rows.length === 0) {
            console.warn(`No inventory entry found for product ${productId} in store ${storeId} with supplier ${supplier_id} at price ${purchase_price}`);
        } else {
            console.log("Stock updated:", result.rows[0]);

            eventEmitter.emit("activity:log", {
                action,
                store_id: storeId,
                model: "inventory",
                model_id: productId, 
                metadata: {
                    old_data: oldData, 
                    new_data: result.rows[0] 
                }
            });
        }

    } catch (error) {
        console.error("Error updating stock:", error.message);
    } finally {
        client.release();
    }
});
