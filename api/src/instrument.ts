// api/src/instrument.ts
import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  integrations: [
    // Auto-instrument HTTP requests
    Sentry.httpIntegration(),
    // Capture unhandled promise rejections
    Sentry.onUnhandledRejectionIntegration({ mode: "strict" }),
    // Capture uncaught exceptions
    Sentry.onUncaughtExceptionIntegration()
  ],

  tracesSampler: (samplingContext) => {
    if (samplingContext.parentSampled) return 1.0;
    if (samplingContext.transactionContext?.name?.includes("health")) return 0;
    return 0.1;
  },

  // Profile 10% of sampled transactions
  profilesSampleRate: 0.1,

  beforeSend(event, hint) {
    // Skip 4xx errors except 401/403 (not real server errors)
    const status = (hint?.originalException as any)?.status;
    if (status && status >= 400 && status < 500 && status !== 401 && status !== 403) {
      return null; // Don't send to Sentry
    }

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