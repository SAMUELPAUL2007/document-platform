# Multi-stage Dockerfile for Next.js + LibreOffice headless on Render Free tier
# Stage 1: Build Next.js application
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first (better Docker layer caching)
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Stage 2: Production runtime with LibreOffice
FROM node:20-slim AS runtime

# Install LibreOffice headless for document conversion
# Packages for DOCX/PPTX → PDF conversion
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
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

# Copy node_modules from builder
COPY --from=builder --chown=appuser:appuser /app/node_modules ./node_modules

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Create writable temp directory for conversion jobs
RUN mkdir -p /app/.tmp && chown appuser:appuser /app/.tmp

# Switch to non-root user
USER appuser

# Health check - verify LibreOffice is available and app responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "const http = require('http'); const { execSync } = require('child_process'); try { execSync('libreoffice --version', {stdio: 'pipe'}); } catch(e) { process.exit(1); } const req = http.get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(5000, () => { req.destroy(); process.exit(1); });"

# Start Next.js server
CMD ["npm", "start"]
