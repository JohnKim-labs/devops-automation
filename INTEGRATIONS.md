# 외부 서비스 연동 가이드

Slack 및 Notion 연동을 통해 백업 알림과 로깅을 자동화하는 방법을 안내합니다.

---

## Slack 연동

Slack을 연동하면 백업 성공/실패 알림과 주간 리포트를 받을 수 있습니다.

### 1. Slack Webhook URL 생성

#### 1.1 Slack 앱 생성

1. https://api.slack.com/apps 접속
2. "Create New App" 클릭
3. "From scratch" 선택
4. App 이름: `DROX DevOps Backup`
5. Workspace 선택

#### 1.2 Incoming Webhook 활성화

1. 왼쪽 메뉴에서 "Incoming Webhooks" 클릭
2. "Activate Incoming Webhooks" 토글 ON
3. 하단 "Add New Webhook to Workspace" 클릭
4. 알림을 받을 채널 선택 (예: `#devops-backup`)
5. "Allow" 클릭

#### 1.3 Webhook URL 복사

생성된 Webhook URL을 복사합니다:
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### 2. Webhook URL 설정

**Terraform 배포 시:**

`infra/terraform/terraform.tfvars`에 추가:
```hcl
slack_webhook_url = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
```

다시 배포:
```bash
cd infra/terraform
terraform apply
```

**GitHub Actions Secrets에 추가:**

Repository → Settings → Secrets and variables → Actions

- Name: `SLACK_WEBHOOK_URL`
- Value: `https://hooks.slack.com/services/...`

### 3. 알림 테스트

백엔드 API를 통해 테스트 메시지 전송:

```bash
# PowerShell
$ALB_DNS = "<your-alb-dns-name>"
Invoke-RestMethod -Uri "http://$ALB_DNS/api/test/slack" -Method POST
```

Slack 채널에서 테스트 메시지를 확인하세요.

### 4. 알림 유형

**백업 성공 알림:**
```
✅ 백업 작업 성공

타입: EBS
리소스: vol-123456
실행 시간: 45초
Job ID: abc123...

메트릭:
스냅샷 ID: snap-789
파일 수: 1000/1000
```

**백업 실패 알림:**
```
❌ 백업 작업 실패

타입: RDS
리소스: db-instance-1
Job ID: def456...
시각: 2024-11-04 02:00:00

에러 메시지:
Database instance not found

⚠️ 즉시 확인이 필요합니다.
```

**주간 리포트:**
```
📊 1주차 백업 리포트

총 실행: 42건
성공: 40건
실패: 2건
성공률: ✅ 95.2%

평균 실행 시간: 38초

실패한 작업:
• EBS: vol-old-123
• RDS: db-test-456
```

---

## Notion 연동

Notion을 연동하면 백업 로그를 자동으로 데이터베이스에 기록할 수 있습니다.

### 1. Notion Integration 생성

#### 1.1 Notion 워크스페이스 설정

1. https://www.notion.so/my-integrations 접속
2. "+ New integration" 클릭
3. Integration 정보 입력:
   - Name: `DROX DevOps Backup`
   - Associated workspace: 작업 공간 선택
   - Type: Internal
4. "Submit" 클릭

#### 1.2 Internal Integration Token 복사

