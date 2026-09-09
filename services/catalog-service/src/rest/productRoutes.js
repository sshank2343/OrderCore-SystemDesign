// services/catalog-service/src/rest/productRoutes.js
const express = require('express');
const { createProduct, listAllProducts, getProductById } = require('./productController');

const router = express.Router();

router.post('/', createProduct);
router.get('/', listAllProducts);
router.get('/:id', getProductById);

module.exports = router;