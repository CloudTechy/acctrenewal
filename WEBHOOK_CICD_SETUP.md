# Simple Webhook CI/CD Setup Guide

This guide walks you through setting up a simple webhook-based CI/CD pipeline that automatically deploys your AcctRenewal application to your VPS.

## 📋 Architecture Overview

```
┌─────────────────────┐
│   You Push Code     │
│    to GitHub        │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────┐
│  GitHub Actions Workflow     │
│  1. Build Next.js app        │
│  2. Build Docker image       │
│  3. Push to Docker Hub       │
│  4. Send webhook to VPS      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   VPS (148.230.112.244)      │
│   Webhook Server (Port 3001) │
│  1. Validate signature       │
│  2. Pull latest code         │
│  3. Pull Docker image        │
│  4. Restart containers       │
│  5. Health check             │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   Your App is Live! 🎉       │
└──────────────────────────────┘
```

## 🚀 Step 1: Prepare Your VPS

### 1.1 Connect to VPS
```bash
ssh root@148.230.112.244
```

### 1.2 Install Docker (if not already installed)
```bash
# Update package manager
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install -y docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 1.3 Clone Your Repository
```bash
cd ~
git clone https://github.com/yourusername/acctrenewal.git
cd acctrenewal

# Verify docker-compose.yml exists
ls -la docker-compose.yml
```

### 1.4 Setup Environment
```bash
# Copy your .env.local file to VPS
# Do this from your local machine:
scp -P 22 .env.local root@148.230.112.244:~/acctrenewal/

# Or create it manually on VPS
nano ~/acctrenewal/.env.local
# Add all your environment variables
```

### 1.5 Test Docker Setup Locally
```bash
cd ~/acctrenewal

# Test with local compose
docker-compose up -d
docker-compose logs -f

# Check if app is running
curl http://localhost:3000/api/health

# Stop for now
docker-compose down
```

## 🔧 Step 2: Setup Webhook Server on VPS

### 2.1 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 2.2 Copy Webhook Server
```bash
# Already in ~/acctrenewal, the deploy-webhook-server.js should be there
# If not, copy from your local machine:
scp deploy-webhook-server.js root@148.230.112.244:~/acctrenewal/
```

### 2.3 Create .env for Webhook Server
```bash
cat > ~/acctrenewal/.webhook.env << 'EOF'
PORT=3001
WEBHOOK_SECRET=your-super-secret-webhook-key-change-me-now
APP_DIR=~/acctrenewal
DOCKER_COMPOSE_FILE=docker-compose.yml
EOF
```

**⚠️ IMPORTANT**: Change `your-super-secret-webhook-key-change-me-now` to a random string. You'll need this for GitHub Secrets.

### 2.4 Start Webhook Server with PM2
```bash
cd ~/acctrenewal

# Start the webhook server
pm2 start deploy-webhook-server.js --name "acctrenewal-webhook" --env .webhook.env

# Make it restart on reboot
pm2 startup
pm2 save

# Check status
pm2 status
```

### 2.5 Configure Firewall
```bash
# Allow webhook port (3001)
sudo ufw allow 3001/tcp

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 2.6 Setup Reverse Proxy (Optional but Recommended)
```bash
# Install Nginx
apt install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/acctrenewal-webhook << 'EOF'
server {
    listen 80;
    server_name 148.230.112.244;

    location /webhook/ {
        proxy_pass http://localhost:3001/;
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
EOF

# Enable config
ln -s /etc/nginx/sites-available/acctrenewal-webhook /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 2.7 Test Webhook Locally
```bash
# Check if webhook server is responding
curl http://localhost:3001/health

# Should return: {"status":"ok","timestamp":"2026-01-23T..."}
```

## 📦 Step 3: Configure GitHub Secrets

### 3.1 Generate HMAC Secret
```bash
# Run this on VPS to get the secret
cat ~/acctrenewal/.webhook.env | grep WEBHOOK_SECRET
```

### 3.2 Get Your Docker Hub Credentials
- Go to https://hub.docker.com/settings/security
- Create a Personal Access Token (PAT)
- Copy your username and PAT

### 3.3 Add GitHub Secrets
Go to your GitHub repository:
1. Settings → Secrets and variables → Actions
2. Create new secret: `DOCKER_USERNAME` = your Docker Hub username
3. Create new secret: `DOCKER_PASSWORD` = your Docker Hub PAT
4. Create new secret: `VPS_WEBHOOK_URL` = `http://148.230.112.244/webhook/deploy` (or port 3001 if no Nginx)
5. Create new secret: `VPS_WEBHOOK_SECRET` = the secret from .webhook.env
6. Create new secret: `SLACK_WEBHOOK_URL` = (optional) for Slack notifications

