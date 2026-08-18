# Head-based sampling demo

A minimal React + Flask app that shows what actually happens when:

- Frontend `tracesSampleRate = 1.0` (100%)
- Backend `traces_sample_rate = 0.0` (0%)
- The frontend calls the backend API

**What you'll see:** one connected trace, with spans from both sides. The
backend's 0% rate only applies to traces it originates itself — it doesn't
get a vote on a trace that arrives already sampled from upstream. That's
head-based sampling: the decision is made once, at the start of the trace,
and every downstream service honors it.

## 1. Create two Sentry projects and grab their DSNs

Two separate DSNs (one JS project, one Python project) is the realistic
setup most customers run. Grab both DSNs before starting.

## 2. Backend setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and paste your Python project's DSN into SENTRY_DSN
python app.py
```

Runs on `http://localhost:5001`.

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# edit .env:
#   VITE_SENTRY_DSN=<your JS project DSN>
#   VITE_BACKEND_URL=http://localhost:5001
npm run dev
```

Open the printed URL (usually `http://localhost:5173`).

## 4. Run it

1. Open the browser devtools console.
2. Open the terminal running the Flask app.
3. Click **Call backend API**.

You should see:

- Browser console: `[FRONTEND] outgoing trace headers: { "sentry-trace": "...", baggage: "..." }`
- Flask terminal: `[BACKEND] incoming request -> sentry-trace='...' baggage='...'` followed by `[BACKEND] handled request -> trace_id=... sampled=True`
- The page itself renders the backend's JSON response, including `sampled: true`

Then go to Sentry → Performance / Explore → Traces (in either project) and
search for that `trace_id`. You'll see one trace with a frontend
transaction/span and a backend transaction/span underneath it.

## Two things that will break this if you're troubleshooting with a customer

1. **CORS must explicitly allow `sentry-trace` and `baggage` headers.**
   `sentry-trace`/`baggage` are non-standard headers, so a CORS preflight
   will strip them unless the backend's `Access-Control-Allow-Headers`
   includes them (see `flask_cors.CORS(..., allow_headers=[...])` in
   `backend/app.py`). If a customer says "the trace isn't continuing on my
   backend," missing CORS header allow-listing is the single most common
   cause.

2. **`tracePropagationTargets` on the frontend must match the backend's
   URL.** If the backend's origin isn't in that list, the JS SDK will not
   attach `sentry-trace`/`baggage` to the request at all — no headers, no
   continued trace, regardless of either side's sample rate. See
   `frontend/src/sentry.js`.

## To flip the demo around

Change `traces_sample_rate=0.0` to `1.0` in `backend/app.py` and
`tracesSampleRate: 1.0` to `0.0` in `frontend/src/sentry.js`, restart both,
and hit the button again. Now the frontend won't start a trace at all, so
there's nothing for the backend to continue — you'll see the backend either
capture nothing, or (if it receives requests directly, not via this app)
start its own independent trace based on its own 100% rate.
