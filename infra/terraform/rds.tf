# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-subnet"
    Environment = var.environment
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-sg"
    Environment = var.environment
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-${var.environment}-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro" # 프로덕션에서는 더 큰 인스턴스 사용

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # 백업 설정
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  # Multi-AZ (프로덕션에서 권장)
  multi_az = false # 스테이징에서는 비용 절감을 위해 false

  # 삭제 보호
  deletion_protection       = false # 스테이징에서는 false
  skip_final_snapshot       = true  # 스테이징에서는 true
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot"

  # 성능 인사이트
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # 자동 마이너 버전 업그레이드
  auto_minor_version_upgrade = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-db"
    Environment = var.environment
    Project     = var.project_name
  }
}

# RDS 읽기 전용 replica (프로덕션에서 권장)
# resource "aws_db_instance" "replica" {
#   identifier             = "${var.project_name}-${var.environment}-db-replica"
#   replicate_source_db    = aws_db_instance.main.identifier
#   instance_class         = "db.t3.micro"
#   publicly_accessible    = false
#   skip_final_snapshot    = true
#   vpc_security_group_ids = [aws_security_group.rds.id]
#
#   tags = {
#     Name        = "${var.project_name}-${var.environment}-db-replica"
#     Environment = var.environment
#   }
# }
