# Multi-stage Dockerfile for Next.js + LibreOffice headless on Render Free tier
# Stage 1: Build Next.js application
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first (better Docker layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Stage 2: Production runtime with LibreOffice
FROM node:20-slim AS runtime

# Install LibreOffice headless for document conversion
# Minimal packages for PPTX/DOCX/XLSX → PDF conversion
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    # Clean up to reduce image size
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Set environment for headless LibreOffice
ENV SAL_USE_VCLPLUGIN=svp
ENV UNO_PATH=/usr/lib/libreoffice/program

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=appuser:appuser /app/.next ./.next
COPY --from=builder --chown=appuser:appuser /app/public ./public
COPY --from=builder --chown=appuser:appuser /app/package.json ./
COPY --from=builder --chown=appuser:appuser /app/next.config.ts ./
COPY --from=builder --chown=appuser:appuser /app/prisma ./prisma

# Copy node_modules from builder
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules

# Copy Prisma generated client
COPY --from=builder --chown=appuser:appuser /app/node_modules/.prisma ./node_modules/.prisma

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER appuser

# Health check - verify LibreOffice is available and app responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "try { require('child_process').execSync('libreoffice --version', {stdio: 'pipe'}); process.exit(0); } catch(e) { process.exit(1); }" && \
        curl -f http://localhost:3000/api/health || exit 1

# Start Next.js server
CMD ["npm", "start"]