생성된 토큰을 복사합니다:
```
secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Notion 데이터베이스 생성

#### 2.1 새 데이터베이스 페이지 생성

1. Notion에서 새 페이지 생성
2. 페이지 이름: `백업 로그`
3. `/table` 입력하여 테이블 데이터베이스 생성

#### 2.2 데이터베이스 속성 설정

다음 속성을 추가하세요:

| 속성 이름 | 유형 | 설명 |
|----------|------|------|
| `Date` | Date | 백업 실행 날짜 |
| `Summary` | Text | 백업 요약 |
| `Status` | Status | ✅ 완료, ⚠️ 점검필요, ❌ 실패 |
| `Category` | Multi-select | AWS Snapshot, RDS Dump, S3 Sync, Local HDD Backup, 보안 점검 |
| `Week` | Select | 1주차, 2주차, 3주차, 4주차 |
| `System_Health` | Select | 정상, 주의, 이상 |
| `Backup_Size` | Number | 백업 크기 (GB) |
| `DB_Verified` | Checkbox | DB 검증 완료 |
| `Security_Check` | Checkbox | 보안 점검 완료 |
| `Slack_Log_Link` | URL | Slack 로그 링크 (선택사항) |
| `Report_Link` | URL | 리포트 링크 (선택사항) |
| `Improvement` | Text | 개선사항 |

#### 2.3 Status 옵션 설정

Status 속성에 다음 옵션 추가:
- `✅ 완료` (녹색)
- `⚠️ 점검필요` (노란색)
- `❌ 실패` (빨간색)

#### 2.4 Category 옵션 설정

Multi-select 속성에 다음 옵션 추가:
- `AWS Snapshot`
- `RDS Dump`
- `S3 Sync`
- `Local HDD Backup`
- `보안 점검`

#### 2.5 데이터베이스 ID 확인

1. 데이터베이스 페이지 오른쪽 상단 `...` → "Copy link to view"
2. 복사된 URL에서 ID 추출:

```
https://www.notion.so/workspace/abc123def456?v=...
                            ^^^^^^^^^^^^
                         이 부분이 Database ID
```

또는:
```
https://www.notion.so/abc123def456?v=...
                     ^^^^^^^^^^^^
