// gateway/src/middlewares/healthCheckPoller.js
// Periodically pings every downstream service's /health endpoint ("heartbeat") and
// keeps track of which ones are currently alive. This is the same mechanism real
// load balancers and service meshes use to detect a dead node BEFORE a real user
// request hits it and fails.
// → [Heartbeats]
// Later (Project 3) this same concept gets extended into full [Failover] — this file
// only detects the problem, it doesn't yet reroute traffic away from a dead service.

const axios = require('axios');
const { getAllRoutableServices } = require('../config/serviceEndpoints');

const HEARTBEAT_INTERVAL_MS = 5000; // ping every 5 seconds

// In-memory table: serviceName -> { isAlive, lastCheckedAt }
// Exported so other parts of the gateway (or an admin dashboard later) can read
// current service health without re-polling.
const serviceHealthTable = {};

async function pingSingleServiceHealth(serviceName, baseUrl, logger) {
  try {
    const response = await axios.get(`${baseUrl}/health`, { timeout: 2000 });

    const wasAlive = serviceHealthTable[serviceName]?.isAlive;
    const isNowAlive = response.status === 200;

    serviceHealthTable[serviceName] = {
      isAlive: isNowAlive,
      lastCheckedAt: new Date().toISOString(),
    };

    // Only log on state CHANGE, not every single successful heartbeat —
    // otherwise the logs would be flooded every 5 seconds per service.
    if (wasAlive === false && isNowAlive === true) {
      logger.info(`${serviceName} recovered and is now healthy`);
    }
  } catch (err) {
    const wasAlive = serviceHealthTable[serviceName]?.isAlive;

    serviceHealthTable[serviceName] = {
      isAlive: false,
      lastCheckedAt: new Date().toISOString(),
    };

    if (wasAlive !== false) {
      logger.warn(`${serviceName} failed heartbeat check: ${err.message}`);
    }
  }
}

function startHealthCheckPolling(logger) {
  const routableServices = getAllRoutableServices();

  setInterval(() => {
    routableServices.forEach(({ serviceName, baseUrl }) => {
      pingSingleServiceHealth(serviceName, baseUrl, logger);
    });
  }, HEARTBEAT_INTERVAL_MS);

  logger.info(`Heartbeat polling started for: ${routableServices.map((s) => s.serviceName).join(', ')}`);
}

function getCurrentServiceHealthTable() {
  return serviceHealthTable;
}

module.exports = startHealthCheckPolling;
module.exports.getCurrentServiceHealthTable = getCurrentServiceHealthTable;