// services/catalog-service/src/graphql/typeDefs.js
// GraphQL schema definition for products. Compare this to productRoutes.js: REST needed 3 separate endpoints (POST /, GET /, GET /:id) each returning the FULL product object every time. Here, there's ONE "products" query and ONE "product(id)" query, and the CLIENT decides which fields to fetch — e.g. a mobile app listing screen might request only { id name priceInCents }, skipping "description" and "attributes" entirely to save bandwidth, without the server needing a separate "lightweight product" endpoint for that case.[REST vs GraphQL]



// services/catalog-service/src/graphql/typeDefs.js
// GraphQL schema definition for products. Compare this to productRoutes.js:
// REST needed 3 separate endpoints (POST /, GET /, GET /:id) each returning
// the FULL product object every time. Here, there's ONE "products" query and
// ONE "product(id)" query, and the CLIENT decides which fields to fetch —
// e.g. a mobile app listing screen might request only { id name priceInCents },
// skipping "description" and "attributes" entirely to save bandwidth, without
// the server needing a separate "lightweight product" endpoint for that case.
// → [REST vs GraphQL]

const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String!
    description: String
    priceInCents: Int!
    stockQuantity: Int!
    tags: [String]
  }

  type Query {
    products: [Product]
    product(id: ID!): Product
  }

  input CreateProductInput {
    name: String!
    description: String
    priceInCents: Int!
    stockQuantity: Int
    tags: [String]
  }

  type Mutation {
    createProduct(input: CreateProductInput!): Product
  }
`;

module.exports = typeDefs;








