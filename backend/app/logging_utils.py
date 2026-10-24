import logging
import uuid
from collections.abc import Callable
from time import perf_counter

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

SENSITIVE_KEYS = ("description", "highlights", "proposal", "api_key", "authorization")


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s request_id=%(request_id)s %(message)s",
    )


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = "-"
        return True


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Response]
    ) -> Response:
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        request.state.request_id = request_id
        start = perf_counter()
        response = await call_next(request)
        latency_ms = int((perf_counter() - start) * 1000)
        logger = logging.getLogger("proposalpilot")
        logger.info(
            "method=%s path=%s status=%s latency_ms=%s",
            request.method,
            request.url.path,
            response.status_code,
            latency_ms,
            extra={"request_id": request_id},
        )
        response.headers["X-Request-Id"] = request_id
        return response


def assert_no_sensitive_log(text: str) -> None:
    lowered = text.lower()
    for key in SENSITIVE_KEYS:
        if key in lowered and "job text" in lowered:
            raise AssertionError(f"Sensitive key may have been logged: {key}")
