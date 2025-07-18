#!/bin/bash

# Database Restore Script for Shiojiri Rainbow Seeker
# This script restores PostgreSQL database from backup files

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
DATABASE_NAME="${DATABASE_NAME:-shiojiri_rainbow}"
DATABASE_USER="${DATABASE_USER:-postgres}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"

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
    
    commands=("psql" "gunzip")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is required but not installed."
            exit 1
        fi
    done
    
    log_success "All dependencies are installed."
}

# Function to list available backups
list_backups() {
    log_info "Available database backups:"
    echo ""
    
    local backups=()
    local index=1
    
    for backup_file in "$BACKUP_DIR"/${PROJECT_NAME}_db_*.sql.gz; do
        if [ -f "$backup_file" ]; then
            local filename=$(basename "$backup_file")
            local file_size=$(du -h "$backup_file" | cut -f1)
            local file_date=$(date -r "$backup_file" "+%Y-%m-%d %H:%M:%S")
            
            printf "%2d. %s (%s, %s)\n" "$index" "$filename" "$file_size" "$file_date"
            backups+=("$backup_file")
            ((index++))
        fi
    done
    
    if [ ${#backups[@]} -eq 0 ]; then
        log_warning "No backup files found in $BACKUP_DIR"
        return 1
    fi
    
    echo ""
    echo "${backups[@]}"
}

# Function to verify backup file
verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup file: $(basename "$backup_file")"
    
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
    
    log_success "Backup file verification passed"
    return 0
}

# Function to check database connection
check_database_connection() {
    log_info "Checking database connection..."
    
    if PGPASSWORD="$DATABASE_PASSWORD" psql \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d postgres \
        -c "SELECT 1;" > /dev/null 2>&1; then
        
        log_success "Database connection successful"
        return 0
    else
        log_error "Failed to connect to database"
        return 1
    fi
}

# Function to create database if it doesn't exist
create_database() {
    log_info "Creating database if it doesn't exist..."
    
    PGPASSWORD="$DATABASE_PASSWORD" psql \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d postgres \
        -c "CREATE DATABASE $DATABASE_NAME;" 2>/dev/null || true
    
    log_success "Database $DATABASE_NAME is ready"
}

# Function to backup current database before restore
backup_current_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/${PROJECT_NAME}_pre_restore_${timestamp}.sql.gz"
    
    log_info "Creating backup of current database before restore..."
    
    if PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d "$DATABASE_NAME" \
        --verbose \
        --clean \
        --no-owner \
        --no-privileges \
        2>/dev/null | gzip > "$backup_file"; then
        
        log_success "Pre-restore backup created: $backup_file"
        return 0
    else
        log_warning "Failed to create pre-restore backup (database might not exist)"
        return 1
    fi
}

# Function to restore database from backup
restore_database() {
    local backup_file="$1"
    
    log_info "Restoring database from backup..."
    log_info "Backup file: $(basename "$backup_file")"
    log_info "Database: $DATABASE_NAME"
    log_info "Host: $DATABASE_HOST:$DATABASE_PORT"
    log_info "User: $DATABASE_USER"
    
    # Restore database
    if gunzip -c "$backup_file" | PGPASSWORD="$DATABASE_PASSWORD" psql \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d "$DATABASE_NAME" \
        --single-transaction \
        --set ON_ERROR_STOP=on \
        -q; then
        
        log_success "Database restored successfully"
        return 0
    else
        log_error "Failed to restore database"
        return 1
    fi
}

