# Terraform configuration for Shiojiri Rainbow Seeker
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "shiojiri-rainbow-seeker"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "asia-northeast1"
}

variable "gcp_project" {
  description = "GCP project ID"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "shiojiri-rainbow-seeker.com"
}

# AWS Provider
provider "aws" {
  region = var.region
}

# GCP Provider
provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# AWS Resources
module "aws_infrastructure" {
  source = "./modules/aws"
  
  name_prefix = local.name_prefix
  environment = var.environment
  region      = var.region
  domain_name = var.domain_name
  
  tags = local.common_tags
}

# GCP Resources
module "gcp_infrastructure" {
  source = "./modules/gcp"
  
  name_prefix = local.name_prefix
  environment = var.environment
  project_id  = var.gcp_project
  region      = var.gcp_region
  
  labels = local.common_tags
}

# Outputs
output "aws_load_balancer_dns" {
  description = "AWS Load Balancer DNS name"
  value       = module.aws_infrastructure.load_balancer_dns
}

output "gcp_load_balancer_ip" {
  description = "GCP Load Balancer IP address"
  value       = module.gcp_infrastructure.load_balancer_ip
}

output "aws_rds_endpoint" {
  description = "AWS RDS endpoint"
  value       = module.aws_infrastructure.rds_endpoint
  sensitive   = true
}

output "gcp_sql_connection" {
  description = "GCP SQL connection name"
  value       = module.gcp_infrastructure.sql_connection
  sensitive   = true
}