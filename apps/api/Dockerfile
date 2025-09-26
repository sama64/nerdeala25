# Dockerfile for Nerdeala FastAPI Backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better caching
COPY pyproject.toml ./

# Install dependencies directly from pyproject.toml
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.1 \
    pydantic[email]==2.6.3 \
    pydantic-settings==2.0.3 \
    sqlalchemy==2.0.25 \
    alembic==1.13.1 \
    psycopg2-binary==2.9.9 \
    aiosqlite==0.19.0 \
    passlib[bcrypt]==1.7.4 \
    python-jose[cryptography]==3.3.0 \
    python-multipart==0.0.9 \
    httpx==0.26.0 \
    redis==5.0.1 \
    tenacity==8.2.3

# Copy application code
COPY . .

# Build-time environment variables
ARG DATABASE_URL
ARG JWT_SECRET_KEY
ARG JWT_ACCESS_TOKEN_EXPIRES_MINUTES=30
ARG CORS_ORIGINS
ARG CLASSROOM_API_BASE_URL
ARG CLASSROOM_SERVICE_ACCOUNT_FILE
ARG REDIS_URL
ARG DEBUG=false

# Set environment variables
ENV DATABASE_URL=${DATABASE_URL}
ENV JWT_SECRET_KEY=${JWT_SECRET_KEY}
ENV JWT_ACCESS_TOKEN_EXPIRES_MINUTES=${JWT_ACCESS_TOKEN_EXPIRES_MINUTES}
ENV CORS_ORIGINS=${CORS_ORIGINS}
ENV CLASSROOM_API_BASE_URL=${CLASSROOM_API_BASE_URL}
ENV CLASSROOM_SERVICE_ACCOUNT_FILE=${CLASSROOM_SERVICE_ACCOUNT_FILE}
ENV REDIS_URL=${REDIS_URL}
ENV DEBUG=${DEBUG}
ENV PYTHONPATH=/app

# Create non-root user for security
RUN addgroup --gid 1001 --system appuser && \
    adduser --uid 1001 --system --gid 1001 --home /app --shell /bin/false appuser

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Start FastAPI with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
