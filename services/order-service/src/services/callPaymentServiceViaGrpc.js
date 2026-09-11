// services/order-service/src/services/callPaymentServiceViaGrpc.js
// The RPC half of [REST vs RPC]. Compare this file to how order-service calls
// catalog-service in createOrderWithInventoryTransaction.js — that call uses
// axios.patch() over plain HTTP/REST. THIS call uses gRPC: a persistent HTTP/2
// connection, binary Protobuf payloads (smaller/faster than JSON), and a
// STRONGLY TYPED function signature generated directly from payment.proto.
// → [REST vs RPC]

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { createServiceLogger } = require('shared/logger');

const logger = createServiceLogger('order-service:grpc-client');

const PROTO_PATH = path.resolve(__dirname, '../grpc/payment.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const paymentProto = grpc.loadPackageDefinition(packageDefinition).payment;

const PAYMENT_SERVICE_GRPC_ADDRESS = `localhost:${process.env.PAYMENT_SERVICE_GRPC_PORT || 5001}`;

const paymentServiceClient = new paymentProto.PaymentService(
  PAYMENT_SERVICE_GRPC_ADDRESS,
  grpc.credentials.createInsecure() // insecure = plaintext, fine for local dev; real prod would use TLS credentials here
);

function callPaymentServiceViaGrpc({ idempotencyKey, orderId, amountInCents, userId }) {
  return new Promise((resolve, reject) => {
    paymentServiceClient.ProcessPayment(
      {
        idempotency_key: idempotencyKey,
        order_id: orderId,
        amount_in_cents: amountInCents,
        user_id: userId,
      },
      (err, response) => {
        if (err) {
          logger.error(`gRPC call to payment-service failed: ${err.message}`);
          return reject(err);
        }
        logger.info(`gRPC payment response for order ${orderId}: ${response.status}`);
        resolve(response);
      }
    );
  });
}

module.exports = { callPaymentServiceViaGrpc };