# Function to verify restored database
verify_restored_database() {
    log_info "Verifying restored database..."
    
    # Check if database exists and has tables
    local table_count=$(PGPASSWORD="$DATABASE_PASSWORD" psql \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d "$DATABASE_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    
    if [ "$table_count" -gt 0 ]; then
        log_success "Database verification passed ($table_count tables found)"
        return 0
    else
        log_error "Database verification failed (no tables found)"
        return 1
    fi
}

# Function to download backup from S3
download_from_s3() {
    local s3_key="$1"
    local local_file="$2"
    
    log_info "Downloading backup from S3..."
    
    if command -v aws &> /dev/null; then
        aws s3 cp "s3://$S3_BUCKET/$s3_key" "$local_file"
        log_success "Backup downloaded from S3: $local_file"
        return 0
    else
        log_error "AWS CLI not found"
        return 1
    fi
}

# Function to download backup from GCS
download_from_gcs() {
    local gcs_key="$1"
    local local_file="$2"
    
    log_info "Downloading backup from GCS..."
    
    if command -v gsutil &> /dev/null; then
        gsutil cp "gs://$GCS_BUCKET/$gcs_key" "$local_file"
        log_success "Backup downloaded from GCS: $local_file"
        return 0
    else
        log_error "gsutil not found"
        return 1
    fi
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
            --data "{\"text\":\"$emoji Database Restore Status: $message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options] [backup_file]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -l, --list              List available backups"
    echo "  -i, --interactive       Interactive mode to select backup"
    echo "  -f, --force             Force restore without confirmation"
    echo "  -d, --backup-dir DIR    Backup directory (default: ./backups)"
    echo "  --no-backup             Skip pre-restore backup"
    echo "  --from-s3 KEY           Download backup from S3"
    echo "  --from-gcs KEY          Download backup from GCS"
    echo ""
    echo "Environment variables:"
    echo "  DATABASE_PASSWORD      Database password"
    echo "  S3_BUCKET             S3 bucket for backup storage"
    echo "  GCS_BUCKET            GCS bucket for backup storage"
    echo "  SLACK_WEBHOOK_URL     Slack webhook for notifications"
    echo ""
    echo "Examples:"
    echo "  $0 -l                           # List available backups"
    echo "  $0 -i                           # Interactive mode"
    echo "  $0 backup_file.sql.gz           # Restore from specific file"
    echo "  $0 --from-s3 backups/backup.sql.gz  # Download from S3 and restore"
}

# Main script logic
main() {
    local backup_file=""
    local interactive_mode=false
    local force_restore=false
    local no_backup=false
    local from_s3=""
    local from_gcs=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -l|--list)
                list_backups
                exit 0
                ;;
            -i|--interactive)
                interactive_mode=true
                shift
                ;;
            -f|--force)
                force_restore=true
                shift
                ;;
            -d|--backup-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --no-backup)
                no_backup=true
                shift
                ;;
            --from-s3)
                from_s3="$2"
                shift 2
                ;;
            --from-gcs)
                from_gcs="$2"
                shift 2
                ;;
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                backup_file="$1"
                shift
                ;;
        esac
    done
    
    # Check if DATABASE_PASSWORD is set
    if [ -z "$DATABASE_PASSWORD" ]; then
        log_error "DATABASE_PASSWORD environment variable is not set"
        exit 1
    fi
    
    log_info "Starting restore process for $PROJECT_NAME"
    
    # Check dependencies
    check_dependencies
    
    # Check database connection
    if ! check_database_connection; then
        exit 1
    fi
    
    # Download backup from cloud storage if requested
    if [ -n "$from_s3" ]; then
        backup_file="$BACKUP_DIR/$(basename "$from_s3")"
        download_from_s3 "$from_s3" "$backup_file"
    elif [ -n "$from_gcs" ]; then
        backup_file="$BACKUP_DIR/$(basename "$from_gcs")"
        download_from_gcs "$from_gcs" "$backup_file"
    fi
    
    # Interactive mode to select backup
    if [ "$interactive_mode" = true ]; then
        local backup_list=$(list_backups)
        if [ $? -ne 0 ]; then
            exit 1
        fi
        
        echo "Select backup to restore:"
        read -p "Enter backup number: " backup_number
        
        local backup_array=($backup_list)
        if [ "$backup_number" -ge 1 ] && [ "$backup_number" -le "${#backup_array[@]}" ]; then
            backup_file="${backup_array[$((backup_number - 1))]}"
        else
            log_error "Invalid backup number"
            exit 1
        fi
    fi
    
    # Check if backup file is specified
    if [ -z "$backup_file" ]; then
        log_error "No backup file specified"
        show_usage
        exit 1
    fi
    
    # Make backup file path absolute if it's not
    if [[ "$backup_file" != /* ]]; then
        backup_file="$BACKUP_DIR/$backup_file"
    fi
    
    # Verify backup file
    if ! verify_backup "$backup_file"; then
        exit 1
    fi
    
    # Confirmation prompt
    if [ "$force_restore" = false ]; then
        log_warning "This will replace the current database with the backup data"
        log_warning "Backup file: $(basename "$backup_file")"
        log_warning "Target database: $DATABASE_NAME"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Restore cancelled"
            exit 0
        fi
    fi
    
    # Create database if it doesn't exist
    create_database
    
    # Backup current database before restore
    if [ "$no_backup" = false ]; then
        backup_current_database
    fi
    
    # Restore database
    if restore_database "$backup_file"; then
        # Verify restored database
        if verify_restored_database; then
            log_success "Database restore completed successfully"
            send_notification "success" "Database restored successfully from $(basename "$backup_file")"
        else
            log_error "Database restore verification failed"
            send_notification "error" "Database restore verification failed"
            exit 1
        fi
    else
        log_error "Database restore failed"
        send_notification "error" "Database restore failed"
        exit 1
    fi
}

# Run main function
main "$@"