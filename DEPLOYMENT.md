# DROX DevOps Automation - 배포 가이드

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [AWS 인프라 배포](#aws-인프라-배포)
3. [GitHub Actions 설정](#github-actions-설정)
4. [애플리케이션 배포](#애플리케이션-배포)
5. [배포 확인](#배포-확인)
6. [트러블슈팅](#트러블슈팅)

---

## 사전 요구사항

### 필수 도구 설치

- **AWS CLI**: [설치 가이드](https://aws.amazon.com/cli/)
- **Terraform**: v1.6.0 이상 [설치 가이드](https://www.terraform.io/downloads)
- **Docker**: [설치 가이드](https://docs.docker.com/get-docker/)
- **Node.js**: v20 이상 [설치 가이드](https://nodejs.org/)

### AWS 계정 설정

1. AWS 계정 생성 및 로그인
2. IAM 사용자 생성 (AdministratorAccess 권한)
3. AWS CLI 자격 증명 구성:

```bash
aws configure
# AWS Access Key ID: <YOUR_ACCESS_KEY>
# AWS Secret Access Key: <YOUR_SECRET_KEY>
# Default region name: ap-northeast-2
# Default output format: json
```

---

## AWS 인프라 배포

### 1. Terraform State 백엔드 생성

Terraform 상태를 저장할 S3 버킷과 DynamoDB 테이블을 생성합니다:

```bash
# S3 버킷 생성
aws s3api create-bucket \
  --bucket devops-automation-tfstate \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

# 버전 관리 활성화
aws s3api put-bucket-versioning \
  --bucket devops-automation-tfstate \
  --versioning-configuration Status=Enabled

# 암호화 설정
aws s3api put-bucket-encryption \
  --bucket devops-automation-tfstate \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# DynamoDB 잠금 테이블 생성
aws dynamodb create-table \
  --table-name devops-automation-tfstate-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2
```

### 2. Terraform 변수 설정

`infra/terraform/terraform.tfvars` 파일을 생성합니다:

```hcl
# 기본 설정
environment  = "staging"
project_name = "drox-devops"
aws_region   = "ap-northeast-2"

# 데이터베이스
db_username = "drox_admin"
db_password = "<SECURE_PASSWORD>"  # 안전한 비밀번호로 변경
db_name     = "drox_devops"

# ECS 리소스
backend_cpu    = 256
backend_memory = 512

# 시크릿
admin_api_key      = "<RANDOM_API_KEY>"  # 랜덤 API 키 생성
slack_webhook_url  = "<SLACK_WEBHOOK_URL>"  # 선택사항
notion_token       = "<NOTION_TOKEN>"  # 선택사항
notion_database_id = "<NOTION_DATABASE_ID>"  # 선택사항

# 알람
alarm_email = "your-email@example.com"
```

**안전한 비밀번호 생성:**

```bash
# 랜덤 비밀번호 생성
openssl rand -base64 32

# 랜덤 API 키 생성
openssl rand -hex 32
```

### 3. Terraform 초기화 및 배포

```bash
cd infra/terraform

# Terraform 초기화
terraform init

# 실행 계획 확인
terraform plan

# 인프라 배포
terraform apply
```

배포 완료 후 출력된 값들을 메모해 둡니다:

```
alb_dns_name = "xxxx.ap-northeast-2.elb.amazonaws.com"
cloudfront_domain_name = "xxxx.cloudfront.net"
ecr_repository_url = "xxxx.dkr.ecr.ap-northeast-2.amazonaws.com/drox-devops-backend"
rds_endpoint = "<SENSITIVE>"
```

---

## GitHub Actions 설정

### 1. GitHub Repository Secrets 설정

Repository Settings > Secrets and variables > Actions에서 다음 시크릿을 추가합니다:

**필수 시크릿:**

- `AWS_ACCESS_KEY_ID`: AWS IAM 사용자 Access Key
- `AWS_SECRET_ACCESS_KEY`: AWS IAM 사용자 Secret Key
- `DB_PASSWORD`: RDS 데이터베이스 비밀번호
- `ADMIN_API_KEY`: 어드민 API 키
- `S3_BUCKET_NAME`: 프론트엔드 S3 버킷 이름 (terraform output 참조)
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFront Distribution ID (AWS 콘솔에서 확인)
- `VITE_API_URL`: 백엔드 API URL (예: `https://<ALB_DNS_NAME>/api`)

**선택사항 시크릿:**

- `SLACK_WEBHOOK_URL`: Slack 웹훅 URL
- `NOTION_TOKEN`: Notion API 토큰
- `NOTION_DATABASE_ID`: Notion 데이터베이스 ID

### 2. GitHub Environments 설정

Repository Settings > Environments에서 환경을 생성합니다:

- `staging`: staging 브랜치용
- `production`: main 브랜치용 (선택사항)

각 환경에 동일한 시크릿을 설정합니다.

---

## 애플리케이션 배포

### 방법 1: GitHub Actions를 통한 자동 배포 (권장)

1. 코드 변경 후 커밋:

```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
```

2. GitHub Actions 워크플로우가 자동으로 실행됩니다:
   - 백엔드 Docker 이미지 빌드 및 ECR 푸시
   - ECS 서비스 업데이트
   - 프론트엔드 빌드 및 S3 배포
   - CloudFront 캐시 무효화

3. Actions 탭에서 배포 진행 상황을 확인합니다.

### 방법 2: 수동 배포

#### 백엔드 배포

```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin <ECR_REPOSITORY_URL>

# Docker 이미지 빌드
cd server
docker build -t drox-devops-backend:latest .

# 이미지 태그 및 푸시
docker tag drox-devops-backend:latest <ECR_REPOSITORY_URL>:latest
docker push <ECR_REPOSITORY_URL>:latest

# ECS 서비스 업데이트
aws ecs update-service \
  --cluster drox-devops-staging-cluster \
  --service drox-devops-staging-backend \
  --force-new-deployment \
  --region ap-northeast-2
```

#### 프론트엔드 배포

```bash
cd src

# 환경 변수 설정
export VITE_API_URL=https://<ALB_DNS_NAME>/api

# 의존성 설치 및 빌드
npm ci
npm run build

# S3 업로드
aws s3 sync dist/ s3://<S3_BUCKET_NAME> --delete

# CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id <CLOUDFRONT_DISTRIBUTION_ID> \
  --paths "/*"
```

---

## 배포 확인

### 1. 백엔드 헬스 체크

```bash
# ALB를 통한 헬스 체크
curl https://<ALB_DNS_NAME>/api/health

# 예상 응답:
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 2. 프론트엔드 접근

브라우저에서 CloudFront 도메인으로 접근:

```
https://<CLOUDFRONT_DOMAIN_NAME>
```

### 3. 데이터베이스 마이그레이션

ECS 태스크에 접속하여 Prisma 마이그레이션 실행:

```bash
# ECS 태스크 ID 조회
aws ecs list-tasks \
  --cluster drox-devops-staging-cluster \
  --service-name drox-devops-staging-backend \
  --region ap-northeast-2

# ECS Exec 활성화 (이미 설정되어 있음)
# 태스크에 접속
aws ecs execute-command \
  --cluster drox-devops-staging-cluster \
  --task <TASK_ID> \
  --container backend \
  --interactive \
  --command "/bin/sh"

# 컨테이너 내부에서 마이그레이션 실행
npx prisma migrate deploy
```

### 4. CloudWatch 모니터링

AWS 콘솔 > CloudWatch > Dashboards에서 메트릭 확인:

- ECS CPU/Memory 사용률
- RDS 성능 지표
- ALB 요청 수 및 응답 시간
- 커스텀 백업 메트릭

### 5. CloudWatch Alarms

AWS 콘솔 > CloudWatch > Alarms에서 알람 상태 확인:

- ECS CPU/Memory 임계값 초과
- RDS CPU/Storage 경고
- ALB 5xx 에러 발생
- 백업 실패 알림

---

## 트러블슈팅

### 문제 1: ECS 태스크가 시작되지 않음

**증상:** ECS 서비스가 계속 새 태스크를 시작하지만 즉시 중지됨

**해결 방법:**

1. CloudWatch Logs 확인:

```bash
aws logs tail /ecs/drox-devops-staging-backend --follow
```

2. 일반적인 원인:
   - Secrets Manager 시크릿이 올바르게 설정되지 않음
   - DATABASE_URL 형식 오류
   - 컨테이너 헬스 체크 실패

3. 시크릿 확인:

```bash
aws secretsmanager get-secret-value \
  --secret-id drox-devops-staging-app-secrets \
  --region ap-northeast-2
```

### 문제 2: 데이터베이스 연결 실패

**증상:** `ECONNREFUSED` 또는 `Connection timeout` 에러

**해결 방법:**

1. RDS 엔드포인트 확인:

```bash
terraform output rds_endpoint
```

2. Security Group 규칙 확인:
   - ECS 태스크 Security Group이 RDS Security Group에 5432 포트로 접근 가능한지 확인

3. DATABASE_URL 형식 확인:

```
postgresql://drox_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/drox_devops?schema=public
```

### 문제 3: 프론트엔드에서 API 호출 실패

**증상:** CORS 에러 또는 네트워크 에러

**해결 방법:**

1. 환경 변수 확인:
   - `VITE_API_URL`이 올바른 ALB DNS 이름을 가리키는지 확인

2. 백엔드 CORS 설정 확인:
   - `server/src/main.ts`에서 프론트엔드 도메인이 허용되는지 확인

3. ALB Security Group 확인:
   - 80/443 포트가 열려있는지 확인

### 문제 4: Terraform Apply 실패

**증상:** Terraform 리소스 생성 중 에러 발생

**해결 방법:**

1. 에러 메시지 확인:

```bash
terraform apply 2>&1 | tee terraform.log
```

2. 일반적인 원인:
   - 리소스 이름 중복 (S3 버킷, ECR 리포지토리 등)
   - IAM 권한 부족
   - 리전별 리소스 한계 초과

3. 상태 확인 및 재시도:

```bash
terraform state list
terraform plan
terraform apply
```

### 문제 5: Docker 이미지 빌드 실패

**증상:** `docker build` 명령 실패

**해결 방법:**

1. Prisma 스키마 확인:

```bash
cd server
npx prisma validate
```

2. 빌드 로그 확인:

```bash
docker build --progress=plain -t drox-devops-backend:latest .
```

3. 캐시 클리어 후 재빌드:

```bash
docker build --no-cache -t drox-devops-backend:latest .
```

---

## 유용한 명령어

### Terraform

```bash
# 상태 확인
terraform state list

# 특정 리소스 상태 확인
terraform state show aws_ecs_service.backend

# 리소스 재생성
terraform taint aws_ecs_service.backend
terraform apply

# 특정 리소스만 적용
terraform apply -target=aws_ecs_service.backend
```

### AWS CLI

```bash
# ECS 서비스 상태 확인
aws ecs describe-services \
  --cluster drox-devops-staging-cluster \
  --services drox-devops-staging-backend

# 로그 실시간 확인
aws logs tail /ecs/drox-devops-staging-backend --follow

# ECR 이미지 목록
aws ecr list-images \
  --repository-name drox-devops-backend

# CloudFront 배포 상태
aws cloudfront get-distribution \
  --id <DISTRIBUTION_ID>
```

### Docker

```bash
# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 로그 확인
docker logs <CONTAINER_ID>

# 컨테이너 접속
docker exec -it <CONTAINER_ID> /bin/sh

# 이미지 정리
docker image prune -a
```

---

## 추가 리소스

- [Terraform AWS Provider 문서](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS ECS 문서](https://docs.aws.amazon.com/ecs/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [NestJS 문서](https://docs.nestjs.com/)
- [Prisma 문서](https://www.prisma.io/docs)

---

## 지원

문제가 발생하면 다음을 확인하세요:

1. CloudWatch Logs에서 애플리케이션 로그 확인
2. GitHub Issues에 문제 리포트
3. Slack 채널에서 팀원과 협업
