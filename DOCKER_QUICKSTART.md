# 🐳 Docker Deployment - Quick Reference

## Instant Start (Windows)

```powershell
# Copy and edit environment file
cp .env.example .env.local
# Edit .env.local with your credentials

# Start production
.\docker-start.bat prod

# Start development (with hot reload)
.\docker-start.bat dev

# View logs
.\docker-start.bat logs

# Stop everything
.\docker-start.bat stop
```

## Instant Start (Linux/Mac)

```bash
# Make script executable
chmod +x docker-start.sh

# Copy and edit environment file
cp .env.example .env.local
# Edit .env.local with your credentials

# Start production
./docker-start.sh prod

# Start development (with hot reload)
./docker-start.sh dev

# View logs
./docker-start.sh logs

# Stop everything
./docker-start.sh stop
```

## Manual Docker Commands

### Production

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# Check status
docker-compose ps
```

### Development

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Stop
docker-compose -f docker-compose.dev.yml down
```

## Access Points

- **Application**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Hotspot Dashboard**: http://localhost:3000/hotspot
- **Owner Dashboard**: http://localhost:3000/dashboard/owner
- **Admin Dashboard**: http://localhost:3000/dashboard/admin

## Environment Variables

See [.env.example](.env.example) for all required variables:

### Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `PAYSTACK_SECRET_KEY` - Paystack secret key
- `PAYSTACK_PUBLIC_KEY` - Paystack public key
- `RADIUS_API_PASS` - RADIUS Manager password
- `MIKROTIK_AWKA_PASSWORD` - MikroTik router password

## Container Details

### Production Image
- **Base**: Node 20 Alpine (~150MB)
- **Build**: Multi-stage (deps → builder → runner)
- **Security**: Non-root user (nextjs:1001)
- **Health**: Auto-restart on failure

### Development Image
- **Base**: Node 20 Alpine (~1.2GB with dev tools)
- **Features**: Hot reload, source maps
- **Volumes**: Code mounted for live updates

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs acctrenewal-app

# Check environment
docker-compose exec acctrenewal-app env
```

### Port already in use
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

### Permission denied on scripts
```bash
# Linux/Mac only
chmod +x docker-start.sh
```

## Production Deployment

### Cloud Platforms

**Docker Hub:**
```bash
docker build -t yourusername/acctrenewal:latest .
docker push yourusername/acctrenewal:latest
```

**AWS ECS / Google Cloud Run / Azure:**
- See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed instructions

### Behind Nginx/Traefik
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Full Documentation

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for comprehensive documentation including:
- Architecture details
- Security best practices
- Monitoring and logging
- CI/CD integration
- Cloud deployment guides

---

**Quick Commands Cheat Sheet:**

| Task | Windows | Linux/Mac |
|------|---------|-----------|
| Start prod | `.\docker-start.bat prod` | `./docker-start.sh prod` |
| Start dev | `.\docker-start.bat dev` | `./docker-start.sh dev` |
| View logs | `.\docker-start.bat logs` | `./docker-start.sh logs` |
| Stop all | `.\docker-start.bat stop` | `./docker-start.sh stop` |
| Rebuild | `.\docker-start.bat rebuild` | `./docker-start.sh rebuild` |
| Status | `.\docker-start.bat status` | `./docker-start.sh status` |
| Clean up | `.\docker-start.bat clean` | `./docker-start.sh clean` |
