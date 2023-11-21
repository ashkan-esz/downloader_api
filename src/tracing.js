// import opentelemetry from  '@opentelemetry/sdk-node';
// import { getNodeAutoInstrumentations } from  '@opentelemetry/auto-instrumentations-node';
// import exporter from '@opentelemetry/exporter-trace-otlp-http';
// import resource from '@opentelemetry/resources';
// import semanticConventions from  '@opentelemetry/semantic-conventions';
//
// const exporterOptions = {
//     url: 'http://localhost:4318/v1/traces'
// }
//
// const traceExporter = new exporter.OTLPTraceExporter(exporterOptions);
// const sdk = new opentelemetry.NodeSDK({
//     traceExporter,
//     instrumentations: [getNodeAutoInstrumentations()],
//     resource: new resource.Resource({
//         [semanticConventions.SemanticResourceAttributes.SERVICE_NAME]: 'downloader_api',
//     })
// });
//
//
// //    "@opentelemetry/auto-instrumentations-node": "^0.38.0",
// //     "@opentelemetry/exporter-trace-otlp-http": "^0.41.0",
// //     "@opentelemetry/resources": "^1.15.0",
// //     "@opentelemetry/sdk-node": "^0.41.0",
// //     "@opentelemetry/semantic-conventions": "^1.15.0",
//
//
// // initialize the SDK and register with the OpenTelemetry API
// // this enables the API to record telemetry
// sdk.start()
// import('./server.js');
//
// function shutdown() {
//     sdk.shutdown().then(
//         () => console.log("SDK shut down successfully"),
//         (err) => console.log("Error shutting down SDK", err),
//     ).finally(() => process.exit(0))
// }
//
// // gracefully shut down the SDK on process exit
// process.on('exit', shutdown);
// process.on('SIGINT', shutdown);
// process.on('SIGTERM', shutdown);