// services/auth-service/src/models/user.model.js
// Direct SQL queries against Postgres using the `pg` driver — no ORM, so you see exactly what's happening at the database level. This is deliberately contrasted. later with catalog-service's Mongoose/MongoDB model to make [SQL vs NoSQL] concrete: here we have a fixed schema + a UNIQUE constraint enforced BY THE DATABASE ITSELF (not application code), which is the core relational-integrity argument for SQL.

const { Pool } = require('pg');

const pgPool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD
});

async function insertNewUser({email,passwordHash, fullname}){
    const query = `
        INSERT INTO users( email, passwordHash, full_name)
        VALUES ($1 $2 $3)
        RETURNING id, email, full_name, created_at
    `;
    const result = await pgPool.query(query,[email,passwordHash,fullname]);
    return result.rowa[0];
}

async function findUserByEmail(email){
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await pgPool.query(query,[email]);
    return result.rows[0] || null;
}

module.exports = { insertNewUser, findUserByEmail };