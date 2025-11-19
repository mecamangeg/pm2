# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/backend packages/backend
COPY packages/frontend packages/frontend

# Build backend
RUN pnpm --filter backend build

# Build frontend
RUN pnpm --filter frontend build

# Production stage
FROM node:20-alpine AS production

# Install PM2 globally
RUN npm install -g pm2

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/backend/package.json packages/backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --filter backend

# Copy built backend
COPY --from=builder /app/packages/backend/dist packages/backend/dist

# Copy built frontend (to be served statically)
COPY --from=builder /app/packages/frontend/dist packages/frontend/dist

# Copy environment example
COPY packages/backend/.env.example packages/backend/.env.example

# Create data directory for user storage
RUN mkdir -p packages/backend/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "packages/backend/dist/index.js"]
