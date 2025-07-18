#!/bin/bash

# Database Backup Script for Shiojiri Rainbow Seeker
# This script creates backups of the PostgreSQL database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="shiojiri-rainbow-seeker"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DATABASE_NAME="${DATABASE_NAME:-shiojiri_rainbow}"
DATABASE_USER="${DATABASE_USER:-postgres}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"

# S3 Configuration (optional)
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-backups/}"

# GCS Configuration (optional)
GCS_BUCKET="${GCS_BUCKET:-}"
GCS_PREFIX="${GCS_PREFIX:-backups/}"

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
    
    commands=("pg_dump" "gzip")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is required but not installed."
            exit 1
        fi
    done
    
    log_success "All dependencies are installed."
}

# Function to create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Function to create database backup
create_database_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${PROJECT_NAME}_db_${timestamp}.sql.gz"
    
    log_info "Creating database backup..."
    log_info "Database: $DATABASE_NAME"
    log_info "Host: $DATABASE_HOST:$DATABASE_PORT"
    log_info "User: $DATABASE_USER"
    log_info "Backup file: $backup_file"
    
    # Create database backup
    if PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d "$DATABASE_NAME" \
        --verbose \
        --clean \
        --no-owner \
        --no-privileges \
        | gzip > "$backup_file"; then
        
        log_success "Database backup created: $backup_file"
        
        # Get file size
        local file_size=$(du -h "$backup_file" | cut -f1)
        log_info "Backup file size: $file_size"
        
        echo "$backup_file"
    else
        log_error "Failed to create database backup"
        exit 1
    fi
}

# Function to create application data backup
create_app_data_backup() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${PROJECT_NAME}_uploads_${timestamp}.tar.gz"
    
    log_info "Creating application data backup..."
    
    # Check if uploads directory exists
    if [ -d "./uploads" ]; then
        tar -czf "$backup_file" -C . uploads
        log_success "Application data backup created: $backup_file"
        
        # Get file size
        local file_size=$(du -h "$backup_file" | cut -f1)
        log_info "Backup file size: $file_size"
        
        echo "$backup_file"
    else
        log_warning "Uploads directory not found, skipping application data backup"
    fi
}

# Function to upload backup to S3
upload_to_s3() {
    local backup_file="$1"
    local s3_key="${S3_PREFIX}$(basename "$backup_file")"
    
    if [ -n "$S3_BUCKET" ]; then
        log_info "Uploading backup to S3..."
        
        if command -v aws &> /dev/null; then
            aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key"
            log_success "Backup uploaded to S3: s3://$S3_BUCKET/$s3_key"
        else
            log_error "AWS CLI not found, skipping S3 upload"
        fi
    fi
}

# Function to upload backup to GCS
upload_to_gcs() {
    local backup_file="$1"
    local gcs_key="${GCS_PREFIX}$(basename "$backup_file")"
    
    if [ -n "$GCS_BUCKET" ]; then
        log_info "Uploading backup to GCS..."
        
        if command -v gsutil &> /dev/null; then
            gsutil cp "$backup_file" "gs://$GCS_BUCKET/$gcs_key"
            log_success "Backup uploaded to GCS: gs://$GCS_BUCKET/$gcs_key"
        else
            log_error "gsutil not found, skipping GCS upload"
        fi
    fi
}

# Function to clean up old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    # Clean up local backups
    find "$BACKUP_DIR" -name "${PROJECT_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "${PROJECT_NAME}_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # Clean up S3 backups
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        log_info "Cleaning up old S3 backups..."
        aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX" --recursive | while read -r line; do
            create_date=$(echo "$line" | awk '{print $1" "$2}')
            create_date_seconds=$(date -d "$create_date" +%s)
            current_date_seconds=$(date +%s)
            retention_seconds=$((RETENTION_DAYS * 24 * 60 * 60))
            
            if [ $((current_date_seconds - create_date_seconds)) -gt $retention_seconds ]; then
                file_path=$(echo "$line" | awk '{print $4}')
                aws s3 rm "s3://$S3_BUCKET/$file_path"
                log_info "Deleted old S3 backup: $file_path"
            fi
        done
    fi
    
    # Clean up GCS backups
    if [ -n "$GCS_BUCKET" ] && command -v gsutil &> /dev/null; then
        log_info "Cleaning up old GCS backups..."
        gsutil ls -l "gs://$GCS_BUCKET/$GCS_PREFIX**" | while read -r line; do
            if [[ "$line" =~ ^[0-9] ]]; then
                create_date=$(echo "$line" | awk '{print $2}')
                create_date_seconds=$(date -d "$create_date" +%s)
                current_date_seconds=$(date +%s)
                retention_seconds=$((RETENTION_DAYS * 24 * 60 * 60))
                
                if [ $((current_date_seconds - create_date_seconds)) -gt $retention_seconds ]; then
                    file_path=$(echo "$line" | awk '{print $3}')
                    gsutil rm "$file_path"
                    log_info "Deleted old GCS backup: $file_path"
                fi
            fi
        done
    fi
    
    log_success "Old backup cleanup completed"
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup integrity..."
    
    # Check if file exists and is not empty
    if [ ! -f "$backup_file" ] || [ ! -s "$backup_file" ]; then
        log_error "Backup file is missing or empty"
        return 1
    fi
    
    # Check if gzip file is valid
    if ! gzip -t "$backup_file"; then
        log_error "Backup file is corrupted"
        return 1
    fi
    
    # Check if SQL content is valid
    if ! gunzip -c "$backup_file" | head -n 20 | grep -q "PostgreSQL database dump"; then
        log_error "Backup file does not contain valid PostgreSQL dump"
        return 1
    fi
    
    log_success "Backup integrity verified"
    return 0
}

