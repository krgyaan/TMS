// src/logger/logger.config.ts
import * as winston from "winston";
import { getRequestId } from "./request-context";

const isProd = process.env.NODE_ENV === "production";

const addRequestId = winston.format(info => {
    const requestId = getRequestId();
    if (requestId) {
        info.requestId = requestId;
    }
    return info;
});

export const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(addRequestId(), winston.format.timestamp(), winston.format.errors({ stack: true }), isProd ? winston.format.json() : winston.format.simple()),
    transports: [new winston.transports.Console()],
});
