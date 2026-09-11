// services/payment-service/src/server.js
// gRPC server for payment-service — notice this file has NO Express app for its core functionality. The ProcessPayment RPC is served directly by grpc-js, not routed through HTTP verbs/paths like every other service in this project. We DO still run a tiny Express app alongside it, purely for the /health endpoint the gateway polls — gRPC doesn't have an equivalent built-in concept, so a plain REST health check living next to the gRPC server is the standard real-world approach.
// → [REST vs RPC]

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { startTracingForService } = require('shared/tracing');

startTracingForService('payment-service'); // → [Distributed Tracing]

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const express = require('express');
const { createServiceLogger } = require('shared/logger');
const { processPaymentIdempotently } = require('./handlers/processPaymentIdempotently');


const logger = createServiceLogger('payment-serivce');

const PROTO_PATH = path.resolve(__dirname, './grpc/payment.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH,{
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const paymentProto =grpc.loadPackageDefinition(packageDefinition).payment;
// This is the actual gRPC method implementation — grpc-js calls this function whenever a ProcessPayment request arrives, with (call, callback) instead of Express's (req, res). callback(error, response) is how gRPC sends the reply.

async function handleProcessPaymentRpc(call, callback) {
    try {
        const {idempotency_key, order_id, amount_in_cents, user_id } = call.request;
        const result = await processPaymentIdempotently({
            idempotencyKey:idempotency_key,
            orderId:order_id,
            amountInCents:amount_in_cents,
            userId:user_id,
        });

        callback(null,result);
    } catch (error) {
        logger.error(`handleProcessPaymentRpc error:${error.message}`);
        callback(error,null);
    }
}

function startGrpcServer () {
    const grpcServer = new grpc.Server();
    grpcServer.addService(paymentProto.paymentService.Server,{
        ProcessPayment: handleProcessPaymentRpc,

    })
    const GRPC_PORT = process.env.PAYMENT_SERVICE_GRPC_PORT || 5001;
    grpcServer.bindAsync(`0.0.0.0:${GRPC_PORT}`, grpc.ServerCredentials.createInsecure(), () => {
    logger.info(`payment-service gRPC server listening on port ${GRPC_PORT}`);
  });
}


function startHealthCheckHttpServer() {
  const app = express();

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'payment-service' });
  });

  const HEALTH_PORT = process.env.PAYMENT_SERVICE_PORT || 4004;

  app.listen(HEALTH_PORT, () => {
    logger.info(`payment-service health endpoint listening on port ${HEALTH_PORT}`);
  });
}

startGrpcServer();
startHealthCheckHttpServer();