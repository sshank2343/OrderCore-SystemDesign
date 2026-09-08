// gateway/src/middlewares/rateLimiter.middleware.js
// Token bucket rate limiter backed by Redis. Each client (identified by IP for now)
// gets a bucket of tokens that refills over time. Every request costs 1 token.
// If the bucket is empty, the request is rejected with 429 Too Many Requests.
// Using Redis (not an in-memory Map) means this works correctly even if you run
// multiple gateway instances behind a load balancer later — they all share one bucket.
// → [Rate Limiting]