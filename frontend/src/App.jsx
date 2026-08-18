import { useState } from "react";
import { Sentry, getTraceData } from "./sentry";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function App() {
  const [result, setResult] = useState(null);
  const [traceInfo, setTraceInfo] = useState(null);
  const [error, setError] = useState(null);

  async function callBackend() {
    setResult(null);
    setError(null);

    try {
      await Sentry.startSpan(
        { name: "Call backend API", op: "http.client.demo" },
        async () => {
          // These are exactly the headers the SDK will attach to the fetch
          // call below, since VITE_BACKEND_URL is listed in
          // tracePropagationTargets.
          let outgoingHeaders = null;
          try {
            outgoingHeaders = getTraceData();
          } catch {
            // This is just for display - the actual propagation below
            // (via tracePropagationTargets) works regardless of whether
            // this call succeeds.
          }
          console.log("[FRONTEND] outgoing trace headers:", outgoingHeaders);
          setTraceInfo(outgoingHeaders);

          const res = await fetch(`${BACKEND_URL}/api/hello`);
          if (!res.ok) {
            throw new Error(`Backend returned ${res.status}`);
          }
          const data = await res.json();
          console.log("[FRONTEND] backend responded:", data);
          setResult(data);
        }
      );
    } catch (err) {
      console.error("[FRONTEND] request failed:", err);
      setError(err.message);
    }
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 640, margin: "40px auto", lineHeight: 1.5 }}>
      <h1>Head-based sampling demo</h1>
      <p>
        Frontend <code>tracesSampleRate</code>: <b>1.0 (100%)</b>
        <br />
        Backend <code>traces_sample_rate</code>: <b>0.0 (0%)</b>
      </p>
      <button onClick={callBackend}>Call backend API</button>

      {error && (
        <p style={{ color: "crimson", marginTop: 20 }}>
          Request failed: {error}. Check that the backend is running on{" "}
          {BACKEND_URL} and that CORS allows sentry-trace/baggage headers.
        </p>
      )}

      {traceInfo && (
        <div style={{ marginTop: 20 }}>
          <h3>Outgoing trace headers (frontend → backend)</h3>
          <pre>{JSON.stringify(traceInfo, null, 2)}</pre>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20 }}>
          <h3>Backend response</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          <p>
            {result.sampled
              ? "✅ sampled=true — the backend continued the trace the frontend started, even though its own traces_sample_rate is 0."
              : "❌ sampled=false or missing — check that VITE_BACKEND_URL matches tracePropagationTargets, and that the backend CORS config allows sentry-trace/baggage headers."}
          </p>
        </div>
      )}

      <p style={{ marginTop: 40, color: "#666" }}>
        Open the browser console and the backend terminal to see the trace
        headers logged on both sides. Then search Sentry (Performance /
        Explore → Traces) for the trace_id above — you should see one trace
        with spans from both the frontend and the backend.
      </p>
    </div>
  );
}
