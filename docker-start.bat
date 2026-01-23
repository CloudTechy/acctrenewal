@echo off
REM AcctRenewal Docker Quick Start Script for Windows
REM Usage: docker-start.bat [dev|prod|stop|logs|rebuild]

SET command=%1
IF "%command%"=="" SET command=prod

REM Check if Docker is installed
docker --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Error: Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

docker-compose --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Error: Docker Compose is not installed. Please install Docker Desktop first.
    exit /b 1
)

REM Check if .env.local exists
IF NOT EXIST .env.local (
    echo Creating .env.local from template...
    copy .env.example .env.local
    echo .env.local created. Please edit it with your actual credentials before continuing.
    exit /b 1
)

REM Main script logic
IF "%command%"=="dev" (
    echo Starting development environment with hot reload...
    docker-compose -f docker-compose.dev.yml up --build
    goto :eof
)

IF "%command%"=="prod" (
    echo Starting production environment...
    docker-compose up -d --build
    echo.
    echo [SUCCESS] AcctRenewal is running in production mode
    echo Access at: http://localhost:3000
    echo Health check: http://localhost:3000/api/health
    echo View logs: docker-compose logs -f
    goto :eof
)

IF "%command%"=="stop" (
    echo Stopping all containers...
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    echo [SUCCESS] All containers stopped
    goto :eof
)

IF "%command%"=="logs" (
    echo Showing logs (Ctrl+C to exit)...
    docker-compose logs -f
    goto :eof
)

IF "%command%"=="rebuild" (
    echo Rebuilding and restarting...
    docker-compose down
    docker-compose up -d --build --force-recreate
    echo [SUCCESS] Rebuild complete
    goto :eof
)

IF "%command%"=="status" (
    echo Container status:
    docker-compose ps
    echo.
    echo Health check:
    curl -s http://localhost:3000/api/health
    goto :eof
)

IF "%command%"=="clean" (
    echo Cleaning up Docker resources...
    docker-compose down -v --remove-orphans
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans
    echo Removing unused Docker images...
    docker image prune -f
    echo [SUCCESS] Cleanup complete
    goto :eof
)

REM Default: show help
echo AcctRenewal Docker Management Script
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   dev      - Start development environment with hot reload
echo   prod     - Start production environment (default)
echo   stop     - Stop all containers
echo   logs     - Show container logs
echo   rebuild  - Rebuild and restart containers
echo   status   - Show container and health status
echo   clean    - Remove all containers, volumes, and unused images
echo.
echo Examples:
echo   %0 dev           # Start dev server
echo   %0 prod          # Start production
echo   %0 logs          # View logs
echo   %0 stop          # Stop everything