## 🎯 Step 4: Test the Pipeline

### 4.1 Make a Small Change
```bash
# On your local machine, make a small change
echo "# Updated" >> README.md
git add README.md
git commit -m "test: trigger webhook deployment"
git push origin develop  # or main
```

### 4.2 Monitor GitHub Actions
1. Go to your repository
2. Click "Actions" tab
3. Watch the workflow run
4. Should see: Build → Push → Webhook Trigger

### 4.3 Check VPS Webhook Logs
```bash
# On VPS, watch the webhook server logs
pm2 logs acctrenewal-webhook

# Or check deployment log
tail -f ~/acctrenewal/deploy.log
```

### 4.4 Verify Deployment
```bash
# On VPS
docker-compose ps

# Check if app is running
curl http://localhost:3000/api/health
```

## 📝 Workflow Files

### `.github/workflows/deploy-simple.yml`
- Triggers on: push to `main` or `develop` branches
- Builds Next.js app
- Builds Docker image
- Pushes to Docker Hub
- Sends webhook to VPS

### `deploy-webhook-server.js`
- Runs on VPS on port 3001
- Validates webhook signatures (HMAC-SHA256)
- Pulls latest code from GitHub
- Pulls latest Docker image
- Restarts containers with `docker-compose`
- Performs health checks
- Handles rollbacks on failure

## 🔐 Security Considerations

1. **Webhook Secret**: Keep it secret, rotate periodically
2. **VPS Access**: Use SSH keys when possible
3. **GitHub Secrets**: Never expose in logs
4. **Firewall**: Only open necessary ports
5. **Health Checks**: Ensure `/api/health` endpoint is working

## ⚙️ Customization

### Change Webhook Port
```bash
# Edit .webhook.env
nano ~/acctrenewal/.webhook.env
# Change PORT=3001 to desired port

# Restart webhook server
pm2 restart acctrenewal-webhook
```

### Use Different Compose File
```bash
# For production
DOCKER_COMPOSE_FILE=docker-compose.prod.yml

# Edit .webhook.env and restart
pm2 restart acctrenewal-webhook
```

### Add Slack Notifications
The GitHub Actions workflow already supports Slack notifications. Just add the `SLACK_WEBHOOK_URL` secret.

## 🐛 Troubleshooting

### Webhook not triggering
- Check GitHub Actions logs
- Verify `VPS_WEBHOOK_URL` is correct
- Verify `VPS_WEBHOOK_SECRET` matches VPS value

### Webhook receives but deployment fails
- Check VPS logs: `pm2 logs acctrenewal-webhook`
- Check deployment log: `tail -f ~/acctrenewal/deploy.log`
- Verify git can pull: `cd ~/acctrenewal && git pull`
- Verify Docker Hub credentials

### Docker image not pulling
- Check Docker Hub credentials in GitHub Secrets
- Verify image exists: `docker pull cloudtechy/acctrenewal:develop`
- Check VPS internet connectivity

### Health check failing
- Verify app is running: `docker-compose ps`
- Check app logs: `docker-compose logs acctrenewal-app`
- Verify `/api/health` endpoint exists

### PM2 not starting on reboot
```bash
# Reinstall PM2 startup
pm2 startup
pm2 save
```

## 📊 Monitoring

### Check Webhook Server Status
```bash
pm2 status
pm2 logs acctrenewal-webhook --lines 100
```

### Check Deployment Logs
```bash
tail -f ~/acctrenewal/deploy.log
```

### Manual Health Check
```bash
curl http://localhost:3000/api/health
```

## 🎓 Next Steps

1. ✅ Test with `develop` branch (staging)
2. ✅ Test with `main` branch (production)
3. ✅ Setup monitoring and alerting
4. ✅ Document runbook for your team
5. ✅ Setup automated backups

---

**Need help?** Check the deployment logs on VPS or GitHub Actions workflow runs.
