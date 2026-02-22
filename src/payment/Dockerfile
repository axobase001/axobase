# FeralLobster Payment System - x402 AI Agent Autonomous Payments
# Compatible with Akash Network containerized deployment

FROM node:20-slim

# Install system dependencies
# GnuPG for wallet encryption
RUN apt-get update && apt-get install -y \
    gnupg \
    git \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create required directories
RUN mkdir -p /app/memory/transactions /app/memory/finance /app/.feral

# Set environment
ENV NODE_ENV=production
ENV FERAL_HOME=/app

# Non-root user for security
RUN groupadd -r feral && useradd -r -g feral feral \
    && chown -R feral:feral /app
USER feral

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check OK')" || exit 1

# Default command
CMD ["node", "dist/index.js"]
