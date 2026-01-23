# Docker Setup Guide for AcctRenewal

Complete Docker containerization for the AcctRenewal Next.js application with production-ready configurations.

## 📋 Files Created

- `Dockerfile` - Multi-stage production build
- `Dockerfile.dev` - Development environment with hot reload
- `docker-compose.yml` - Production orchestration
- `docker-compose.dev.yml` - Development orchestration
- `.dockerignore` - Optimized build context
- `.env.example` - Environment variables template
- `src/app/api/health/route.ts` - Health check endpoint

## 🚀 Quick Start

### Production Deployment

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` with your actual values:**
   - Supabase credentials
   - Paystack API keys
   - RADIUS Manager credentials
   - MikroTik router details

3. **Update Next.js config for standalone output:**
   Add to `next.config.ts`:
   ```typescript
   const nextConfig: NextConfig = {
     output: 'standalone',
   };
   ```

4. **Build and run:**
   ```bash
   docker-compose up -d --build
   ```

5. **View logs:**
   ```bash
   docker-compose logs -f acctrenewal-app
   ```

6. **Access the application:**
   - Open: http://localhost:3000
   - Health check: http://localhost:3000/api/health

### Development Mode

1. **Run development container with hot reload:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Your code changes will be reflected immediately** (volume mounted)

## 🏗️ Architecture

### Multi-Stage Build (Production)

```
Stage 1 (deps)     → Install production dependencies
Stage 2 (builder)  → Build Next.js application
Stage 3 (runner)   → Minimal runtime image
```

**Benefits:**
- ✅ Reduced image size (~150MB vs ~1GB)
- ✅ Security (non-root user)
- ✅ Optimized caching
- ✅ Faster deployments

### Image Sizes

- **Development**: ~1.2GB (includes all dev tools)
- **Production**: ~150-200MB (optimized)

## 🔧 Configuration

### Environment Variables

All environment variables are injected via `docker-compose.yml`. See `.env.example` for the complete list.

**Critical Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `PAYSTACK_SECRET_KEY` - Payment processing
- `RADIUS_API_URL` - Account management
- `MIKROTIK_*_HOST` - Router connectivity

### Ports

- **3000** - Main application (HTTP)
- Configurable via `PORT` environment variable

### Health Checks

Docker automatically monitors application health:
- **Endpoint**: `/api/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

## 📊 Docker Commands

### Production

```bash
# Build and start
docker-compose up -d --build

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Remove everything (including volumes)
docker-compose down -v

# Check container status
docker-compose ps

# Execute commands inside container
docker-compose exec acctrenewal-app sh
```

### Development

```bash
# Start dev server
docker-compose -f docker-compose.dev.yml up

# Stop dev server
docker-compose -f docker-compose.dev.yml down

# Rebuild dev image
docker-compose -f docker-compose.dev.yml up --build
```

### Image Management

```bash
# Build production image manually
docker build -t acctrenewal:latest .

# Build with no cache
docker build --no-cache -t acctrenewal:latest .

# Remove unused images
docker image prune -a

# View image size
docker images acctrenewal
```

## 🌐 Production Deployment

### Cloud Platforms

#### **Docker Hub / Registry**

1. **Build and tag:**
   ```bash
   docker build -t yourusername/acctrenewal:v1.0.0 .
   docker tag yourusername/acctrenewal:v1.0.0 yourusername/acctrenewal:latest
   ```

2. **Push to registry:**
   ```bash
   docker login
   docker push yourusername/acctrenewal:v1.0.0
   docker push yourusername/acctrenewal:latest
   ```

3. **Deploy on server:**
   ```bash
   docker pull yourusername/acctrenewal:latest
   docker run -d -p 3000:3000 --env-file .env yourusername/acctrenewal:latest
   ```

#### **AWS ECS/Fargate**

- Upload Docker image to Amazon ECR
- Create ECS task definition with environment variables
- Deploy as Fargate service

#### **Google Cloud Run**

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/your-project/acctrenewal

# Deploy to Cloud Run
gcloud run deploy acctrenewal \
  --image gcr.io/your-project/acctrenewal \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "$(cat .env.local)"
```

#### **Azure Container Apps**

```bash
# Build and push to Azure Container Registry
az acr build --registry yourregistry --image acctrenewal:latest .

# Deploy to Container Apps
az containerapp create \
  --name acctrenewal \
  --resource-group yourgroup \
  --image yourregistry.azurecr.io/acctrenewal:latest \
  --env-vars-file .env.local
```

#### **DigitalOcean App Platform**

- Connect GitHub repository
- App Platform auto-detects Dockerfile
- Configure environment variables in dashboard

### Reverse Proxy (Nginx)

If deploying behind Nginx:

```nginx
server {
    listen 80;
    server_name acctrenewal.phsweb.ng;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔒 Security Best Practices

1. **Non-root User**: Container runs as `nextjs` user (UID 1001)
2. **Minimal Base Image**: Alpine Linux (~5MB base)
3. **No Secrets in Image**: All credentials via environment variables
4. **Health Checks**: Automatic restart on failure
5. **Resource Limits**: CPU and memory constraints

## 🐛 Troubleshooting

### Issue: Container exits immediately

```bash
# Check logs
docker-compose logs acctrenewal-app

# Common causes:
# - Missing environment variables
# - Port already in use
# - Build errors
```

### Issue: Can't connect to Supabase

```bash
# Verify environment variables
docker-compose exec acctrenewal-app env | grep SUPABASE

# Test from inside container
docker-compose exec acctrenewal-app wget -O- $NEXT_PUBLIC_SUPABASE_URL
```

### Issue: Hot reload not working in dev mode

```bash
# Ensure volumes are mounted correctly
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

### Issue: Large image size

```bash
# Check image layers
docker history acctrenewal:latest

# Ensure .dockerignore is properly configured
# Rebuild with no cache
docker build --no-cache -t acctrenewal:latest .
```

## 📈 Monitoring

### Log Aggregation

Production logs are stored in `./logs` directory (mounted volume).

### Container Stats

```bash
# Real-time resource usage
docker stats acctrenewal-app

# Memory and CPU
docker-compose exec acctrenewal-app top
```

### Health Monitoring

```bash
# Check health status
docker inspect acctrenewal-app | grep -A 10 Health

# Manual health check
curl http://localhost:3000/api/health
```

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Or without downtime (if you have multiple instances)
docker-compose up -d --no-deps --build acctrenewal-app
```

### Database Migrations

```bash
# Run Supabase migrations (if needed)
docker-compose exec acctrenewal-app npm run migrate
```

## 📚 Additional Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

## 🆘 Support

For issues related to:
- **Docker**: Check logs and container status
- **Application**: Review Next.js server logs
- **Network**: Verify port mappings and firewall rules
- **Environment**: Ensure all required variables are set

---

**Ready to deploy! 🚀**
