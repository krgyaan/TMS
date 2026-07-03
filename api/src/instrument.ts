import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampler: (samplingContext) => {
    if (samplingContext.parentSampled) {
      return 1.0;
    }
    if (samplingContext.transactionContext?.name?.includes("health")) {
      return 0;
    }
    return 0.1;
  },

  beforeSend(event, hint) {
    if (event.request) {
      const sensitiveHeaders = ["authorization", "cookie", "x-csrf-token"];
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers || {}).filter(
          ([k]) => !sensitiveHeaders.includes(k.toLowerCase())
        )
      );
      if (!hint?.originalException && event.request.data) {
        delete event.request.data;
      }
    }
    return event;
  },

  ignoreErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "Request failed with status code 404",
    /^Cannot GET/,
  ],

  release: process.env.APP_VERSION || "0.0.1",
});