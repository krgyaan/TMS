import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const isProduction = (process.env.NODE_ENV || "development").toLowerCase() === "production";

if (isProduction) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: "production",
    release: process.env.SENTRY_RELEASE || "tms-api@0.0.1",
    enabled: true,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    sampleRate: 1.0,
    attachStacktrace: true,
    debug: false,
    integrations: [nodeProfilingIntegration()],
    enableLogs: true,
  });
} else {
  console.log("[Sentry] Disabled in non-production environment");
}

// Profiling happens automatically after setting it up with `Sentry.init()`.
// All spans (unless those discarded by sampling) will have profiling data attached to them.
Sentry.startSpan({
  name: "My Span",
}, () => {
  // The code executed here will be profiled
});