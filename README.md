# AcctRenewal - PHSWEB Account Management System

A comprehensive Next.js 15 application for PHSWEB internet service provider, combining:
- 🌐 RADIUS account self-service and renewals
- 💰 Commission tracking for sales representatives
- 📡 Real-time MikroTik hotspot management
- 💳 Paystack payment integration

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production)

**Windows:**
```bash
.\docker-start.bat prod
```

**Linux/Mac:**
```bash
chmod +x docker-start.sh
./docker-start.sh prod
```

Access at http://localhost:3000

**See [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) for detailed Docker instructions.**

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📋 Features

### 1. RADIUS Account Management
- User account lookup and status checking
- Self-service renewal with multiple service plans
- Integration with RADIUS Manager API
- Real-time account expiry and data usage

### 2. Commission Tracking System
- Sales representative commission tracking (10% default)
- Owner performance dashboards with analytics
- Admin dashboard with charts and leaderboards
- Monthly commission calculations and reports
- CSV export functionality

### 3. MikroTik Hotspot Management
- Multi-location hotspot monitoring (Awka, Lagos, Abuja)
- Real-time active user tracking
- Router connection status and health monitoring
- System resource monitoring (CPU, memory, uptime)
- Location-specific login pages

### 4. Payment Integration
- Paystack payment gateway integration
- Webhook-based payment processing for reliability
- Transaction verification and idempotency
- Automatic credit addition to user accounts

## 🏗️ Technology Stack

- **Framework:** Next.js 15.3.3 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS 4, Radix UI
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Payment:** Paystack API
- **Router API:** MikroTik RouterOS API (node-routeros)

## 📚 Documentation

- [Docker Setup Guide](DOCKER_SETUP.md) - Complete Docker deployment documentation
- [Docker Quick Start](DOCKER_QUICKSTART.md) - Quick reference for Docker commands
- [Hotspot Implementation](HOTSPOT_IMPLEMENTATION_SUMMARY.md) - MikroTik integration details
- [Real-Time Hotspot](REAL_TIME_HOTSPOT_IMPLEMENTATION.md) - Live monitoring architecture
- [Webhook Setup](WEBHOOK_SETUP_GUIDE.md) - Paystack webhook configuration
- [MikroTik Setup](MIKROTIK_SETUP_GUIDE.md) - Router configuration guide
- [API Integration Tasks](api-integration-tasklist.md) - Implementation roadmap

## 🔧 Configuration

### Required Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Paystack
PAYSTACK_SECRET_KEY=your-secret-key
PAYSTACK_PUBLIC_KEY=your-public-key
PAYSTACK_WEBHOOK_SECRET=your-webhook-secret

# RADIUS Manager
RADIUS_API_URL=https://portal1.phsweb.ng/api/sysapi.php
RADIUS_API_USER=phsweb
RADIUS_API_PASS=your-password

# MikroTik Routers
MIKROTIK_AWKA_HOST=192.168.50.2
MIKROTIK_AWKA_USER=admin
MIKROTIK_AWKA_PASSWORD=your-password
```

See [.env.example](.env.example) for complete list.

## 🐳 Docker Deployment

### Quick Commands

```bash
# Production
docker-compose up -d --build

# Development (hot reload)
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Health check
curl http://localhost:3000/api/health
```

### Image Details
- **Production**: ~150MB (optimized, multi-stage build)
- **Development**: ~1.2GB (includes dev tools)
- **Security**: Non-root user, Alpine Linux base
- **Health Checks**: Automatic container restart on failure

## 📊 Project Structure

```
acctrenewal/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── analytics/     # Dashboard metrics
│   │   │   ├── commissions/   # Commission tracking
│   │   │   ├── hotspot/       # MikroTik stats
│   │   │   ├── renew/         # Account renewal
│   │   │   └── webhook/       # Paystack webhooks
│   │   ├── dashboard/         # Admin & owner dashboards
│   │   ├── hotspot/           # Hotspot management
│   │   └── page.tsx           # Main landing page
│   ├── components/            # React components
│   └── lib/                   # Utilities & services
│       ├── database.ts        # Supabase client
│       ├── mikrotik-api.ts    # MikroTik integration
│       └── supabase.ts        # Database helpers
├── public/                    # Static assets
├── docker-compose.yml         # Production Docker config
├── docker-compose.dev.yml     # Development Docker config
├── Dockerfile                 # Production image
├── Dockerfile.dev            # Development image
└── .dockerignore             # Docker build exclusions
```

## 🧪 Testing

```bash
# Test MikroTik connection
npm run test-mikrotik

# Test Phase 1 improvements
npm run test-phase1
```

## 🔒 Security

- Non-root container user (UID 1001)
- Environment-based secrets (no hardcoded credentials)
- Paystack webhook signature verification (HMAC-SHA512)
- Supabase Row Level Security (RLS)
- Transaction idempotency protection

## 📈 Monitoring

- Health check endpoint: `/api/health`
- Docker container health checks (30s intervals)
- Automatic restart on failure
- Structured logging to `./logs` directory

## 🚢 Deployment Options

- **Docker Compose** (self-hosted)
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Apps**
- **DigitalOcean App Platform**
- **Vercel** (serverless)

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for platform-specific guides.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker: `docker-compose up --build`
5. Submit a pull request

## 📝 License

This project is proprietary software for PHSWEB.

## 🆘 Support

For issues and questions:
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Review [DOCKER_SETUP.md](DOCKER_SETUP.md)
- Check container logs: `docker-compose logs -f`

---

**Built with ❤️ for PHSWEB** | Next.js 15 | Docker Ready 🐳
