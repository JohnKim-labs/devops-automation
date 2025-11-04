# 배포 체크리스트

실제 배포 전 반드시 확인해야 할 항목들입니다.

## 배포 전 체크리스트

### ✅ 1. AWS 계정 준비
- [ ] AWS 계정 생성 완료
- [ ] IAM 사용자 생성 (`drox-devops-deployer`)
- [ ] AdministratorAccess 권한 부여
- [ ] Access Key 발급 및 안전하게 저장
- [ ] AWS CLI 설치 및 자격 증명 설정 (`aws configure`)
- [ ] 자격 증명 테스트 (`aws sts get-caller-identity`)

### ✅ 2. Terraform 백엔드 설정
- [ ] S3 버킷 생성 (고유한 이름 사용)
  - 버킷 이름: `devops-automation-tfstate-<고유값>`
- [ ] S3 버전 관리 활성화
- [ ] S3 암호화 활성화
- [ ] DynamoDB 테이블 생성 (`devops-automation-tfstate-lock`)
- [ ] `infra/terraform/backend.tf`에 버킷 이름 업데이트

### ✅ 3. 환경 변수 및 시크릿 생성
- [ ] `infra/terraform/terraform.tfvars` 파일 생성
- [ ] 안전한 DB 비밀번호 생성 (32자 이상)
- [ ] API 키 생성 (64자 hex)
- [ ] 알람 이메일 주소 설정
- [ ] `.gitignore`에 `terraform.tfvars` 추가 확인

**terraform.tfvars 필수 항목:**
```hcl
- [ ] environment
- [ ] project_name
- [ ] db_username
- [ ] db_password
- [ ] admin_api_key
- [ ] alarm_email
```

**선택사항 (Slack/Notion 연동):**
```hcl
- [ ] slack_webhook_url
- [ ] notion_token
- [ ] notion_database_id
```

### ✅ 4. Terraform 인프라 배포
- [ ] `terraform init` 실행 성공
- [ ] `terraform plan` 검토 완료
- [ ] 생성될 리소스 확인 (약 40+ 리소스)
- [ ] `terraform apply` 실행 완료
- [ ] 모든 출력값 저장:
  - [ ] `alb_dns_name`
  - [ ] `cloudfront_domain_name`
  - [ ] `ecr_repository_url`
  - [ ] `rds_endpoint`
  - [ ] `s3_bucket_name`
  - [ ] `ecs_cluster_name`
  - [ ] `ecs_service_name`

### ✅ 5. GitHub Repository 설정
- [ ] GitHub에 새 Repository 생성
- [ ] 로컬 코드를 GitHub에 푸시
- [ ] GitHub Actions Secrets 설정:

**필수 Secrets:**
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `DB_PASSWORD`
- [ ] `ADMIN_API_KEY`
- [ ] `S3_BUCKET_NAME`
- [ ] `CLOUDFRONT_DISTRIBUTION_ID`
- [ ] `VITE_API_URL`

**선택사항 Secrets:**
- [ ] `SLACK_WEBHOOK_URL`
- [ ] `NOTION_TOKEN`
- [ ] `NOTION_DATABASE_ID`

- [ ] CloudFront Distribution ID 확인 및 저장

### ✅ 6. 애플리케이션 배포

**백엔드:**
- [ ] ECR 로그인 성공
- [ ] Docker 이미지 빌드 성공
- [ ] ECR에 이미지 푸시 성공
- [ ] ECS 서비스 강제 배포 실행
- [ ] ECS 태스크 RUNNING 상태 확인

**프론트엔드:**
- [ ] `VITE_API_URL` 환경 변수 설정
- [ ] 의존성 설치 (`npm ci`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] S3에 파일 업로드 완료
- [ ] CloudFront 캐시 무효화 완료

### ✅ 7. 데이터베이스 마이그레이션
- [ ] ECS 태스크 ID 확인
- [ ] ECS Exec으로 컨테이너 접속 성공
- [ ] `npx prisma migrate deploy` 실행 성공
- [ ] 마이그레이션 상태 확인

### ✅ 8. 배포 확인

**백엔드 확인:**
- [ ] 헬스체크 API 응답 확인 (`/api/health`)
- [ ] 200 OK 응답 수신
- [ ] CloudWatch 로그 확인 (에러 없음)

**프론트엔드 확인:**
- [ ] CloudFront URL 접속 성공
- [ ] 대시보드 로딩 확인
- [ ] API 연동 확인

