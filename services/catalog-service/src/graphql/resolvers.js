// services/catalog-service/src/graphql/resolvers.js
// Resolvers are the ACTUAL functions that run when a field in typeDefs.js is requested. Notice they call the exact same model functions as rest/productController.js (insertNewProduct, findAllProducts, findProductById) — both REST and GraphQL sit on top of the SAME data layer. The only thing that differs between REST and GraphQL here is the API surface/shape, not the underlying database logic. That's the fair, apples-to-apples comparison.[REST vs GraphQL]

const {
    insertNewProduct,
    findAllProducts,
    findProductById,
} = require('../models/product.model');
const { createServiceLogger } = require('shared/logger');

const logger = createServiceLogger('catalog-service:graphql');

const resolvers = {
    Query: {
        products: async () => {
            return findAllProducts();
        },
        product: async (_parent, { id }) => {
            return findProductById(id);
        },
    },
    Mutation: {
        createProduct: async (_parent, {input}) => {
            const product = await insertNewProduct(input);
            logger.info(`Product created via GraphQL: ${product._id}`);
            return product
        },
    },
    Product: {
    // GraphQL's "id" field maps to Mongo's "_id" — this resolver bridges that gap so the client-facing schema stays clean ("id") without leaking Mongo internals.
    id: (product) => product._id ?? product.id,
  },
}


module.exports = resolvers;