# Function to send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send to Slack (if webhook URL is provided)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji="✅"
        local color="good"
        
        if [ "$status" = "error" ]; then
            emoji="❌"
            color="danger"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$emoji Database Backup Status: $message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    fi
    
    # Send email (if sendmail is available)
    if command -v sendmail &> /dev/null && [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "Subject: Database Backup Status - $PROJECT_NAME" > /tmp/backup_email.txt
        echo "To: $NOTIFICATION_EMAIL" >> /tmp/backup_email.txt
        echo "" >> /tmp/backup_email.txt
        echo "$message" >> /tmp/backup_email.txt
        echo "" >> /tmp/backup_email.txt
        echo "Timestamp: $(date)" >> /tmp/backup_email.txt
        
        sendmail "$NOTIFICATION_EMAIL" < /tmp/backup_email.txt
        rm -f /tmp/backup_email.txt
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -d, --backup-dir DIR    Backup directory (default: ./backups)"
    echo "  -r, --retention DAYS    Retention period in days (default: 7)"
    echo "  --db-only              Create database backup only"
    echo "  --app-only             Create application data backup only"
    echo "  --no-upload            Skip cloud upload"
    echo "  --no-cleanup           Skip cleanup of old backups"
    echo "  --verify               Verify backup integrity"
    echo ""
    echo "Environment variables:"
    echo "  DATABASE_PASSWORD      Database password"
    echo "  S3_BUCKET             S3 bucket for backup storage"
    echo "  GCS_BUCKET            GCS bucket for backup storage"
    echo "  SLACK_WEBHOOK_URL     Slack webhook for notifications"
    echo "  NOTIFICATION_EMAIL    Email for notifications"
}

# Main script logic
main() {
    local db_only=false
    local app_only=false
    local no_upload=false
    local no_cleanup=false
    local verify_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -d|--backup-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            --db-only)
                db_only=true
                shift
                ;;
            --app-only)
                app_only=true
                shift
                ;;
            --no-upload)
                no_upload=true
                shift
                ;;
            --no-cleanup)
                no_cleanup=true
                shift
                ;;
            --verify)
                verify_only=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check if DATABASE_PASSWORD is set
    if [ -z "$DATABASE_PASSWORD" ]; then
        log_error "DATABASE_PASSWORD environment variable is not set"
        exit 1
    fi
    
    log_info "Starting backup process for $PROJECT_NAME"
    log_info "Backup directory: $BACKUP_DIR"
    log_info "Retention period: $RETENTION_DAYS days"
    
    # Check dependencies
    check_dependencies
    
    # Create backup directory
    create_backup_dir
    
    # If verify only, verify existing backups and exit
    if [ "$verify_only" = true ]; then
        log_info "Verifying existing backups..."
        for backup_file in "$BACKUP_DIR"/${PROJECT_NAME}_*.sql.gz; do
            if [ -f "$backup_file" ]; then
                log_info "Verifying: $(basename "$backup_file")"
                verify_backup "$backup_file"
            fi
        done
        exit 0
    fi
    
    local backup_files=()
    
    # Create database backup
    if [ "$app_only" = false ]; then
        local db_backup_file=$(create_database_backup)
        backup_files+=("$db_backup_file")
        
        # Verify database backup
        if ! verify_backup "$db_backup_file"; then
            send_notification "error" "Database backup verification failed"
            exit 1
        fi
    fi
    
    # Create application data backup
    if [ "$db_only" = false ]; then
        local app_backup_file=$(create_app_data_backup)
        if [ -n "$app_backup_file" ]; then
            backup_files+=("$app_backup_file")
        fi
    fi
    
    # Upload backups to cloud storage
    if [ "$no_upload" = false ]; then
        for backup_file in "${backup_files[@]}"; do
            upload_to_s3 "$backup_file"
            upload_to_gcs "$backup_file"
        done
    fi
    
    # Clean up old backups
    if [ "$no_cleanup" = false ]; then
        cleanup_old_backups
    fi
    
    log_success "Backup process completed successfully"
    
    # Send success notification
    local backup_count=${#backup_files[@]}
    send_notification "success" "Backup completed successfully. $backup_count backup file(s) created."
}

# Create backups directory if it doesn't exist
mkdir -p ./backups

# Run main function
main "$@"