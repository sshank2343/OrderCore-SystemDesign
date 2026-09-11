// services/order-service/src/db/writePool.js
// Connection pool to the PRIMARY Postgres database only. All writes (INSERT/UPDATE/DELETE) for orders go through this pool. Kept as a SEPARATE pool from readReplicaPool.js on purpose — mixing write and read connections in one pool makes it easy to accidentally read stale data or, worse, accidentally write to a replica (which would fail, since replicas are read-only in real replication setups). → [Data Replication] → [Database Scaling]


const { Pool } = require('pg');

const writePool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  max: 10, // max concurrent connections in this pool
});

module.exports = writePool;