// services/auth-service/src/server.js
// Entry point for auth-service. Mirrors the same bootstrap pattern as the gateway:load env -> start tracing -> create app -> mount routes -> listen. Every service in this system follows this exact same shape deliberately, so once you understand one server.js, you understand all of them.

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const { startTracingForService } = require('../../../shared/tracing');

startTracingForService('auth-service');

const express = require('express');
const { createServiceLogger } = require('../../../shared/logger');
const authRoutes = require('./routes/authRoutes')

const logger = createServiceLogger('auth-service');
const app = express()

app.use(express.json());
// app.use((req, res, next) => {
//     console.log('AUTH RECEIVED:', req.method, req.originalUrl);
//     next();
// });
app.use('/auth',authRoutes);

// Polled by the gateway's healthCheckPoller.js every 5 seconds.  → [Heartbeats]

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

const PORT = process.env.AUTH_SERVICE_PORT || 4001;

app.listen(PORT, () => {
    logger.info(`auth-service listening on port ${PORT}`);
})