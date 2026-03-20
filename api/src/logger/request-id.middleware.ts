import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";
import { requestContext } from "./request-context";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestId = randomUUID();

    requestContext.run({ requestId }, () => {
        res.setHeader("x-request-id", requestId);
        next();
    });
}
