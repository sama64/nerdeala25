# Multi-stage Dockerfile for Nerdeala FastAPI Backend
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir -e .[dev]

# Stage 2: Runtime environment
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

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
