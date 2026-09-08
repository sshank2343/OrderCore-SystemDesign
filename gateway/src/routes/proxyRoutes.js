// gateway/src/routes/proxyRoutes.js
// Builds one proxy middleware per downstream service and mounts it on its path prefix.
// This is the heart of the API Gateway pattern: the client only ever talks to the
// gateway's public URL — it has no idea auth-service/catalog-service/order-service
// even exist as separate processes on separate ports.
// → [API Gateway]