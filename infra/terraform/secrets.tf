# Secrets Manager for application secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.project_name}-${var.environment}-app-secrets"
  description             = "Application secrets for DROX DevOps Dashboard"
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-app-secrets"
    Environment = var.environment
  }
}

# Store secrets
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    DATABASE_URL         = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}"
    ADMIN_API_KEY        = var.admin_api_key
    SLACK_WEBHOOK_URL    = var.slack_webhook_url
    NOTION_TOKEN         = var.notion_token
    NOTION_DATABASE_ID   = var.notion_database_id
    AWS_REGION           = var.aws_region
    NODE_ENV             = var.environment == "production" ? "production" : "development"
  })
}
