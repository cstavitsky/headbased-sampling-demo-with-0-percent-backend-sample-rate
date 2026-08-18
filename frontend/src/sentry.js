import * as Sentry from "@sentry/react";

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    // Demo point #1: the frontend samples 100% of the traces IT starts.
    tracesSampleRate: 1.0,
    // Demo point #2: this tells the SDK "attach sentry-trace / baggage
    // headers to outgoing requests that match this URL". Without this,
    // fetch() calls to the backend would carry no trace context at all,
    // and the backend's traces_sample_rate=0 would mean nothing gets
    // captured on that side - full stop, regardless of head-based sampling.
    tracePropagationTargets: [import.meta.env.VITE_BACKEND_URL],
    environment: "tracing-demo",
  });
}

export { Sentry };
// getTraceData isn't re-exported from @sentry/react in this SDK version -
// it lives in @sentry/core (a dependency @sentry/react already uses
// internally, so this is safe to pull in directly).
export { getTraceData } from "@sentry/core";
