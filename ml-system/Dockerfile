# ML System Dockerfile
FROM python:3.9-slim AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create non-root user
RUN groupadd -r mluser && useradd -r -g mluser mluser

# Create necessary directories
RUN mkdir -p models logs data && chown -R mluser:mluser models logs data

# Production stage
FROM python:3.9-slim AS production

# Install system dependencies for production
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy installed packages from builder stage
COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/app.py ./
COPY --from=builder /app/requirements.txt ./
COPY --from=builder /app/models ./models
COPY --from=builder /app/logs ./logs
COPY --from=builder /app/data ./data

# Copy user from builder stage
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Switch to non-root user
USER mluser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["python", "app.py", "api", "--host", "0.0.0.0", "--port", "5000"]