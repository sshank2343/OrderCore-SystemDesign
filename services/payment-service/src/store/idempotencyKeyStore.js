// services/payment-service/src/store/idempotencyKeyStore.js
// Redis-backed idempotency store. The core problem this solves: order-service's gRPC call to ProcessPayment might time out on the CLIENT side even though the payment actually succeeded on the SERVER side. If order-service then retries (as it should, for reliability), we must NOT charge the customer a second time.
// Solution: before doing any real payment work, check if this idempotency_key was already seen. If yes, replay the SAME stored result instead of reprocessing.
// → [Idempotency]


const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const IDEMPOTENCY_KEY_TTL_SECONDS = 60 * 60 * 24; // keep records for 24 hours

async function getStoredResultForKey(idempotencyKey) {
  const stored = await redisClient.get(`idempotency:${idempotencyKey}`);
  return stored ? JSON.parse(stored) : null;
}

async function storeResultForKey(idempotencyKey, result) {
  await redisClient.set(
    `idempotency:${idempotencyKey}`,
    JSON.stringify(result),
    'EX',
    IDEMPOTENCY_KEY_TTL_SECONDS
  );
}

module.exports = { getStoredResultForKey, storeResultForKey };