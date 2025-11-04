variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "drox-devops"
}

variable "db_username" {
  description = "RDS database username"
  type        = string
  default     = "drox_admin"
}

variable "db_password" {
  description = "RDS database password (use secrets manager in production)"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "RDS database name"
  type        = string
  default     = "drox_devops"
}

variable "backend_cpu" {
  description = "Backend ECS task CPU units"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Backend ECS task memory (MB)"
  type        = number
  default     = 512
}

variable "slack_webhook_url" {
  description = "Slack webhook URL"
  type        = string
  sensitive   = true
  default     = ""
}

variable "notion_token" {
  description = "Notion API token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "notion_database_id" {
  description = "Notion database ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_api_key" {
  description = "Admin API key for authentication"
  type        = string
  sensitive   = true
}

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = ""
}

