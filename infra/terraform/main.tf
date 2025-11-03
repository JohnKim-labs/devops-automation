terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# NOTE: 스테이징에 필요한 리소스는 점진적으로 추가합니다.
# 예: CloudWatch Log Group, SSM 파라미터, ECR, ECS/Fargate, RDS 등

resource "aws_cloudwatch_log_group" "app" {
  name              = "/drox/devops-dashboard"
  retention_in_days = 14
}

