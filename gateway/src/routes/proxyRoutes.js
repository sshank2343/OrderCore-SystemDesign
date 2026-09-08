// gateway/src/routes/proxyRoutes.js
// Builds one proxy middleware per downstream service and mounts it on its path prefix. This is the heart of the API Gateway pattern: the client only ever talks to the gateway's public URL — it has no idea auth-service/catalog-service/order-service even exist as separate processes on separate ports. → [API Gateway]

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { getAllRoutableServices } = require('../config/serviceEndpoints');
const { createServiceLogger } = require('shared/logger');

const logger = createServiceLogger('gateway:proxy');
const router = express.Router();

function buildProxyRoutesForAllServices() {
    const routableServices = getAllRoutableServices();

    routableServices.forEach(({ pathPrefix, serviceName, baseUrl }) => {
        // Strip the gateway-specific "/api" prefix before forwarding, so order-service (for example) just sees "/orders", not "/api/orders".
        
        router.use(
            pathPrefix,
            createProxyMiddleware({
                target: baseUrl,
                changeOrigin: true,
                pathRewrite: {
                    '^/api': ''
                },
                on: {
                    proxyReq: (proxyReq, req) => {
                        logger.info(`Forwarding ${req.method} ${req.originalUrl} -> ${serviceName}`);
                    },
                    error: (err,req,res) => {
                        logger.error(`Proxy error forwarding to ${serviceName} : ${err.message}`);
                        res.statusCode(502).json({
                            error:'Bad Gateway',
                            detail: `${serviceName} is currently unreachable`
                        })
                    }
                }
            })
        )
    })
    return router;
}

module.exports = buildProxyRoutesForAllServices();




        //             REQUEST
        //                |
        //                v
        //      /api/products/42
        //                |
        //                v
        //   ┌────────────────────────┐
        //   │   serviceEndpoints     │
        //   │                        │
        //   │ /api/products          │
        //   │       ↓                │
        //   │ catalog-service        │
        //   └───────────┬────────────┘
        //               |
        //               v
        //   ┌────────────────────────┐
        //   │    serviceRegistry     │
        //   │                        │
        //   │ catalog-service        │
        //   │       ↓                │
        //   │ localhost:3002         │
        //   └───────────┬────────────┘
        //               |
        //               v
        //   ┌────────────────────────┐
        //   │     proxyRoutes        │
        //   │                        │
        //   │ Rewrite /api → ""      │
        //   │                        │
        //   │ /api/products/42       │
        //   │        ↓               │
        //   │ /products/42           │
        //   └───────────┬────────────┘
        //               |
        //               v
        //       Catalog Service
        //          :3002
        //               |
        //               v
        //            RESPONSE