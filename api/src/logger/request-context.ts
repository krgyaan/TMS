import { AsyncLocalStorage } from "node:async_hooks";

type Store = {
    requestId: string;
};

export const requestContext = new AsyncLocalStorage<Store>();

export function getRequestId(): string | undefined {
    return requestContext.getStore()?.requestId;
}
