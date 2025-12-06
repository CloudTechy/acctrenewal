#!/bin/bash

# PHSWEB Internet Renewal App - VPS Deployment Script
# Run this script on your VPS to deploy the application

set -e  # Exit on any error

echo "🚀 Starting PHSWEB Internet Renewal App deployment..."

# Create logs directory
mkdir -p logs

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build the application
echo "🔨 Building the application..."
npm run build

# Set up PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Stop existing processes
echo "⏹️ Stopping existing processes..."
pm2 stop phsweb-renewal || true
pm2 delete phsweb-renewal || true

# Start the application
echo "▶️ Starting the application..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

echo "✅ Deployment completed successfully!"
echo "📊 Application status:"
pm2 status

echo ""
echo "🌐 Your application should now be running on:"
echo "   http://your-server-ip:3000"
echo ""
echo "📋 Useful commands:"
echo "   pm2 status          - Check application status"
echo "   pm2 logs            - View application logs"
echo "   pm2 restart all     - Restart application"
echo "   pm2 stop all        - Stop application" 