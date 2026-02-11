#!/usr/bin/env node

/**
 * Simple Webhook Deployment Server
 * Runs on VPS to receive GitHub Actions deployment triggers
 * 
 * Usage: node deploy-webhook-server.js
 * Environment Variables:
 *   - PORT: Server port (default: 3001)
 *   - WEBHOOK_SECRET: Secret for HMAC signature validation
 *   - APP_DIR: Application directory (default: ~/acctrenewal)
 *   - DOCKER_COMPOSE_FILE: Docker compose file name (default: docker-compose.yml)
 */

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// Utility: expand ~ in paths
const expandHome = (filePath) => {
  if (filePath.startsWith('~')) {
    return path.join(process.env.HOME || '', filePath.slice(1));
  }
  return filePath;
};

// Configuration
const PORT = process.env.PORT || 3001;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';
const APP_DIR = expandHome(process.env.APP_DIR || '~/acctrenewal');
const COMPOSE_FILE = process.env.DOCKER_COMPOSE_FILE || 'docker-compose.yml';
const COMPOSE_CMD = process.env.DOCKER_COMPOSE_CMD || 'docker compose';
const LOG_FILE = path.join(APP_DIR, 'deploy.log');

// Utility: log with timestamp
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage, (err) => {
    if (err) console.error('Failed to write log:', err);
  });
};

// Utility: execute shell commands safely (using execFile instead of exec)
const executeCommand = (command, args = [], cwd = APP_DIR) => {
  return new Promise((resolve, reject) => {
    log(`Executing: ${command} ${args.join(' ')}`);
    execFile(command, args, { cwd, shell: false }, (error, stdout, stderr) => {
      if (error) {
        log(`Error: ${error.message}`);
        reject(error);
      } else {
        if (stdout) log(`Output: ${stdout}`);
        if (stderr) log(`Stderr: ${stderr}`);
        resolve(stdout);
      }
    });
  });
};

// Validate webhook signature
const validateSignature = (payload, signature) => {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(payload);
  const computedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
};

