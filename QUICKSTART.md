# 빠른 배포 가이드

이 문서는 DROX DevOps Automation을 처음부터 AWS에 배포하는 전체 과정을 안내합니다.

## 전체 배포 흐름

```
1. AWS 계정 설정 (10분)
2. Terraform 상태 백엔드 생성 (5분)
3. 환경 변수 및 시크릿 설정 (10분)
4. Terraform으로 인프라 배포 (15분)
5. GitHub Actions 설정 (5분)
6. 애플리케이션 배포 (10분)
7. 데이터베이스 마이그레이션 (5분)
8. 배포 확인 및 테스트 (10분)
---
총 소요 시간: 약 70분
```

---

## Step 1: AWS 계정 설정

### 1.1 AWS CLI 설치

```bash
# Windows (PowerShell - 관리자 권한)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# 설치 확인
aws --version
```

### 1.2 IAM 사용자 생성

1. AWS Console 로그인
2. IAM → Users → Add users
3. 사용자 이름: `drox-devops-deployer`
4. 권한 설정: `AdministratorAccess` (프로덕션에서는 최소 권한 원칙 적용)
5. Access Key 생성 → **안전하게 저장**

### 1.3 AWS CLI 자격 증명 설정

```bash
aws configure
# AWS Access Key ID: <발급받은 Access Key>
# AWS Secret Access Key: <발급받은 Secret Key>
# Default region name: ap-northeast-2
# Default output format: json
```

**확인:**
```bash
aws sts get-caller-identity
```

---

## Step 2: Terraform 상태 백엔드 생성

Terraform 상태를 안전하게 저장할 S3 버킷과 잠금용 DynamoDB 테이블을 생성합니다.

### 2.1 S3 버킷 생성

```bash
# S3 버킷 생성
aws s3api create-bucket \
  --bucket devops-automation-tfstate-<고유값> \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

# 예: devops-automation-tfstate-20241104
```

> **중요**: S3 버킷 이름은 전 세계에서 고유해야 합니다. 날짜나 회사명을 추가하세요.

### 2.2 버전 관리 활성화

```bash
aws s3api put-bucket-versioning \
  --bucket devops-automation-tfstate-<고유값> \
  --versioning-configuration Status=Enabled
```

### 2.3 암호화 설정

```bash
aws s3api put-bucket-encryption \
  --bucket devops-automation-tfstate-<고유값> \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 2.4 DynamoDB 테이블 생성

```bash
aws dynamodb create-table \
  --table-name devops-automation-tfstate-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2
```

### 2.5 Terraform 백엔드 설정 업데이트

`infra/terraform/backend.tf` 파일에서 버킷 이름을 업데이트하세요:

```hcl
terraform {
  backend "s3" {
    bucket         = "devops-automation-tfstate-<고유값>"  # 여기 수정
    key            = "terraform.tfstate"
    region         = "ap-northeast-2"
    encrypt        = true
    dynamodb_table = "devops-automation-tfstate-lock"
  }
}
```

---

## Step 3: 환경 변수 및 시크릿 설정

### 3.1 Terraform 변수 파일 생성

`infra/terraform/terraform.tfvars` 파일을 생성합니다:

```bash
cd infra/terraform
```

**terraform.tfvars 내용:**

```hcl
# 기본 설정
environment  = "staging"
project_name = "drox-devops"
aws_region   = "ap-northeast-2"

# 데이터베이스 설정
db_username = "drox_admin"
db_password = "<생성한_안전한_비밀번호>"
db_name     = "drox_devops"

# ECS 리소스 (스테이징 환경)
backend_cpu    = 256
backend_memory = 512

# 시크릿 및 API 키
admin_api_key = "<생성한_API_키>"

# 알람 설정
alarm_email = "your-email@example.com"

