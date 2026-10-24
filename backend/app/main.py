import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.logging_utils import RequestIdFilter, StructuredLoggingMiddleware, configure_logging
from app.providers import get_provider
from app.rate_limit import InMemoryRateLimiter
from app.schemas import ErrorResponse, HealthResponse, ProposalRequest, ProposalResponse
from app.service import generate_proposal

configure_logging()
logging.getLogger().addFilter(RequestIdFilter())


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.settings = settings
    app.state.provider = get_provider(settings)
    app.state.limiter = InMemoryRateLimiter(settings.rate_limit_per_hour)
    yield


app = FastAPI(title="ProposalPilot API", lifespan=lifespan)
app.add_middleware(StructuredLoggingMiddleware)

_settings = get_settings()
_origins = _settings.origins_list()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def error_json(code: str, message: str, status: int) -> JSONResponse:
    body = ErrorResponse(error={"code": code, "message": message})
    return JSONResponse(status_code=status, content=body.model_dump())


@app.exception_handler(RequestValidationError)
async def validation_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    return error_json("INVALID_INPUT", str(exc.errors()[0]["msg"]), 422)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", version=settings.app_version)


@app.post("/v1/proposals", response_model=None)
async def create_proposal(
    payload: ProposalRequest,
    request: Request,
) -> ProposalResponse | JSONResponse:
    limiter: InMemoryRateLimiter = request.app.state.limiter
    ip = request.client.host if request.client else "unknown"
    allowed, retry_after = limiter.check(str(payload.install_id), ip)
    if not allowed:
        resp = error_json(
            "RATE_LIMITED",
            "Too many requests. Please wait before generating again.",
            429,
        )
        resp.headers["Retry-After"] = str(retry_after)
        return resp

    try:
        return generate_proposal(payload, request.app.state.provider)
    except ValueError:
        return error_json("UPSTREAM", "Model returned an invalid response.", 502)
    except Exception:
        logging.getLogger("proposalpilot").exception(
            "Unhandled error",
            extra={"request_id": getattr(request.state, "request_id", "-")},
        )
        return error_json("INTERNAL", "Something went wrong.", 500)
