// gateway/src/config/serviceEndpoints.js
// Maps a public URL prefix (what the client calls) to the internal service that
// should handle it. This is the routing table for the API Gateway.
// → [API Gateway] because this is the core "which service owns this path" decision
// → [Service Discovery] because addresses are resolved by name, not hardcoded


const { resolveServiceBaseUrl } = require('shared/serviceRegistry');

// Each entry: the public path prefix -> which service name owns it
const ROUTE_TO_SERVICE_MAP = [
    { pathPrefix: '/api/auth', serviceName: 'auth-service' },
    { pathPrefix: '/api/products', serviceName: 'catalog-service' },
    { pathPrefix: '/api/graphql', serviceName: 'catalog-service' },
    { pathPrefix: '/api/orders', serviceName: 'order-service' },
];

function getAllRoutableService() {
    // Used by proxyRoutes.js to build one proxy middleware per entry,
    // and by healthCheckPoller.js to know which services to ping.
    return ROUTE_TO_SERVICE_MAP.map((entry) => ({
        pathPrefix: entry.pathPrefix,
        serviceName:entry.serviceName,
        baseUrl: resolveServiceBaseUrl(entry.serviceName),
    }))   
}

module.exports = { getAllRoutableService }