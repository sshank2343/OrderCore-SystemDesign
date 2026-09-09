// services/catalog-service/src/server.js
// Entry point for catalog-service. Unlike auth-service, this one mounts BOTH a REST router (/products) AND a GraphQL endpoint (/graphql) on the same Express app, on the same port — both are just different "views" onto the same MongoDB-backed data layer (product.model.js).

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { startTracingForService } = require('shared/tracing');

startTracingForService('catalog-service'); // → [Distributed Tracing]

const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { createServiceLogger } = require('shared/logger');
const { connectToCatalogDatabase } = require('./models/product.model');
const productRoutes = require('./rest/productRoutes');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

const logger = createServiceLogger('catalog-service');

async function startCatalogService() {
  await connectToCatalogDatabase(logger); // → [SQL vs NoSQL] (Mongo connection, contrast with auth-service's Postgres pool)

  const app = express();
  app.use(express.json());

  // REST side  → [REST vs GraphQL]
  app.use('/products', productRoutes);

  // GraphQL side, same data, different API shape  → [REST vs GraphQL]
  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  app.use('/graphql', expressMiddleware(apolloServer));

  // Polled by the gateway's healthCheckPoller.js  → [Heartbeats]
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'catalog-service' });
  });

  const PORT = process.env.CATALOG_SERVICE_PORT || 4002;

  app.listen(PORT, () => {
    logger.info(`catalog-service listening on port ${PORT}`);
  });
}

startCatalogService().catch((err) => {
  logger.error(`Failed to start catalog-service: ${err.message}`);
  process.exit(1);
});