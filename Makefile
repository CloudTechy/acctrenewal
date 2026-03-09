.PHONY: help build build-no-cache up down restart logs clean deploy-local

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

build: ## Build Docker image (with cache)
	docker compose build

build-no-cache: ## Build Docker image (no cache, fresh build)
	docker compose build --no-cache --pull

up: ## Start services
	docker compose up -d

down: ## Stop services
	docker compose down

restart: ## Restart services
	docker compose restart

logs: ## View logs (follow)
	docker compose logs -f acctrenewal-app

clean: ## Remove containers, images, and volumes
	docker compose down -v
	docker image prune -f

deploy-local: ## Full fresh deployment (no cache)
	@echo "🚀 Starting fresh deployment..."
	docker compose down
	docker compose build --no-cache --pull
	docker compose up -d
	@echo "✅ Deployment complete!"
	@echo "📋 Checking container status..."
	docker compose ps
	@echo ""
	@echo "📊 View logs with: make logs"

# Environment-specific targets
build-staging: ## Build staging environment
	docker compose -f docker-compose.staging.yml build --no-cache --pull

build-prod: ## Build production environment
	docker compose -f docker-compose.prod.yml build --no-cache --pull

up-staging: ## Start staging environment
	docker compose -f docker-compose.staging.yml up -d

up-prod: ## Start production environment
	docker compose -f docker-compose.prod.yml up -d
