# GitHub Secrets Configuration for Webhook CI/CD

This document lists all the secrets you need to add to your GitHub repository for the webhook-based CI/CD pipeline to work.

## 🔐 Required Secrets

### 1. Docker Hub Credentials

**Secret Name:** `DOCKER_USERNAME`
```
Value: your-dockerhub-username
```
- Go to: https://hub.docker.com/settings/profile
- Your username is displayed in the top-right

**Secret Name:** `DOCKER_PASSWORD`
```
Value: your-dockerhub-personal-access-token
```
- Go to: https://hub.docker.com/settings/security
- Click "New Personal Access Token"
- Give it a descriptive name (e.g., "GitHub Actions - AcctRenewal")
- Set scope to: "Read, Write & Delete"
- Copy the generated token and save it as this secret
- ⚠️ You can only view this once, save it somewhere safe

### 2. VPS Webhook Configuration

**Secret Name:** `VPS_WEBHOOK_URL`
```
Value: http://148.230.112.244:3001/deploy
OR
Value: http://148.230.112.244/webhook/deploy  (if using Nginx reverse proxy)
```
- This is the endpoint where GitHub will send deployment triggers
- Make sure the port/path matches your VPS setup

**Secret Name:** `VPS_WEBHOOK_SECRET`
```
Value: your-super-secret-webhook-key
```
- This must match the `WEBHOOK_SECRET` in your VPS `.webhook.env`
- Generate a random string:
  ```bash
  # On VPS or local machine
  openssl rand -hex 32
  # Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
  ```
- Use this same value in both GitHub and VPS `.webhook.env`

### 3. Optional: Slack Notifications

**Secret Name:** `SLACK_WEBHOOK_URL` (Optional)
```
Value: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```
- Go to: https://api.slack.com/apps
- Create New App → From scratch
- Choose your workspace
- Navigate to: Incoming Webhooks
- Click "Add New Webhook to Workspace"
- Select channel
- Copy the Webhook URL

## 📝 How to Add Secrets to GitHub

### Method 1: GitHub Web UI (Recommended)

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter:
   - **Name:** (e.g., `DOCKER_USERNAME`)
   - **Secret:** (e.g., your Docker Hub username)
6. Click **Add secret**
7. Repeat for each secret

### Method 2: GitHub CLI

```bash
# Install GitHub CLI if you haven't
# https://cli.github.com/

# Login
gh auth login

# Add secrets
gh secret set DOCKER_USERNAME --body "your-username"
gh secret set DOCKER_PASSWORD --body "your-pat"
gh secret set VPS_WEBHOOK_URL --body "http://148.230.112.244:3001/deploy"
gh secret set VPS_WEBHOOK_SECRET --body "your-webhook-secret"
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/..." # optional
```

## ✅ Verification Checklist

After adding all secrets, verify:

- [ ] `DOCKER_USERNAME` matches your Docker Hub username
- [ ] `DOCKER_PASSWORD` is a valid Personal Access Token (not your password)
- [ ] `VPS_WEBHOOK_URL` is correct and reachable
- [ ] `VPS_WEBHOOK_SECRET` matches VPS `.webhook.env` value
- [ ] All secrets are added to the correct repository (not organization or personal account)

## 🚀 Testing Your Secrets

### Test Docker Hub Credentials
```bash
# On your local machine
docker login

# Enter username: your-dockerhub-username
# Enter password: your-dockerhub-personal-access-token (the one from secrets)
```

### Test VPS Webhook URL
```bash
# From your local machine
curl -X GET http://148.230.112.244:3001/health

# Should return something like:
# {"status":"ok","timestamp":"2026-01-23T..."}
```

### Test Webhook Signature
```bash
# On VPS, create a test payload
WEBHOOK_SECRET="your-webhook-secret"
PAYLOAD='{"branch":"develop","image":"cloudtechy/acctrenewal:develop"}'

# Calculate HMAC
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

# Test webhook
curl -X POST http://localhost:3001/deploy \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIGNATURE" \
  -d "$PAYLOAD"

# Should return: {"success":true,"message":"Deployment initiated",...}
```

## 🔄 Rotating Secrets

### Update Docker Hub Token
1. Go to https://hub.docker.com/settings/security
2. Delete old token
3. Create new Personal Access Token
4. Update `DOCKER_PASSWORD` secret in GitHub

### Update Webhook Secret
1. Generate new secret: `openssl rand -hex 32`
2. Update VPS `.webhook.env`: `WEBHOOK_SECRET=new-value`
3. Restart webhook: `pm2 restart acctrenewal-webhook`
4. Update `VPS_WEBHOOK_SECRET` in GitHub

## ⚠️ Security Best Practices

1. **Never commit secrets** to Git
2. **Use Personal Access Tokens** instead of passwords
3. **Rotate secrets regularly** (monthly recommended)
4. **Use separate credentials** for different environments (staging/production)
5. **Limit scope** of tokens (e.g., Docker PAT for Docker only)
6. **Monitor usage** - check GitHub Actions logs
7. **Revoke old tokens** when no longer needed
8. **Use different secrets** for different services

## 🚨 If a Secret is Compromised

1. **Immediately revoke** the compromised credential
   - Docker: https://hub.docker.com/settings/security
   - VPS Webhook: Regenerate and update VPS `.webhook.env`

2. **Generate new secret**
   ```bash
   openssl rand -hex 32
   ```

3. **Update GitHub Secrets**
   - Settings → Secrets and variables → Actions
   - Click pencil icon next to compromised secret
   - Update value

4. **Restart affected services**
   - VPS webhook server: `pm2 restart acctrenewal-webhook`

5. **Monitor for abuse**
   - Check Docker Hub activity logs
   - Check GitHub Actions logs
   - Check VPS access logs

---

**Once all secrets are configured**, push a test commit to your repository to trigger the workflow. The CI/CD pipeline should automatically build and deploy your application!
