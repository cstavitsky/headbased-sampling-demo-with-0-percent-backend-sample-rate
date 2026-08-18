import logging
import os
import time

import sentry_sdk
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from sentry_sdk.integrations.flask import FlaskIntegration

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("tracing-demo")

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN", ""),
    integrations=[FlaskIntegration()],
    # This is the whole point of the demo: 0.0 means the backend will not
    # sample any trace THAT IT STARTS. It has no say over a trace that
    # already arrived with a sampling decision attached (e.g. from the
    # frontend) - that decision was made upstream, at the head of the trace,
    # and every downstream service just honors it.
    traces_sample_rate=0.0,
    environment="tracing-demo",
)

app = Flask(__name__)

# sentry-trace / baggage are non-standard headers. If they aren't explicitly
# allow-listed here, the browser's CORS preflight will strip them and the
# trace will silently NOT continue on the backend - this is the #1 reason
# people think distributed tracing "isn't working".
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    allow_headers=["Content-Type", "sentry-trace", "baggage"],
)


@app.before_request
def log_incoming_trace_headers():
    log.info(
        "[BACKEND] incoming request -> sentry-trace=%r baggage=%r",
        request.headers.get("sentry-trace"),
        request.headers.get("baggage"),
    )


def do_some_work():
    # A child span so the trace has more than one node on the backend side.
    with sentry_sdk.start_span(op="demo.work", description="pretend to do work"):
        time.sleep(0.05)


@app.route("/api/hello")
def hello():
    do_some_work()

    span = sentry_sdk.get_current_span()
    trace_id = span.trace_id if span else None
    sampled = span.sampled if span else None

    log.info(
        "[BACKEND] handled request -> trace_id=%s sampled=%s "
        "(backend traces_sample_rate=0.0 - sampled is only True here because "
        "the frontend already decided to sample this trace)",
        trace_id,
        sampled,
    )

    return jsonify(
        {
            "message": "hello from the backend",
            "trace_id": trace_id,
            "sampled": sampled,
            "backend_traces_sample_rate": 0.0,
        }
    )


if __name__ == "__main__":
    # Port 5001, not 5000 - macOS AirPlay Receiver squats on 5000.
    app.run(port=5001, debug=True, use_reloader=False)
