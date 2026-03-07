// src/logger/logger.config.ts
import * as winston from "winston";
import { getRequestId } from "./request-context";

const addRequestId = winston.format(info => {
    const requestId = getRequestId();
    if (requestId) {
        info.requestId = requestId;
    }
    return info;
});

// Clean readable format
const prettyFormat = winston.format.printf(({ level, message, timestamp, stack, requestId, ...meta }) => {
    const rid = requestId ? `[${requestId}] ` : "";
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : "";
    const errStack = stack ? `\n${stack}` : "";

    return `${timestamp} ${level.toUpperCase()} ${rid}${message}${metaStr}${errStack}`;
});

export const winstonLogger = winston.createLogger({
    /**
     * 🔥 CRITICAL PART
     * Default to the lowest level so NOTHING is ever dropped
     * Control from env when you want to restrict
     */
    level: process.env.LOG_LEVEL || "silly",

    format: winston.format.combine(addRequestId(), winston.format.timestamp(), winston.format.errors({ stack: true }), prettyFormat),

    transports: [new winston.transports.Console()],
});
