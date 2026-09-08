// gateway/src/middlewares/rateLimiter.middleware.js
// Token bucket rate limiter backed by Redis. Each client (identified by IP for now)
// gets a bucket of tokens that refills over time. Every request costs 1 token.
// If the bucket is empty, the request is rejected with 429 Too Many Requests.
// Using Redis (not an in-memory Map) means this works correctly even if you run
// multiple gateway instances behind a load balancer later — they all share one bucket.
// → [Rate Limiting]

const Redis = require('ioredis');
const { createServiceLogger } = require('shared/logger');


const redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const logger = createServiceLogger('gateway:rate-limiter');

const MAX_TOKENS_PER_BUCKET = 20; // burst capacity
const REFILL_RATE_TOKENS_PER_SECOND = 5; //steady sustained rate

async function consumeTokenForClient(clientKey){
    const bucketKey = `rate-limit:${clientKey}`;
    const now=Date.now();

    // Lua script executed atomically inside Redis so concurrent requests from the same client can't race each other and double-spend tokens.

    const luaScript = `
        local bucketKey = KEY[1]
        local maxTokens = tonumber(ARGV[1])
        local refillRate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        local bucket = redis.call('HMGET',bucketKey,'tokens','lastRefillTimestamp')
        local tokens = tonumber(bucket[1])
        local lastRefillTimestamp = tonumber(bucket[2])

        if tokens == nil then
            tokens = maxTokens
            lastRefillTimestamp = now
        end

        local elapsedSeconds = (now - lastRefillTimestamp) /1000
        local refilledTokens = math.min(maxTokens, tokens+ (elapsedSeconds*refillRate))

        if refilledTokens < 1 then
        redis.call('HMSET', bucketKey, 'tokens', refilledTokens, 'lastRefillTimestamp', now)
        redis.call('EXPIRE', bucketKey, 60)
        return 0
        end

        redis.call('HMSET', bucketKey, 'tokens', refilledTokens - 1, 'lastRefillTimestamp', now)
        redis.call('EXPIRE', bucketKey, 60)
        return 1
    `;

    const allowed = await redisClient.eval(
        luaScript,
        1,
        bucketKey,
        MAX_TOKENS_PER_BUCKET,
        REFILL_RATE_TOKENS_PER_SECOND,
        now
    );

    return allowed ==1;

}

async function rateLimiterMiddlerware(req,res,next) {
    const clientKey = req.ip;

    try {
        const isAllowed = await consumeTokenForClient(clientKey);
        if(!isAllowed){
            logger.warn(`Rate limit exceeded for ${clientKey}`);
            return res.status(429).json({
                error: 'Too Many Requests',
                detail: 'Rate limit exceede, please slow down.'
            })
        }
        next();
    } catch (error) {
        // If Redis itself is down, fail open (allow the request) rather than taking down the whole gateway because of a rate-limiter outage.
        logger.error(`Rate limiter error, failing open: ${error.message}`);
        next();
    }
}

module.exports = rateLimiterMiddlerware;