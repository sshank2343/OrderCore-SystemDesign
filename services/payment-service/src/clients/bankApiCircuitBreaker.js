// services/payment-service/src/clients/bankApiCircuitBreaker.js
// Wraps a call to an external bank/payment processor in a circuit breaker.
// Three states, exactly like the real pattern used at companies like Netflix (who popularized this with Hystrix, which `opossum` is a Node port of the idea of):
//   CLOSED   -> calls go through normally
//   OPEN     -> too many recent failures; calls fail IMMEDIATELY without event rying the real bank API, for a cooldown period
//   HALF-OPEN -> after cooldown, allows ONE test call through to see if the bank API has recovered before fully closing again
// → [Circuit Breaker]


const CircuitBreaker = require('opossum');
const { createServiceLogger } = require('shared/logger');

const logger = createServiceLogger('payment-service:circuit-breaker');

async function callExternalBankApi({amounmtInCents, userId }){
    const simulatedLatencyMs = Math.random()*300;
    await new Promise((resolve)=> setTimeout(resolve, simulatedLatencyMs));

    const simulatedFailure = Math.random()<0.2;
    if(simulatedFailure){
        throw new Error('Bank API timeout (simulated)');
    }
    return {
        bankTransactionId: `bank_txn_${Date.now()}_${userId}`,
        amountCharged: amounmtInCents,
    }
}

const circuitBreakerOptions = {
  timeout: 500,               // if the bank API takes longer than this, treat it as a failure
  errorThresholdPercentage: 50, // open the circuit if 50% of recent calls fail
  resetTimeout: 10000,        // after opening, wait 10s before trying a test call (half-open)
};

const bankApiCircuitBreaker = new CircuitBreaker(callExternalBankApi, circuitBreakerOptions);

bankApiCircuitBreaker.on('open', () => logger.warn('Circuit breaker OPENED — bank API calls will fail fast'));
bankApiCircuitBreaker.on('halfOpen', () => logger.info('Circuit breaker HALF-OPEN — testing bank API recovery'));
bankApiCircuitBreaker.on('close', () => logger.info('Circuit breaker CLOSED — bank API is healthy again'));

module.exports = { bankApiCircuitBreaker };