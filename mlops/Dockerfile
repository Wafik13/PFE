# Multi-stage Dockerfile for ML training and inference
FROM python:3.9-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Training stage
FROM base as training

# Copy training scripts
COPY training/ ./training/
COPY data/ ./data/
COPY models/ ./models/

# Set default command for training
CMD ["python", "training/train_model.py"]

# Inference stage
FROM base as inference

# Copy inference server
COPY model_server.py .
COPY inference/ ./inference/

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Set default command for inference
CMD ["python", "model_server.py"]

# Production stage (default)
FROM inference as production

# Add non-root user for security
RUN groupadd -r mluser && useradd -r -g mluser mluser
RUN chown -R mluser:mluser /app
USER mluser

# Final command
CMD ["python", "model_server.py"]