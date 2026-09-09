// services/catalog-service/src/models/product.model.js
// Mongoose schema for products, backed by MongoDB instead of Postgres.Contrast with auth-service/src/models/user.model.js: - No JOINs, no rigid columns — "tags" and "attributes" below are flexible, variable-shape fields that would need separate tables (or JSON columns + workarounds) in a relational schema.- Tradeoff: MongoDB won't stop you from inserting a malformed document the way Postgres's UNIQUE/NOT NULL constraints stop bad data at the DB layer — Mongoose's schema validation here is an application-level safety net, not a database-enforced guarantee like SQL's. → [SQL vs NoSQL] → [Database Types]

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  priceInCents: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, required: true, min: 0, default: 0 },
  tags: [{ type: String }],                 // flexible array — no schema migration needed to add tags
  attributes: { type: mongoose.Schema.Types.Mixed }, // arbitrary nested shape per product (e.g. { color, size } for clothes, { ram, storage } for electronics)
  createdAt: { type: Date, default: Date.now },
});

const ProductModel = mongoose.model('Product', productSchema);


async function connectToCatalogDatabase(logger) {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected to MongoDB (catalog database)');
}

async function insertNewProduct(productData) {
  const product = new ProductModel(productData);
  return product.save();
}


async function findAllProducts() {
  return ProductModel.find().lean(); // .lean() returns plain JS objects, faster than full Mongoose documents when we don't need to .save() them
}


async function findProductById(productId) {
  return ProductModel.findById(productId).lean();
}


async function decrementProductStock(productId, quantity) {
  return ProductModel.findByIdAndUpdate(
    productId,
    { $inc: { stockQuantity: -quantity } },
    { new: true }
  );
}




module.exports = {
  connectToCatalogDatabase,
  insertNewProduct,
  findAllProducts,
  findProductById,
  decrementProductStock,
};



