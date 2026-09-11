// services/order-service/src/routes/orderRoutes.js
const express = require('express');
const { placeNewOrder, listOrdersForUser, getSingleOrder } = require('../controllers/orderController');

const router = express.Router();

router.post('/', placeNewOrder);
router.get('/user/:userId', listOrdersForUser);
router.get('/:orderId', getSingleOrder);

module.exports = router;