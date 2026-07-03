import { AsyncLocalStorage } from "node:async_hooks";

type RequestStore = {
  requestId: string;
  method?: string;
  url?: string;
  startTime?: number;
};

export const requestContext = new AsyncLocalStorage<RequestStore>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function getRequestStore(): RequestStore | undefined {
  return requestContext.getStore();
}
