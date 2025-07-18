# GCP Infrastructure Module
variable "name_prefix" {
  description = "Name prefix for resources"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

# VPC Network
resource "google_compute_network" "main" {
  name                    = "${var.name_prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"

  project = var.project_id
}

# Subnet
resource "google_compute_subnetwork" "main" {
  name          = "${var.name_prefix}-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.main.id

  project = var.project_id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/16"
  }
}

# Cloud Router
resource "google_compute_router" "main" {
  name    = "${var.name_prefix}-router"
  region  = var.region
  network = google_compute_network.main.id

  project = var.project_id
}

# Cloud NAT
resource "google_compute_router_nat" "main" {
  name   = "${var.name_prefix}-nat"
  router = google_compute_router.main.name
  region = var.region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  project = var.project_id

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Firewall Rules
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.name_prefix}-allow-internal"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/16"]

  project = var.project_id
}

resource "google_compute_firewall" "allow_http" {
  name    = "${var.name_prefix}-allow-http"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server"]

  project = var.project_id
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "${var.name_prefix}-allow-ssh"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["ssh-server"]

  project = var.project_id
}

# GKE Cluster
resource "google_container_cluster" "main" {
  name     = "${var.name_prefix}-gke"
  location = var.region

  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.main.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  network_policy {
    enabled = true
  }

  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  project = var.project_id
}

# GKE Node Pool
resource "google_container_node_pool" "main" {
  name       = "${var.name_prefix}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.main.name
  node_count = 2

  node_config {
    preemptible  = false
    machine_type = "e2-medium"

    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = var.labels

    tags = ["gke-node", "${var.name_prefix}-gke"]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }

  project = var.project_id
}

# Service Account for GKE nodes
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.name_prefix}-gke-nodes"
  display_name = "GKE Nodes Service Account"

  project = var.project_id
}

# Cloud SQL Instance
resource "google_sql_database_instance" "main" {
  name             = "${var.name_prefix}-db"
  database_version = "POSTGRES_15"
  region           = var.region

  deletion_protection = false

  settings {
    tier = "db-f1-micro"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      location                       = var.region
      point_in_time_recovery_enabled = true
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.main.id
      enable_private_path_for_google_cloud_services = true
    }

    maintenance_window {
      day          = 7
      hour         = 3
      update_track = "stable"
    }
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]

  project = var.project_id
}

# Private Service Connection
resource "google_compute_global_address" "private_ip_address" {
  name          = "${var.name_prefix}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id

  project = var.project_id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]

  depends_on = [google_compute_global_address.private_ip_address]
}

# Cloud SQL Database
resource "google_sql_database" "main" {
  name     = "shiojiri_rainbow"
  instance = google_sql_database_instance.main.name

  project = var.project_id
}

# Cloud SQL User
resource "google_sql_user" "main" {
  name     = "postgres"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result

  project = var.project_id
}

# Random password for Cloud SQL
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# Redis Instance
resource "google_redis_instance" "main" {
  name           = "${var.name_prefix}-redis"
  memory_size_gb = 1
  region         = var.region

  location_id             = "${var.region}-a"
  alternative_location_id = "${var.region}-b"

  authorized_network = google_compute_network.main.id

  redis_version     = "REDIS_7_0"
  display_name      = "Redis instance for ${var.name_prefix}"
  reserved_ip_range = "10.3.0.0/29"

  auth_enabled = true

  labels = var.labels

  project = var.project_id
}

# Static IP for Load Balancer
resource "google_compute_global_address" "main" {
  name = "${var.name_prefix}-ip"

  project = var.project_id
}

# Container Registry
resource "google_container_registry" "main" {
  project  = var.project_id
  location = "ASIA"
}

# Artifact Registry
resource "google_artifact_registry_repository" "main" {
  location      = var.region
  repository_id = "${var.name_prefix}-repo"
  description   = "Docker repository for ${var.name_prefix}"
  format        = "DOCKER"

  labels = var.labels

  project = var.project_id
}

# Cloud Storage Bucket for backups
resource "google_storage_bucket" "backups" {
  name          = "${var.name_prefix}-backups-${random_id.bucket_suffix.hex}"
  location      = var.region
  force_destroy = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  labels = var.labels

  project = var.project_id
}

# Random ID for bucket naming
resource "random_id" "bucket_suffix" {
  byte_length = 8
}

# Cloud Storage Bucket for uploads
resource "google_storage_bucket" "uploads" {
  name          = "${var.name_prefix}-uploads-${random_id.bucket_suffix.hex}"
  location      = var.region
  force_destroy = true

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  labels = var.labels

  project = var.project_id
}

# Service Account for applications
resource "google_service_account" "app" {
  account_id   = "${var.name_prefix}-app"
  display_name = "Application Service Account"

  project = var.project_id
}

# IAM bindings for the service account
resource "google_project_iam_member" "app_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app.email}"
}

resource "google_project_iam_member" "app_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.app.email}"
}

# Outputs
output "load_balancer_ip" {
  description = "Load balancer IP address"
  value       = google_compute_global_address.main.address
}

output "sql_connection" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.main.connection_name
}

output "redis_host" {
  description = "Redis instance host"
  value       = google_redis_instance.main.host
}

output "gke_cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.main.name
}

output "gke_cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.main.endpoint
  sensitive   = true
}

output "storage_bucket_backups" {
  description = "Storage bucket for backups"
  value       = google_storage_bucket.backups.name
}

output "storage_bucket_uploads" {
  description = "Storage bucket for uploads"
  value       = google_storage_bucket.uploads.name
}