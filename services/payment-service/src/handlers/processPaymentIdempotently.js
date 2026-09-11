// services/payment-service/src/handlers/processPaymentIdempotently.js
// The real ProcessPayment logic, called by the gRPC server (server.js) for every incoming request. Order of operations matters here:
//   1. Check idempotency store FIRST — if this exact key was already processed, return the cached result immediately, never touch the bank API again.
//   2. Only if it's new, call the bank API through the circuit breaker.
//   3. Store the result under this key BEFORE returning, so any retry (even one that races in a few milliseconds later) will find it.
// → [Idempotency] → [Circuit Breaker]

const { createServiceLogger } = require('shared/logger');
const { getStoredResultForKey, storeResultForKey } = require('../store/idempotencyKeyStore');
const { bankApiCircuitBreaker } = require('../clients/bankApiCircuitBreaker');

const logger = createServiceLogger('payment-service:handler');


async function processPaymentIdempotently({ idempotencyKey, orderId, amountInCents, userId}){
    // Step 1: idempotency check  → [Idempotency]
    const existingResult = await getStoredResultForKey(idempotencyKey);
    if(existingResult){
        logger.info(`Idempotency key ${idempotencyKey} already processed - replaying stored result`);
        return existingResult
    }
    // Step 2: call the bank API, protected by the circuit breaker  → [Circuit Breaker]
    let result;
    try{
        const bankResponse = await bankApiCircuitBreaker.fire({amountInCents, userId });
        result = {
            success:true,
            payment_id: bankResponse.bankTransactionId,
            status:'COMPLETED',
            error_message: '',
        }
    }  catch(error){
        logger.error(`Payment failed for order ${orderId}: ${err.message}`);

        result = {
        success: false,
        payment_id: '',
        status: 'FAILED',
        error_message: err.message,
        };
    }
     // Step 3: store the result under this key, success OR failure, so a retry with the same key never re-attempts the bank call.  → [Idempotency]
     await storeResultForKey(idempotencyKey,result);
     return result;
}

module.exports = { processPaymentIdempotently };