# 선택사항: Slack 통합
# slack_webhook_url = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# 선택사항: Notion 통합
# notion_token       = "secret_your_notion_token"
# notion_database_id = "your_notion_database_id"
```

### 3.2 안전한 비밀번호 생성

**Windows PowerShell:**
```powershell
# 32자 랜덤 비밀번호
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# API 키 (64자 hex)
$bytes = New-Object byte[] 32
(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
```

**Git Bash (Windows):**
```bash
# 비밀번호
openssl rand -base64 32

# API 키
openssl rand -hex 32
```

### 3.3 .gitignore 확인

`terraform.tfvars`가 `.gitignore`에 포함되어 있는지 확인:

```bash
# infra/terraform/.gitignore에 추가
echo "terraform.tfvars" >> infra/terraform/.gitignore
echo "*.tfvars" >> infra/terraform/.gitignore
```

---

## Step 4: Terraform 인프라 배포

### 4.1 Terraform 초기화

```bash
cd infra/terraform

terraform init
```

**예상 출력:**
```
Initializing the backend...
Successfully configured the backend "s3"!
```

### 4.2 실행 계획 확인

```bash
terraform plan
```

리소스 생성 계획을 검토하세요:
- VPC, 서브넷, 라우팅 테이블
- RDS PostgreSQL 인스턴스
- ECS 클러스터 및 서비스
- ALB, Target Group
- S3, CloudFront
- IAM 역할
- CloudWatch 알람

### 4.3 인프라 배포

```bash
terraform apply
```

`yes`를 입력하여 배포를 시작합니다.

**배포 소요 시간:** 약 10-15분

### 4.4 출력값 저장

배포가 완료되면 다음 출력값을 메모장에 복사하세요:

```bash
terraform output
```

**중요한 출력값:**
- `alb_dns_name`: 백엔드 API 주소
- `cloudfront_domain_name`: 프론트엔드 주소
- `ecr_repository_url`: Docker 이미지 레지스트리
- `rds_endpoint`: 데이터베이스 엔드포인트 (민감 정보)
- `s3_bucket_name`: 프론트엔드 S3 버킷

**RDS 엔드포인트 확인:**
```bash
terraform output -raw rds_endpoint
```

---

## Step 5: GitHub Repository 설정

### 5.1 GitHub Repository 생성

1. GitHub에 새 Repository 생성
2. 로컬 코드를 푸시:

```bash
cd d:/DevProjects/devops-automation

git init
git add .
git commit -m "Initial commit: DROX DevOps Automation"
git branch -M main
git remote add origin https://github.com/<username>/devops-automation.git
git push -u origin main
```

### 5.2 GitHub Secrets 설정

Repository → Settings → Secrets and variables → Actions → New repository secret

**필수 시크릿:**

| Secret Name | Value | 설명 |
|------------|-------|------|
| `AWS_ACCESS_KEY_ID` | `AKIAXXXXXXXXXXXXXXXX` | AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | `xxxxxxxxxxxxxxxxxxxx` | AWS Secret Key |
| `DB_PASSWORD` | `<terraform.tfvars의 db_password>` | RDS 비밀번호 |
| `ADMIN_API_KEY` | `<terraform.tfvars의 admin_api_key>` | API 키 |
| `S3_BUCKET_NAME` | `<terraform output s3_bucket_name>` | S3 버킷 이름 |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E1XXXXXXXXXX` | CloudFront ID (AWS Console에서 확인) |
| `VITE_API_URL` | `http://<alb_dns_name>/api` | 백엔드 API URL |

**선택사항 시크릿:**

| Secret Name | Value | 설명 |
|------------|-------|------|
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/...` | Slack 웹훅 |
| `NOTION_TOKEN` | `secret_xxx` | Notion API 토큰 |
| `NOTION_DATABASE_ID` | `xxx` | Notion DB ID |

### 5.3 CloudFront Distribution ID 확인

```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='drox-devops-staging-frontend-cdn'].Id" \
  --output text
