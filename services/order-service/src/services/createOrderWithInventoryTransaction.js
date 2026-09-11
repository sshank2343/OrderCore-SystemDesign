// services/order-service/src/services/createOrderWithInventoryTransaction.js

// Demonstrates real ACID transactions. Two things must happen together:
//   1. Insert a new row into `orders` (Postgres)
//   2. Decrement stock for that product (catalog-service's MongoDB via HTTP call)

// Since these live in TWO DIFFERENT DATABASES (a real consequence of the microservices/DB-per-service pattern), we can't wrap both in one native SQL transaction. So this function demonstrates the two halves separately:

//   - The `orders` INSERT is wrapped in a real Postgres BEGIN/COMMIT/ROLLBACK transaction (true ACID, single database).

//   - The cross-service stock decrement is compensated manually: if it fails AFTER the order was already committed, we roll the order back ourselves (a "compensating transaction" — the real-world pattern distributed systems use instead of native cross-database transactions, which mostly don't exist).
// → [ACID Transactions]

const writePool = require('../db/writePool');
const axios = require('axios');
const { resolveServiceBaseUrl } = require('shared/serviceRegistry');
const { createServiceLogger } = require('shared/logger');


const logger = createServiceLogger('order-service:transaction')

async function insertOrderRow(client, {  userId, productId, quantity, totalPriceInCents }){
    const insertQuery = `
    INSERT INTO orders (user_id, product_id, quantity, total_price_in_cents, status)
    VALUES($1, $2, $3, $4,'PENDING')
    RETURNING *
    `;
    const result = await client.query(insertQuery,[userId, productId, quantity, totalPriceInCents]);
    return result.rows[0];
}


async function markOrderAsConfirmed(client, orderId){
    await client.query(`UPDATE orders SET status = 'CONFIRMED' WHERE id = $1`,[orderId])
}

async function decrementCatalogStock(productId, quantity){
    const catalogBaseUrl = resolveServiceBaseUrl('catalog-service');
    await axios.patch(`${catalogBaseUrl}/products/${productId}/decrement-stock`, { quantity });
}

async function createOrderWithInventoryTransaction({  userId, productId, quantity, totalPriceInCents }){
    const client = await writePool.connect();
    try {
        await client.query('BEGIN');
        const createdOrder = await insertOrderRow(client, {userId, productId, quantity, totalPriceInCents});
        await client.query('COMMIT');
        logger.info(`Order ${createdOrder.id} committed to orders table`);

        try {
            await decrementCatalogStock(productId,quantity);

            await client.query('BEGIN');
            await markOrderAsConfirmed(client, createdOrder.id);
            await client.query('COMMIT');

            return { ...createdOrder, status: 'CONFIRMED' };
        } catch (stockError) {
            logger.error(`Stock decrement failed for order ${createdOrder.id}, compensating: ${stockError.message}`);
            await writePool.query(`UPDATE orders SET status = 'FAILED' WHERE id = $1`, [createdOrder.id]);
            throw new Error(`Order ${createdOrder.id} failed during stock decrement and was marked FAILED`);
    
        }
    } catch (error) {
         await client.query('ROLLBACK');
            logger.error(`Order transaction rolled back: ${err.message}`);
            throw err;
        } finally {
            client.release();
    }
}

module.exports = { createOrderWithInventoryTransaction };