```

### 3. Integration 권한 부여

1. 데이터베이스 페이지 오른쪽 상단 `...` 클릭
2. "Connections" → "Connect to" 클릭
3. 생성한 Integration (`DROX DevOps Backup`) 선택
4. "Confirm" 클릭

### 4. 환경 변수 설정

**Terraform 배포 시:**

`infra/terraform/terraform.tfvars`에 추가:
```hcl
notion_token       = "secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
notion_database_id = "abc123def456"
```

다시 배포:
```bash
cd infra/terraform
terraform apply
```

**GitHub Actions Secrets에 추가:**

Repository → Settings → Secrets and variables → Actions

- Name: `NOTION_TOKEN`
  - Value: `secret_xxx...`
- Name: `NOTION_DATABASE_ID`
  - Value: `abc123def456`

### 5. Notion 연동 테스트

백업 작업을 실행한 후 Notion 데이터베이스를 확인하세요.

**자동 생성되는 항목 예시:**

| Date | Summary | Status | Category | System_Health | Backup_Size |
|------|---------|--------|----------|---------------|-------------|
| 2024-11-04 | EBS 백업: vol-123456 | ✅ 완료 | AWS Snapshot | 정상 | 100 GB |
| 2024-11-04 | RDS 백업: db-instance-1 | ✅ 완료 | RDS Dump | 정상 | 50 GB |
| 2024-11-04 | S3 백업: bucket-prod | ⚠️ 점검필요 | S3 Sync | 주의 | 200 GB |

### 6. 주간 리포트 자동 생성

매주 자동으로 주간 리포트가 Notion에 기록됩니다:

| Date | Summary | Status | Week | Category |
|------|---------|--------|------|----------|
| 2024-11-03 | 주간 백업 리포트<br>총 42건 실행, 성공률 95% | ✅ 완료 | 1주차 | 보안 점검 |

---

## 통합 활용 예시

### 시나리오 1: 백업 실패 시

1. **즉시 알림**: Slack에 실패 알림 전송
2. **자동 기록**: Notion에 실패 로그 기록 (`❌ 실패` 상태)
3. **조치**: 팀원이 Slack 알림 확인 → Notion에서 상세 로그 검토 → 문제 해결 → Notion에 개선사항 기록

### 시나리오 2: 주간 리포트

1. **자동 집계**: 매주 일요일 자동으로 통계 생성
2. **Slack 전송**: 주간 리포트 Slack 채널에 게시
3. **Notion 저장**: Notion에 주간 리포트 페이지 생성
4. **검토**: 팀 회의에서 Notion 데이터베이스 검토

### 시나리오 3: 보안 점검

1. **무결성 검사**: 백업 무결성 자동 검증
2. **결과 기록**: Notion에 보안 점검 결과 기록
3. **알림**: 문제 발견 시 Slack 알림
4. **추적**: Notion에서 보안 점검 이력 추적

---

## Notion 뷰 추천 설정

### 뷰 1: 일일 백업 대시보드
- **필터**: Date is today
- **정렬**: Date (최신순)
- **그룹**: Category

### 뷰 2: 실패한 백업 추적
- **필터**: Status is ❌ 실패
- **정렬**: Date (최신순)
- **표시**: Date, Summary, Category, Improvement

### 뷰 3: 주간 리포트
- **필터**: Category contains 보안 점검
- **정렬**: Week (내림차순)
- **표시**: Week, Summary, Status

### 뷰 4: 캘린더 뷰
- **유형**: Calendar
- **날짜 기준**: Date
- **표시**: Status별 색상 구분

---

## Slack 채널 권장 구조

### 채널 1: #devops-backup
- 모든 백업 성공/실패 알림
- 주간 리포트

### 채널 2: #devops-alerts (선택사항)
- 긴급 알림만 (백업 실패, 무결성 검사 실패)
- CloudWatch 알람 연동

### 채널 3: #devops-reports (선택사항)
- 주간/월간 리포트만
- 통계 및 분석 정보

---

## 문제 해결

### Slack 알림이 전송되지 않음

**확인 사항:**
1. Webhook URL이 올바른지 확인
2. Slack 앱이 비활성화되지 않았는지 확인
3. 채널이 삭제되지 않았는지 확인
4. ECS 환경 변수에 `SLACK_WEBHOOK_URL`이 설정되었는지 확인

**테스트:**
```bash
# PowerShell에서 직접 테스트
$webhookUrl = "https://hooks.slack.com/services/..."
$body = @{
  text = "테스트 메시지"
} | ConvertTo-Json

Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $body -ContentType "application/json"
```

### Notion 연동이 작동하지 않음

**확인 사항:**
1. Integration Token이 올바른지 확인
2. Database ID가 올바른지 확인
3. Integration이 데이터베이스에 연결되었는지 확인
4. 데이터베이스 속성 이름이 정확한지 확인 (대소문자, 언더스코어)
5. ECS 환경 변수 확인

**데이터베이스 속성 이름 매핑:**
```typescript
// 코드에서 사용하는 이름 → Notion 속성 이름
Date            → Date
Summary         → Summary
Status          → Status
Category        → Category
Week            → Week
System_Health   → System_Health
Backup_Size     → Backup_Size
DB_Verified     → DB_Verified
Security_Check  → Security_Check
Slack_Log_Link  → Slack_Log_Link
Report_Link     → Report_Link
Improvement     → Improvement
```

**Notion API 테스트:**
```bash
# PowerShell
$token = "secret_xxx..."
$headers = @{
  "Authorization" = "Bearer $token"
  "Notion-Version" = "2022-06-28"
}

Invoke-RestMethod -Uri "https://api.notion.com/v1/users/me" -Headers $headers
```

---

## 고급 설정

### Slack 알림 커스터마이징

`server/src/lib/slack.service.ts` 파일을 수정하여 알림 형식을 변경할 수 있습니다.

### Notion 자동화

Notion 자동화 기능을 사용하여:
- 백업 실패 시 담당자 자동 멘션
- 주간 리포트 자동 공유
- 보안 점검 필요 시 알림

### CloudWatch → Slack 직접 연동

AWS Chatbot을 사용하여 CloudWatch 알람을 Slack에 직접 전송할 수도 있습니다.

---

## 참고 자료

- [Slack API 문서](https://api.slack.com/messaging/webhooks)
- [Notion API 문서](https://developers.notion.com/)
- [AWS Chatbot](https://aws.amazon.com/chatbot/)
