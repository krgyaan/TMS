import * as winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { getRequestId } from "./request-context";

const serviceName = "tms-api";
const version = "0.0.1";
const environment = process.env.NODE_ENV || "development";

const addRequestId = winston.format(info => {
    const requestId = getRequestId();
    if (requestId) {
        info.requestId = requestId;
    }
    return info;
});

const addContext = winston.format(info => {
    info.service_name = serviceName;
    info.version = version;
    info.environment = environment;
    return info;
});

const devConsoleFormat = winston.format.combine(
    addRequestId(),
    addContext(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, stack, requestId, ...meta }) => {
        const rid = requestId ? `[${requestId}] ` : "";
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : "";
        const errStack = stack ? `\n${stack}` : "";
        return `${timestamp} ${level} ${rid}${message}${metaStr}${errStack}`;
    })
);

const prodConsoleFormat = winston.format.combine(
    addRequestId(),
    addContext(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const dailyFileFormat = winston.format.combine(
    addRequestId(),
    addContext(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const logDir = process.env.LOG_DIR || "logs";

export const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    transports: [
        new DailyRotateFile({
            dirname: logDir,
            filename: "tms-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            maxSize: "20m",
            maxFiles: "14d",
            zippedArchive: true,
            format: dailyFileFormat,
            level: "info",
        }),
        new winston.transports.Console({
            format: environment === "production" ? prodConsoleFormat : devConsoleFormat,
        }),
    ],
});
