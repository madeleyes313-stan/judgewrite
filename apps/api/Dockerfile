FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY apps/api/requirements.txt /app/apps/api/requirements.txt
COPY packages/core /app/packages/core

RUN pip install --no-cache-dir -r /app/apps/api/requirements.txt \
    && pip install --no-cache-dir -e /app/packages/core

COPY apps/api /app/apps/api
COPY data/demo /app/data/demo

EXPOSE 8000

CMD ["uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