**인프라 확인:**
- [ ] ECS 서비스 ACTIVE 상태
- [ ] ALB Target Health 확인 (healthy)
- [ ] RDS 인스턴스 available 상태
- [ ] CloudWatch 알람 생성 확인 (10개)

### ✅ 9. 기능 테스트
- [ ] 대시보드에서 새 백업 작업 생성 가능
- [ ] 백업 작업 수동 실행 성공
- [ ] 백업 히스토리 조회 가능
- [ ] 무결성 검사 실행 가능
- [ ] Slack 알림 수신 (설정한 경우)
- [ ] Notion 로그 기록 (설정한 경우)

### ✅ 10. 모니터링 설정
- [ ] CloudWatch 대시보드 확인
- [ ] 알람 이메일 구독 확인
- [ ] SNS 토픽 확인
- [ ] 커스텀 메트릭 확인 (DROX/Backup)

---

## 배포 후 작업

### 즉시 수행
- [ ] 실제 프로덕션 리소스에 대한 백업 작업 생성
  - [ ] EBS 볼륨 백업 (매일 02:00)
  - [ ] RDS 백업 (매일 03:00)
  - [ ] S3 동기화 (필요 시)
- [ ] 백업 스케줄 검증
- [ ] 첫 백업 실행 및 결과 확인

### 1주일 내
- [ ] 백업 성공률 모니터링
- [ ] CloudWatch 알람 테스트
- [ ] 무결성 검사 자동화 설정
- [ ] 주간 리포트 검토

### 1개월 내
- [ ] 비용 분석 및 최적화
- [ ] 백업 보관 정책 설정
- [ ] 복원 테스트 수행
- [ ] 팀 교육 및 문서화

---

## 보안 체크리스트

### ✅ 필수 보안 조치
- [ ] `terraform.tfvars` 파일 절대 커밋 금지
- [ ] AWS Access Key 안전하게 보관
- [ ] GitHub Secrets에만 민감 정보 저장
- [ ] RDS는 Private Subnet에만 배치
- [ ] Security Group 최소 권한 원칙 적용
- [ ] IAM 역할 최소 권한 검토

### ✅ 권장 보안 조치
- [ ] MFA 활성화 (AWS 루트 계정 + IAM)
- [ ] CloudTrail 활성화
- [ ] AWS Config 활성화
- [ ] GuardDuty 활성화
- [ ] VPC Flow Logs 활성화
- [ ] S3 버킷 퍼블릭 접근 차단 확인

---

## 비용 최적화 체크리스트

### ✅ 즉시 적용 가능
- [ ] 개발 환경 야간/주말 자동 종료 (선택사항)
- [ ] 오래된 EBS 스냅샷 자동 삭제 정책
- [ ] CloudWatch Logs 보관 기간 설정 (7일)
- [ ] S3 라이프사이클 정책 설정

### ✅ 장기 최적화
- [ ] Reserved Instance 검토 (RDS, ECS)
- [ ] Savings Plan 검토
- [ ] 불필요한 리소스 정리
- [ ] Cost Explorer 정기 확인

---

## 롤백 계획

### 애플리케이션 롤백
```bash
# 이전 Docker 이미지로 롤백
aws ecs update-service \
  --cluster drox-devops-staging-cluster \
  --service drox-devops-staging-backend \
  --task-definition <이전_task_definition_ARN>
```

### 인프라 롤백
```bash
# Terraform 상태 백업
terraform state pull > backup.tfstate

# 특정 버전으로 롤백
terraform state push <이전_상태_파일>

# 또는 리소스 재생성
terraform destroy
terraform apply
```

---

## 긴급 연락처

**AWS 지원:**
- AWS 콘솔: https://console.aws.amazon.com
- AWS Support (프리미엄 플랜 필요)

**프로젝트 담당자:**
- GitHub Issues: https://github.com/<username>/devops-automation/issues
- Email: your-team@example.com

---

## 완료 확인

모든 체크리스트를 완료했다면:

✅ **배포 완료!**

이제 다음 단계로 진행하세요:
1. [QUICKSTART.md](./QUICKSTART.md) - Step 9: 운영 시작
2. 실제 백업 작업 생성 및 모니터링
3. 정기 점검 일정 수립

---

**배포 날짜:** _______________
**배포자:** _______________
**환경:** [ ] Staging [ ] Production
**배포 소요 시간:** _______________
