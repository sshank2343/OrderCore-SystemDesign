// shared/logger.js
// Structured logger used by every service so logs are consistent and machine-parseable.
// In a real company this would ship to something like Datadog/ELK — here it prints
// structured JSON to the console, which is the same format those systems ingest.

const winston = require('winston');

function createServiceLogger(serviceName) {
    return winston.createLogger({
        level:'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({timestamp,level,message, ...meta}) => {
                return JSON.stringify({
                    timestamp,
                    level,
                    service:serviceName,
                    message,
                    ...meta
                })
            })
        ),
        transports: [new winston.transports.Console()],
    });
}

module.exports = { createServiceLogger}