```

또는 AWS Console → CloudFront → Distributions에서 확인

### 5.4 GitHub Environments 생성 (선택사항)

Repository → Settings → Environments → New environment

- 환경 이름: `staging`
- 모든 시크릿을 환경에 추가

---

## Step 6: 애플리케이션 배포

### 6.1 수동 배포 (첫 배포)

**백엔드 배포:**

```bash
# ECR 로그인
$ECR_URL = "<terraform output ecr_repository_url>"
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin $ECR_URL

# Docker 이미지 빌드
cd server
docker build -t drox-devops-backend:latest .

# 이미지 태그 및 푸시
docker tag drox-devops-backend:latest ${ECR_URL}:latest
docker push ${ECR_URL}:latest

# ECS 서비스 강제 배포
aws ecs update-service `
  --cluster drox-devops-staging-cluster `
  --service drox-devops-staging-backend `
  --force-new-deployment `
  --region ap-northeast-2
```

**프론트엔드 배포:**

```bash
cd ..

# 환경 변수 설정
$env:VITE_API_URL = "http://<ALB_DNS_NAME>/api"

# 빌드
npm ci
npm run build

# S3 업로드
aws s3 sync dist/ s3://<S3_BUCKET_NAME> --delete

# CloudFront 캐시 무효화
aws cloudfront create-invalidation `
  --distribution-id <CLOUDFRONT_DISTRIBUTION_ID> `
  --paths "/*"
```

### 6.2 자동 배포 (GitHub Actions)

코드를 푸시하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
```

GitHub Actions 탭에서 배포 진행 상황을 확인하세요.

---

## Step 7: 데이터베이스 마이그레이션

### 7.1 ECS 태스크 확인

```bash
# 실행 중인 태스크 ID 확인
aws ecs list-tasks `
  --cluster drox-devops-staging-cluster `
  --service-name drox-devops-staging-backend `
  --region ap-northeast-2

# 출력 예: arn:aws:ecs:ap-northeast-2:123456789012:task/drox-devops-staging-cluster/abc123...
```

### 7.2 ECS Exec 활성화 확인

ECS 서비스에 이미 `enableExecuteCommand: true`가 설정되어 있습니다.

### 7.3 태스크에 접속하여 마이그레이션 실행

```bash
# 태스크 ID를 변수에 저장 (위에서 확인한 전체 ARN 중 마지막 부분)
$TASK_ID = "abc123..."

# 태스크 접속
aws ecs execute-command `
  --cluster drox-devops-staging-cluster `
  --task $TASK_ID `
  --container backend `
  --interactive `
  --command "/bin/sh"
```

**컨테이너 내부에서:**

```bash
# Prisma 마이그레이션 실행
npx prisma migrate deploy

# 마이그레이션 상태 확인
npx prisma migrate status

# 종료
exit
```

---

## Step 8: 배포 확인 및 테스트

### 8.1 백엔드 헬스 체크

```bash
# PowerShell
$ALB_DNS = "<terraform output alb_dns_name>"
Invoke-WebRequest -Uri "http://$ALB_DNS/api/health"

# 또는 브라우저에서
# http://<ALB_DNS_NAME>/api/health
```

