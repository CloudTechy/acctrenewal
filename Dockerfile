# ===================================
# Stage 1: Dependencies Installation
# ===================================
FROM node:22-alpine AS deps
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies once (needed for the build stage)
RUN npm install && npm cache clean --force

# ===================================
# Stage 2: Build Stage
# ===================================
FROM node:22-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage (fast)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time Supabase configuration (defaults to dummy values)
# These allow the image to build without external secrets
ARG NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy_anon_key
ARG SUPABASE_SERVICE_ROLE_KEY=dummy_service_role
ARG SUPABASE_URL=https://dummy.supabase.co
ARG SUPABASE_ANON_KEY=dummy_anon_key

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Build the Next.js application
RUN npm run build

# ===================================
# Stage 3: Production Runner
# ===================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Improved health check using the route created below
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]