// Handle deployment
const handleDeployment = async (data) => {
  // SECURITY: Use fixed values to prevent command injection
  const branch = 'master';
  const image = 'cloudtechy/acctrenewal:master';
  
  log(`🚀 Starting deployment for ${branch} branch`);
  
  try {
    // Step 1: Navigate to app directory
    log(`📂 Working directory: ${APP_DIR}`);
    if (!fs.existsSync(APP_DIR)) {
      log(`❌ Directory not found: ${APP_DIR}`);
      throw new Error(`Directory not found: ${APP_DIR}`);
    }

    // Step 1.5: Configure Git to use HTTPS instead of SSH (if needed)
    log(`🔧 Configuring Git for HTTPS...`);
    await executeCommand('git', ['config', '--local', 'url.https://github.com/.insteadOf', 'git@github.com:'], APP_DIR).catch(() => {});
    await executeCommand('git', ['config', '--local', 'url.https://.insteadOf', 'git://'], APP_DIR).catch(() => {});

    // Step 2: Pull latest code
    log(`📥 Pulling latest code...`);
    await executeCommand('git', ['pull', 'origin', branch], APP_DIR);

    // Step 3: Pull latest Docker image
    log(`🐳 Pulling Docker image: ${image}...`);
    await executeCommand('docker', ['pull', image], APP_DIR);

    // Step 4: Load environment variables
    log(`⚙️  Loading environment variables...`);
    if (!fs.existsSync(path.join(APP_DIR, '.env.local'))) {
      log(`⚠️  Warning: .env.local not found in ${APP_DIR}`);
    }

    // Step 5: Backup current docker-compose.yml
    const composePath = path.join(APP_DIR, COMPOSE_FILE);
    const timestamp = Date.now();
    const backupPath = `${composePath}.backup.${timestamp}`;
    if (fs.existsSync(composePath)) {
      log(`💾 Backing up docker-compose file...`);
      await executeCommand('cp', [COMPOSE_FILE, backupPath], APP_DIR);
    }

    // Step 6: Stop and remove ONLY the app container (keep webhook running)
    log(`🧹 Stopping app container...`);
    await executeCommand('docker', ['stop', 'acctrenewal-app'], APP_DIR).catch(
      () => log(`App container not running`)
    );
    
    log(`🗑️  Removing app container...`);
    await executeCommand('docker', ['rm', 'acctrenewal-app'], APP_DIR).catch(
      () => log(`No app container to remove`)
    );

    // Step 7: Start new app container (webhook stays running)
    log(`🚀 Starting new app container with image ${image}...`);
    await executeCommand(
      'docker',
      ['compose', '-f', COMPOSE_FILE, 'up', '-d', 'acctrenewal-app'],
      APP_DIR
    );

    // Step 8: Wait for service startup
    log(`⏳ Waiting for service to start...`);
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Step 9: Health check
    log(`🏥 Performing health check...`);
    let healthOk = false;
    for (let i = 0; i < 8; i++) {
      try {
        await executeCommand(
          'curl',
          ['-f', 'http://localhost:3000/api/health'],
          APP_DIR
        );
        healthOk = true;
        log(`✅ Health check passed!`);
        break;
      } catch (err) {
        if (i < 7) {
          log(`Health check attempt ${i + 1}/8 failed, retrying in 5s...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          log(`❌ Health check failed after 8 attempts`);
        }
      }
    }

    if (!healthOk) {
      throw new Error('Health check failed - deployment unsuccessful');
    }

    // Step 10: Cleanup
    log(`🧹 Cleaning up old Docker images...`);
    await executeCommand('docker', ['image', 'prune', '-f', '--filter', 'until=72h'], APP_DIR).catch(
      () => log(`No images to prune`)
    );

    log(`✅ Deployment successful! Branch: ${branch}, Image: ${image}`);
    return { success: true, message: 'Deployment successful' };

  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`);
    log(`🔄 Attempting to restore from backup...`);
    try {
      // Find latest backup by listing and sorting
      const backupFiles = fs.readdirSync(APP_DIR)
        .filter(f => f.startsWith(`${COMPOSE_FILE}.backup.`))
        .sort()
        .reverse();
      
      if (backupFiles.length > 0) {
        const latestBackup = backupFiles[0];
        await executeCommand('cp', [latestBackup, COMPOSE_FILE], APP_DIR);
        await executeCommand('docker', ['compose', '-f', COMPOSE_FILE, 'down'], APP_DIR).catch(() => {});
        await executeCommand('docker', ['compose', '-f', COMPOSE_FILE, 'up', '-d'], APP_DIR);
        log(`✅ Rollback successful`);
      }
    } catch (rollbackErr) {
      log(`❌ Rollback failed: ${rollbackErr.message}`);
    }
    throw error;
  }
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // Validate signature
        const signature = req.headers['x-webhook-signature'];
        if (!signature) {
          log(`❌ Missing webhook signature`);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing webhook signature' }));
          return;
        }

        if (!validateSignature(body, signature)) {
          log(`❌ Invalid webhook signature`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid webhook signature' }));
          return;
        }

        // Parse payload
        const data = JSON.parse(body);
        
        // SECURITY: Strict allowlist validation
        if (typeof data !== 'object' || data === null) {
          log(`❌ Invalid payload: not an object`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid payload format' }));
          return;
        }
        
        // Only allow master branch
        const allowedBranches = ['master', 'refs/heads/master'];
        if (!allowedBranches.includes(data.branch)) {
          log(`❌ Unauthorized branch: ${data.branch}`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized branch' }));
          return;
        }
        
        // Only allow specific image
        const allowedImage = 'cloudtechy/acctrenewal:master';
        if (data.image && data.image !== allowedImage) {
          log(`❌ Unauthorized image: ${data.image}`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized image' }));
          return;
        }
        
        log(`✅ Webhook signature validated for branch: ${data.branch}`);

        // Handle deployment asynchronously
        handleDeployment(data)
          .then((result) => {
            log(`✅ Deployment completed successfully`);
          })
          .catch((error) => {
            log(`❌ Deployment error: ${error.message}`);
          });

        // Respond immediately
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Deployment initiated',
          branch: data.branch
        }));

      } catch (error) {
        log(`❌ Request error: ${error.message}`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });

  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));

  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
server.listen(PORT, () => {
  log(`🌐 Webhook server running on port ${PORT}`);
  log(`📝 Logs: ${LOG_FILE}`);
  log(`🔐 Webhook endpoint: http://0.0.0.0:${PORT}/deploy`);
  log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
});

// Handle errors
server.on('error', (error) => {
  log(`❌ Server error: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log(`⛔ Received SIGTERM, shutting down gracefully`);
  server.close(() => {
    log(`✅ Server closed`);
    process.exit(0);
  });
});
