const express = require('express');
const { createProduct, listAllProducts, getProductById, decrementStockForProduct } = require('./productController');

const router = express.Router();

router.post('/', createProduct);
router.get('/', listAllProducts);
router.get('/:id', getProductById);
router.patch('/:id/decrement-stock', decrementStockForProduct);

module.exports = router;