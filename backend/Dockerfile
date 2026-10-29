FROM python:3.12-slim AS base

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS runtime
RUN useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=base /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=base /usr/local/bin /usr/local/bin
COPY app ./app
USER appuser
ENV ENV=production
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT', '8000'))" || exit 1
# Trust X-Forwarded-For from the platform proxy (container is never exposed directly).
ENV FORWARDED_ALLOW_IPS=*
# Shell form so $PORT (set by Render) is expanded.
CMD uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2 --proxy-headers
