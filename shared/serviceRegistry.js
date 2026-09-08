// shared/serviceRegistry.js
// A minimal service discovery layer. Real systems (Consul, Eureka, Kubernetes DNS)
// do this dynamically over the network — services register themselves on startup and
// deregister on shutdown, and lookups happen live. Here we simulate the same *contract*
// (look up a service by name, get back its current address) using env-driven config,
// so the rest of the codebase (gateway, order-service) never hardcodes a URL directly.

const SERVICE_PORT_MAP = {
  'auth-service': process.env.AUTH_SERVICE_PORT,
  'catalog-service': process.env.CATALOG_SERVICE_PORT,
  'order-service': process.env.ORDER_SERVICE_PORT,
  'payment-service': process.env.PAYMENT_SERVICE_PORT,
};

function resolveServiceBaseUrl(serviceName) {
  const port = SERVICE_PORT_MAP[serviceName];

  if (!port) {
    throw new Error(
      `serviceRegistry: no known address for "${serviceName}". ` +
      `Registered services: ${Object.keys(SERVICE_PORT_MAP).join(', ')}`
    );
  }

  return `http://127.0.0.1:${port}`;
}

module.exports = { resolveServiceBaseUrl };