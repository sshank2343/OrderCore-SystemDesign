// services/order-service/src/db/readReplicaPool.js
// Connection pool to the READ REPLICA. Used exclusively for read-heavy queries (e.g. "list all orders for this user", dashboards, reports) so those reads don't compete for connections/load with the primary, which needs to stay fast for writes. This is the standard "read/write splitting" pattern real companies use to scale reads horizontally without sharding. → [Database Scaling]

// IMPORTANT tradeoff to notice: because replication is asynchronous, a read immediately after a write MIGHT briefly miss that write (replication lag).That's why createOrderWithInventoryTransaction.js reads back its own just-created order from the WRITE pool, not this one — you always read your own writes from the primary; only OTHER users' historical reads go to the replica.


const { Pool } = require('pg');

const readReplicaPool = new Pool({
  host: process.env.PG_REPLICA_HOST,
  port: process.env.PG_REPLICA_PORT,
  database: process.env.PG_REPLICA_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 10,
});

module.exports = readReplicaPool;