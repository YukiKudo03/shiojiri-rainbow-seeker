#!/bin/bash

# Shiojiri Rainbow Seeker Deployment Script
# This script handles the deployment of the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="shiojiri-rainbow-seeker"
ENVIRONMENT=${1:-development}
VERSION=${2:-latest}

# Function to print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required commands exist
check_dependencies() {
    log_info "Checking dependencies..."
    
    commands=("docker" "docker-compose")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is required but not installed."
            exit 1
        fi
    done
    
    log_success "All dependencies are installed."
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Copying from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_warning "Please update .env file with your configuration."
        else
            log_error ".env.example not found. Please create .env file manually."
            exit 1
        fi
    fi
}

# Function to build Docker images
build_images() {
    log_info "Building Docker images..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.prod.yml build --no-cache
    else
        docker-compose build --no-cache
    fi
    
    log_success "Docker images built successfully."
}

# Function to start services
start_services() {
    log_info "Starting services..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    log_success "Services started successfully."
}

# Function to stop services
stop_services() {
    log_info "Stopping services..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.prod.yml down
    else
        docker-compose down
    fi
    
    log_success "Services stopped successfully."
}

# Function to check service health
check_health() {
    log_info "Checking service health..."
    
    services=("postgres" "redis" "backend" "frontend" "ml-system" "nginx")
    for service in "${services[@]}"; do
        log_info "Checking $service..."
        if docker-compose ps $service | grep -q "healthy\|Up"; then
            log_success "$service is healthy"
        else
            log_warning "$service is not healthy"
        fi
    done
}

# Function to show logs
show_logs() {
    local service=${1:-}
    
    if [ -z "$service" ]; then
        log_info "Showing logs for all services..."
        if [ "$ENVIRONMENT" = "production" ]; then
            docker-compose -f docker-compose.prod.yml logs -f
        else
            docker-compose logs -f
        fi
    else
        log_info "Showing logs for $service..."
        if [ "$ENVIRONMENT" = "production" ]; then
            docker-compose -f docker-compose.prod.yml logs -f $service
        else
            docker-compose logs -f $service
        fi
    fi
}

# Function to backup database
backup_database() {
    log_info "Creating database backup..."
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="backup_${timestamp}.sql"
    
    docker-compose exec -T postgres pg_dump -U postgres shiojiri_rainbow > ./backups/$backup_file
    
    log_success "Database backup created: $backup_file"
}

# Function to restore database
restore_database() {
    local backup_file=${1:-}
    
    if [ -z "$backup_file" ]; then
        log_error "Please specify backup file to restore."
        exit 1
    fi
    
    if [ ! -f "./backups/$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring database from $backup_file..."
    
    docker-compose exec -T postgres psql -U postgres -d shiojiri_rainbow < ./backups/$backup_file
    
    log_success "Database restored successfully."
}

# Function to run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    docker-compose exec backend node -e "
        const { Pool } = require('pg');
        const fs = require('fs');
        const pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        
        const schema = fs.readFileSync('/app/src/config/schema.sql', 'utf8');
        pool.query(schema).then(() => {
            console.log('Migrations completed successfully');
            process.exit(0);
        }).catch(err => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
    "
    
    log_success "Database migrations completed."
}

# Function to clean up
cleanup() {
    log_info "Cleaning up..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    log_success "Cleanup completed."
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <command> [environment] [options]"
    echo ""
    echo "Commands:"
    echo "  deploy      - Deploy the application"
    echo "  start       - Start services"
    echo "  stop        - Stop services"
    echo "  restart     - Restart services"
    echo "  status      - Check service status"
    echo "  logs        - Show logs [service_name]"
    echo "  backup      - Create database backup"
    echo "  restore     - Restore database [backup_file]"
    echo "  migrate     - Run database migrations"
    echo "  cleanup     - Clean up unused Docker resources"
    echo "  build       - Build Docker images"
    echo ""
    echo "Environment:"
    echo "  development (default)"
    echo "  production"
    echo ""
    echo "Examples:"
    echo "  $0 deploy production"
    echo "  $0 logs backend"
    echo "  $0 backup"
    echo "  $0 restore backup_20240101_120000.sql"
}

# Main script logic
main() {
    local command=${1:-}
    
    case $command in
        "deploy")
            check_dependencies
            check_env_file
            build_images
            start_services
            sleep 10
            check_health
            log_success "Deployment completed successfully!"
            ;;
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            stop_services
            sleep 5
            start_services
            ;;
        "status")
            check_health
            ;;
        "logs")
            show_logs $2
            ;;
        "backup")
            backup_database
            ;;
        "restore")
            restore_database $2
            ;;
        "migrate")
            run_migrations
            ;;
        "cleanup")
            cleanup
            ;;
        "build")
            build_images
            ;;
        *)
            show_usage
            ;;
    esac
}

# Create backups directory if it doesn't exist
mkdir -p ./backups

# Run main function
main "$@"