**예상 응답:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-04T12:00:00.000Z"
}
```

### 8.2 프론트엔드 접근

브라우저에서 CloudFront 도메인으로 접근:

```
https://<CLOUDFRONT_DOMAIN_NAME>
```

### 8.3 첫 백업 작업 생성

1. 프론트엔드 대시보드에서 "새 백업 작업" 클릭
2. 테스트 백업 작업 생성:
   - Resource Type: EBS
   - Resource ID: vol-test (실제 볼륨 ID 사용)
   - Schedule: `*/30 * * * *` (30분마다)
   - Enabled: true

3. "수동 실행" 버튼으로 즉시 테스트

### 8.4 CloudWatch 로그 확인

```bash
# 최근 로그 확인
aws logs tail /ecs/drox-devops-staging-backend --follow
```

### 8.5 CloudWatch 알람 확인

AWS Console → CloudWatch → Alarms

생성된 알람 목록:
- ✅ ECS CPU/Memory 알람
- ✅ RDS CPU/Storage 알람
- ✅ ALB 헬스체크 알람
- ✅ 백업 실패 알람

### 8.6 Slack 알림 테스트 (선택사항)

Slack 웹훅을 설정한 경우, 백업 작업 실행 시 알림이 전송됩니다.

---

## Step 9: 운영 시작

### 9.1 실제 백업 작업 생성

프로덕션 리소스에 대한 백업 작업을 생성하세요:

**EBS 볼륨 백업:**
```json
{
  "resourceType": "EBS",
  "resourceId": "vol-0a1b2c3d4e5f6g7h8",
  "schedule": "0 2 * * *",
  "enabled": true
}
```

**RDS 백업:**
```json
{
  "resourceType": "RDS",
  "resourceId": "your-db-instance-name",
  "schedule": "0 3 * * *",
  "enabled": true
}
```

**S3 동기화:**
```json
{
  "resourceType": "S3",
  "resourceId": "source-bucket:target-bucket",
  "schedule": "0 4 * * *",
  "enabled": true
}
```

### 9.2 모니터링 설정

- CloudWatch 대시보드에서 메트릭 확인
- 알람 이메일 구독 확인
- Notion 백업 로그 확인

### 9.3 정기 점검 일정

- **일일**: 백업 실패 알람 확인
- **주간**: 백업 통계 리포트 검토
- **월간**: 무결성 검사 결과 분석

---

## 트러블슈팅

### 문제: ECS 태스크가 시작되지 않음

**해결:**
```bash
# 로그 확인
aws logs tail /ecs/drox-devops-staging-backend --follow

# 태스크 상태 확인
aws ecs describe-tasks \
  --cluster drox-devops-staging-cluster \
  --tasks <TASK_ARN>
```

**일반적 원인:**
- Secrets Manager 시크릿 오류 → terraform.tfvars 확인
- DATABASE_URL 형식 오류 → RDS 엔드포인트 확인
- ECR 이미지 없음 → Docker 이미지 빌드 및 푸시 확인

### 문제: 프론트엔드에서 API 호출 실패

**해결:**
1. `VITE_API_URL`이 올바른지 확인
2. ALB Security Group에서 80/443 포트 오픈 확인
3. 백엔드 CORS 설정 확인

### 문제: Terraform apply 실패

**해결:**
```bash
# 상태 확인
terraform state list

# 특정 리소스 재생성
terraform taint <resource_name>
terraform apply
```

---

## 비용 예상

**스테이징 환경 (월간):**

| 서비스 | 사양 | 예상 비용 |
|--------|------|-----------|
| ECS Fargate | 0.25 vCPU, 0.5GB | ~$15 |
| RDS db.t3.micro | PostgreSQL | ~$20 |
| ALB | 기본 | ~$20 |
| S3 + CloudFront | 소규모 트래픽 | ~$5 |
| NAT Gateway | 1개 | ~$35 |
| CloudWatch | 로그 + 메트릭 | ~$5 |
| **총 예상 비용** | | **~$100/월** |

> 비용 절감 팁: 개발 환경은 업무 시간에만 운영하도록 스케줄링

---

## 다음 단계

✅ 인프라 배포 완료
✅ 애플리케이션 배포 완료
✅ 모니터링 설정 완료

**이제 다음을 할 수 있습니다:**

1. 실제 프로덕션 리소스 백업 시작
2. 백업 스케줄 최적화
3. 무결성 검사 자동화 설정
4. 팀원과 대시보드 공유

---

## 지원

문제가 발생하면:
1. [DEPLOYMENT.md](./DEPLOYMENT.md) 트러블슈팅 섹션 참고
2. CloudWatch 로그 확인
3. GitHub Issues에 문제 리포트

**도움이 되는 명령어:**
```bash
# 전체 상태 확인
terraform output
aws ecs describe-services --cluster drox-devops-staging-cluster --services drox-devops-staging-backend
aws logs tail /ecs/drox-devops-staging-backend --follow
```
