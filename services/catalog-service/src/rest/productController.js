// services/catalog-service/src/rest/productController.js
// REST handlers for products. Each action = its own endpoint, each endpoint returns a fixed, predetermined shape (the WHOLE product, every field) whether the client needs all of it or not. This over-fetching characteristic is the exact thing GraphQL (resolvers.js) is built to solve — compare the two side by side. → [REST vs GraphQL]

const {
  insertNewProduct,
  findAllProducts,
  findProductById,
} = require('../models/product.model');
const { createServiceLogger } = require('shared/logger')


const logger = createServiceLogger('catalog-service:rest');

async function createProduct(req,res){
    try {
        const { name, description, priceInCents, stockQuantity, tags, attributes } = req.body;
        if(!name || priceInCents === undefined){
            return res.status(400).json({ error: "name and priceInCents are required "});
        }
        const productData = {name, description, priceInCents, stockQuantity, tags, attributes}
        const product = await insertNewProduct(productData)
        
        logger.info(`Product created via REST: ${product._id}`);
        return res.status(201).json({ product });
    } catch (error) {
        logger.error(`CreatedProduct failed: ${error.message}`);
        return res.status(500).json({ error: 'Internal Server error' });
    }
}


async function listAllProducts(req,res) {
    try {
        const products = await findAllProducts();
        return res.status(200).json({ products });
    } catch (error) {
        logger.error(`listAllProduct failed: ${error.message}`);
        return res.status(500).json({error:'Internal Server Error'});
    }
}


async function getProductById(req,res) {
    try {
        const product = await findProductById(req.params.id);
        if(!product){
            return res.status(404).json({error: ' Product not found ' })
        }
        return res.status(200).json({product});
    } catch (error) {
        logger.error(`getProductById failed: ${error.message}`);
        return res.status(500).json({error:'Internal Server error'});
    }
}

module.exports = { createProduct, listAllProducts, getProductById };