# GitHub SSH Key Setup for CI/CD

This guide shows how to use SSH keys for GitHub authentication in your CI/CD pipeline instead of username/password.

## 🔑 Step 1: Generate SSH Key Pair

Run this on your **local machine** (Windows PowerShell, Git Bash, or WSL):

```bash
# Generate SSH key (leave passphrase empty for automation)
ssh-keygen -t ed25519 -C "acctrenewal-deploy" -f ~/.ssh/github_deploy_key -N ""

# List your keys
ls ~/.ssh/github_deploy_key*
# You should see two files:
# - github_deploy_key (private key - keep secret!)
# - github_deploy_key.pub (public key - add to GitHub)
```

## 🔗 Step 2: Add Deploy Key to GitHub

### 2.1 Get Your Public Key
```bash
# Display the public key
cat ~/.ssh/github_deploy_key.pub

# Should look like:
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... acctrenewal-deploy
```

### 2.2 Add to GitHub Repository

1. Go to your GitHub repo: https://github.com/yourusername/acctrenewal
2. Click **Settings** (top right)
3. Click **Deploy keys** (left sidebar)
4. Click **Add deploy key**
5. Fill in:
   - **Title:** `acctrenewal-deploy`
   - **Key:** (paste the contents of `github_deploy_key.pub`)
   - **Allow write access:** ✅ Check this (if you need to push changes)
6. Click **Add key**

## 🔐 Step 3: Add Private Key to GitHub Secrets

### 3.1 Get Your Private Key
```bash
# Display the private key
cat ~/.ssh/github_deploy_key
```

### 3.2 Add to GitHub Secrets

1. Go to your repo: **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. **Name:** `DEPLOY_SSH_KEY`
4. **Secret:** (paste the entire contents of `id_ed25519` - including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)
5. Click **Add secret**

## 🚀 Step 4: Update Webhook Server to Use SSH

Update your `deploy-webhook-server.js` to configure SSH before git clone:

```bash
# On VPS, setup SSH config
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create known_hosts entry for GitHub
ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
```

Then in the webhook deployment handler, before git pull:

```bash
# Configure git to use SSH
git config --global url."git@github.com:".insteadOf "https://github.com/"

# Optional: Configure specific SSH key if needed
export GIT_SSH_COMMAND="ssh -i ~/.ssh/github_deploy_key -o IdentitiesOnly=yes"
```

## 📝 Step 5: Update GitHub Actions Workflow

Update `.github/workflows/deploy-simple.yml` to use SSH:

```yaml
jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository (SSH)
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          # If using private repo, GitHub Actions automatically uses GITHUB_TOKEN
          # For custom SSH key, use webfactory/ssh-agent action:
      
      - name: Setup SSH (if using custom deploy key)
        uses: webfactory/ssh-agent@v0.8.0
        with:
          ssh-private-key: ${{ secrets.DEPLOY_SSH_KEY }}

      # ... rest of your workflow
```

## 🔄 Step 6: VPS Setup for SSH Authentication

On your **VPS**, setup SSH authentication for webhook server:

```bash
# SSH into VPS
ssh root@148.230.112.244

# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create/add your GitHub deploy key
# Option A: Copy from local machine
scp ~/.ssh/github_deploy_key root@148.230.112.244:~/.ssh/

# Option B: Or paste it manually
nano ~/.ssh/github_deploy_key
# Paste the private key content
# Save with Ctrl+X, Y, Enter

# Set correct permissions
chmod 600 ~/.ssh/github_deploy_key

# Add GitHub to known_hosts
ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null

# Test SSH connection to GitHub
ssh -i ~/.ssh/github_deploy_key git@github.com
# Should show: "Hi yourusername! You've successfully authenticated..."
```

## 📋 GitHub Secrets to Update

Your GitHub secrets should now be:

| Secret Name | Value |
|-------------|-------|
| `DOCKER_USERNAME` | `cloudtechy` |
| `DOCKER_PASSWORD` | (Docker Hub Personal Access Token) |
| `VPS_WEBHOOK_URL` | `http://148.230.112.244:3001/deploy` |
| `VPS_WEBHOOK_SECRET` | (Your webhook secret from `openssl rand -hex 32`) |
| `DEPLOY_SSH_KEY` | (Your private key from `~/.ssh/id_ed25519`) |
| `SLACK_WEBHOOK_URL` | (Optional - Slack webhook) |

## ✅ Testing

### Test SSH Key Works Locally
```bash
# Test GitHub SSH auth
ssh -i ~/.ssh/github_deploy_key git@github.com

# Test git clone with SSH
git clone git@github.com:yourusername/acctrenewal.git test-clone
```

### Test on VPS
```bash
# SSH into VPS
ssh root@148.230.112.244

# Test git clone
cd ~
git clone git@github.com:yourusername/acctrenewal.git test-acctrenewal
```

## 🔐 Security Best Practices

1. **Passphrase:** For automation, leave passphrase empty
2. **Deploy Key Scope:** Use deploy keys (repo-level) not personal SSH keys
3. **Read-Only:** Uncheck "Allow write access" unless you need to push from CI/CD
4. **Rotation:** Regenerate keys every 90 days
5. **Logging:** SSH key access is logged in GitHub's audit log

## 🔄 Rotating SSH Keys

If you need to rotate keys:

1. Generate new key pair
2. Add new public key to GitHub deploy keys
3. Remove old public key from GitHub
4. Update `GITHUB_SSH_KEY` secret with new private key
5. Delete old private key from `.ssh/` folder

## 🐛 Troubleshooting

### "Permission denied (publickey)"
- Check GitHub knows_hosts is updated: `ssh-keyscan github.com >> ~/.ssh/known_hosts`
- Verify private key permissions: `chmod 600 ~/.ssh/github_deploy_key`
- Verify SSH key is added to GitHub deploy keys

### "Could not open a connection to your authentication agent"
- SSH Agent might not be running
- In GitHub Actions, use `webfactory/ssh-agent@v0.8.0` action

### Git clone still using HTTPS
- Check global git config: `git config --global --list`
- Set SSH as default: `git config --global url."git@github.com:".insteadOf "https://github.com/"`

---

**Summary:** SSH keys are more secure than username/password and work well with CI/CD automation!
