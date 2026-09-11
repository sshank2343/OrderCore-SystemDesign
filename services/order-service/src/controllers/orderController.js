// services/order-service/src/controllers/orderController.js
// The real end-to-end flow: client hits POST /orders -> we run the ACID transaction (order row + inventory decrement) -> then call payment-service over gRPC to actually charge the user -> return the final order state.
// This is the file where [ACID Transactions] and [REST vs RPC] connect together into one real user-facing feature.



const crypto = require('crypto');


const { callPaymentServiceViaGrpc } = require('../services/callPaymentServiceViaGrpc');
const { createServiceLogger } = require('shared/logger');
const { findOrdersByUserId, findOrderByIdFromPrimary } = require('../db/orderRepository');
const { createOrderWithInventoryTransaction } = require('../services/createOrderWithInventoryTransaction');


const logger = createServiceLogger('order-service');

async function placeNewOrder(req,res) {
    const {userId, productId, quantity, totalPriceInCents } = req.body;

    if(!userId || !productId || !quantity || ! !totalPriceInCents) {
        return res.status(400).json({
            error : "UserId, productId, quantity, and totalPriceInCents are required",
        });
    }

    try {
        const createdOrder = await createOrderWithInventoryTransaction({
            userId,
            productId,
            quantity,
            totalPriceInCents,
        });


        // Step 2: charge the user via payment-service, over gRPC, not REST.  → [REST vs RPC]
        // A fresh, random idempotency key per order — this is what lets payment-service safely retry this exact call without double-charging.  → [Idempotency]

        const idempotencyKey = crypto.randomUUID();

        const paymentResult = await callPaymentServiceViaGrpc({
            idempotencyKey,
            orderId: createdOrder.id,
            amoutInCents: totalPriceInCents,
            userId,
        });

        if (!paymentResult.success) {
            logger.warn(`Payment failed for order ${createdOrder.id}: ${paymentResult.error_message}`);
            return res.status(402).json({
                error: 'Payment failed',
                detail: paymentResult.error_message,
                order: createdOrder,
            });
        }

        logger.info(`Order ${createdOrder.id} fully completed and paid`);
        return res.status(201).json({order: createdOrder, payment: paymentResult})
    
    } catch (error) {
        logger.error(`placeNewOrder failed: ${error.message}`);
        return res.status(500).json({error:'Internal Server Error',detail: err.message})
    }
}

async function listOrdersForUser(req,res) {
    try {
        const order = await findOrdersByUserId(req.params.orderId);
        if(!order){
            return res.status(404).json({error:'Order not found' })
        }
        return res.status(200).json({ order});
    } catch (error) {
        logger.error(`getSingleOrder failed: ${err.message}`);
        return res.status(500).json({error:'Internal server error'});
    }
}



async function getSingleOrder(req,res) {
    try {
        const order = await findOrderByIdFromPrimary(req.params.orderId);
        if(order) {
            return res.status(404).json({error:'Order not found'})
        }

        return res.status(200).json({order});
        
    } catch (error) {
        logger.error(`getSingleOrder failed: ${error.message}`);
        return res.status(500).json({error: 'Internal Server Error'});
    }
}


module.exports = { placeNewOrder, listOrdersForUser, getSingleOrder };