// gateway/src/server.js
// Entry point for the API Gateway. This is the ONLY service that should be exposed
// publicly — everything else (auth, catalog, order, payment) stays internal and is
// only reachable through this gateway. Client apps never know those services exist.

const { startTracingForService } = require('../../shared/tracing');


require('dotenv').config({path:require('path').resolve(__dirname, '../../.env')});


// Tracing must start before Express is even required, so it can auto-instrument
// the HTTP server as soon as it's created.  → [Distributed Tracing]
startTracingForService('gateway');

const express = require('express');
const rateLimiterMiddleware = require('./middlewares/rateLimiter.middleware');
const startHealthCheckPolling = require('./middlewares/healthCheckPoller');
const proxyRoutes = require('./routes/proxyRoutes');
const { createServiceLogger } = require('../../shared/logger');

const logger = createServiceLogger('gateway');
const app = express();


// Rate limiting applies to every request BEFORE it's routed anywhere.  → [Rate Limiting]
app.use(rateLimiterMiddleware);


// All incoming requests are routed to the correct downstream service from here.
// → [API Gateway, API Design]

app.use('/api', proxyRoutes);

app.get('/health', (req,res) => {
    res.status(200).json({status:'ok', service: 'gateway'});
});

const PORT = process.env.GATEWAY_PORT || 4000;

app.listen(PORT,() => {
    logger.info(`Gateway listening on port ${PORT}`);
    
    // Starts polling each downstream service's /health endpoint on an interval,
    // so the gateway always knows which services are actually alive.  → [Heartbeats]

    startHealthCheckPolling(logger);
})