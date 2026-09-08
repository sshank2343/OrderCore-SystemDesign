// shared/tracing.js
// Sets up OpenTelemetry so every incoming/outgoing HTTP and gRPC call is automatically
// wrapped in a "span". Spans from different services get stitched together into one
// trace (by a shared trace ID passed in request headers), viewable in Jaeger.
// This is what lets you answer: "this request was slow — WHERE exactly did it slow down?"

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');


function startTracingForService(serviceName) {
    const traceExporter = new OTLPTraceExporter({
        url: process.env.JAEGER_ENDPOINT || 'http://localhost:4138/v1/traces',
    });

    const sdk = new NodeSDK({
        serviceName,
        traceExporter,
        instrumentations:[getNodeAutoInstrumentations()]
    });
    sdk.start();

    process.on('SIGTERM', () => sdk.shutdown().finally(()=> process.exit(0)));
    return sdk;
}

module.exports= {startTracingForService}