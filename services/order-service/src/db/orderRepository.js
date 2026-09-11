// services/order-service/src/db/orderRepository.js
// Data-access layer for orders. Notice each function explicitly picks WHICH pool it uses — this is the read/write split made concrete, not hidden behind a single generic "query()" function that could accidentally go to the wrong place.


const writePool = require('./writePool');
const readReplicaPool = require('./readReplicaPool');

async function findOrdersByUserId(userId) {
    // Historical reads (a user checking their past orders) can tolerate a few hundred milliseconds of replication lag — safe to serve from the replica. This query is exactly what idx_orders_user_id was created for.  → [Database Indexes]
    
    const query = `SELECT * FROM orders WHERE userId=$1 ORDER BY created_at DESC`;
    const result = await readReplicaPool.query(query,[userId]);
    return result.rows;
}

async function findOrderByIdFromPrimary(orderId) {
    // Used right after creating an order, when we need to guarantee we're reading the row we JUST wrote — the replica might not have it yet (replication lag),so this deliberately goes to the primary, not the replica.  → [Data Replication]
    
    const query = `SELECT * FROM orders WHERE id = $1`;
    const result = await writePool.query(query,[orderId]);
    return result.rows[0] || null;
  
}

module.exports = { findOrdersByUserId, findOrderByIdFromPrimary };