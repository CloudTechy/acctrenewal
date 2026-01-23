#!/bin/bash

# AcctRenewal Docker Quick Start Script
# Usage: ./docker-start.sh [dev|prod|stop|logs|rebuild]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    print_info "Creating .env.local from template..."
    cp .env.example .env.local
    print_error ".env.local created. Please edit it with your actual credentials before continuing."
    exit 1
fi

# Main script logic
case "${1:-prod}" in
    dev)
        print_info "Starting development environment with hot reload..."
        docker-compose -f docker-compose.dev.yml up --build
        ;;
    
    prod)
        print_info "Starting production environment..."
        docker-compose up -d --build
        print_success "AcctRenewal is running in production mode"
        print_info "Access at: http://localhost:3000"
        print_info "Health check: http://localhost:3000/api/health"
        print_info "View logs: docker-compose logs -f"
        ;;
    
    stop)
        print_info "Stopping all containers..."
        docker-compose down
        docker-compose -f docker-compose.dev.yml down
        print_success "All containers stopped"
        ;;
    
    logs)
        print_info "Showing logs (Ctrl+C to exit)..."
        docker-compose logs -f
        ;;
    
    rebuild)
        print_info "Rebuilding and restarting..."
        docker-compose down
        docker-compose up -d --build --force-recreate
        print_success "Rebuild complete"
        ;;
    
    status)
        print_info "Container status:"
        docker-compose ps
        echo ""
        print_info "Health check:"
        curl -s http://localhost:3000/api/health | jq . || curl -s http://localhost:3000/api/health
        ;;
    
    clean)
        print_info "Cleaning up Docker resources..."
        docker-compose down -v --remove-orphans
        docker-compose -f docker-compose.dev.yml down -v --remove-orphans
        print_info "Removing unused Docker images..."
        docker image prune -f
        print_success "Cleanup complete"
        ;;
    
    *)
        echo "AcctRenewal Docker Management Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  dev      - Start development environment with hot reload"
        echo "  prod     - Start production environment (default)"
        echo "  stop     - Stop all containers"
        echo "  logs     - Show container logs"
        echo "  rebuild  - Rebuild and restart containers"
        echo "  status   - Show container and health status"
        echo "  clean    - Remove all containers, volumes, and unused images"
        echo ""
        echo "Examples:"
        echo "  $0 dev           # Start dev server"
        echo "  $0 prod          # Start production"
        echo "  $0 logs          # View logs"
        echo "  $0 stop          # Stop everything"
        ;;
esac
