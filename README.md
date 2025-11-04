# 🛡️ DROX DevOps Automation Platform

백업 자동화 및 인프라 모니터링을 위한 통합 DevOps 플랫폼입니다.

## 주요 기능

### 백업 자동화
- **EBS 스냅샷**: AWS EBS 볼륨 자동 스냅샷 생성
- **RDS 백업**: RDS 데이터베이스 자동 스냅샷
- **S3 동기화**: S3 버킷 간 동기화 및 백업
- **로컬 백업**: Windows robocopy 기반 로컬 HDD 백업

### 무결성 검증
- 백업 타입별 맞춤형 무결성 검사
- 스냅샷 상태, 파일 카운트, 복사 성공률 검증
- 자동화된 검증 스케줄링

### 모니터링 및 알림
- **CloudWatch Metrics**: 커스텀 백업 메트릭 전송
- **CloudWatch Alarms**: ECS, RDS, ALB, 백업 작업 알람
- **Slack 알림**: 백업 성공/실패, 주간 리포트
- **Notion 연동**: 백업 로그 자동 기록

### 웹 대시보드
- 백업 작업 생성 및 관리
- 실시간 백업 상태 모니터링
- 무결성 검사 결과 조회
- 백업 히스토리 및 통계

## 기술 스택

### 백엔드
- **NestJS**: TypeScript 기반 Node.js 프레임워크
- **Prisma ORM**: PostgreSQL 데이터베이스 연동
- **AWS SDK v3**: EBS, RDS, S3, CloudWatch 서비스 연동
- **node-cron**: 스케줄링

### 프론트엔드
- **React 18**: 최신 React 라이브러리
- **Vite**: 빠른 빌드 도구
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **React Query**: 서버 상태 관리

### 인프라 (AWS)
- **ECS Fargate**: 컨테이너 기반 백엔드 호스팅
- **RDS PostgreSQL**: 관리형 데이터베이스
- **S3 + CloudFront**: 정적 프론트엔드 호스팅 및 CDN
- **Application Load Balancer**: HTTP 로드 밸런싱
- **Secrets Manager**: 시크릿 관리
- **ECR**: Docker 이미지 레지스트리
- **CloudWatch**: 로그 및 메트릭 수집

### DevOps
- **Terraform**: Infrastructure as Code
- **GitHub Actions**: CI/CD 파이프라인
- **Docker**: 컨테이너화

## 프로젝트 구조

```
devops-automation/
├── server/                 # NestJS 백엔드
│   ├── src/
│   │   ├── modules/       # 백업, 무결성 검사 모듈
│   │   ├── lib/           # AWS, Slack, Notion 서비스
│   │   └── prisma/        # 데이터베이스 스키마
│   ├── Dockerfile         # 백엔드 Docker 이미지
│   └── package.json
│
├── src/                   # React 프론트엔드
│   ├── components/        # UI 컴포넌트
│   ├── pages/            # 페이지 컴포넌트
│   ├── hooks/            # 커스텀 훅
│   └── package.json
│
├── infra/terraform/       # Terraform 인프라 코드
│   ├── network.tf        # VPC, 서브넷, 라우팅
│   ├── rds.tf            # RDS PostgreSQL
│   ├── ecs.tf            # ECS 클러스터, 서비스
│   ├── frontend.tf       # S3, CloudFront
│   ├── security-groups.tf # 보안 그룹
│   ├── iam.tf            # IAM 역할 및 정책
│   ├── secrets.tf        # Secrets Manager
│   ├── cloudwatch-alarms.tf # CloudWatch 알람
│   └── variables.tf      # 변수 정의
│
├── .github/workflows/     # GitHub Actions CI/CD
│   ├── deploy.yml        # 애플리케이션 배포
│   └── terraform.yml     # 인프라 배포
│
├── DEPLOYMENT.md         # 배포 가이드
└── README.md             # 이 파일
```

## 빠른 시작

### 로컬 개발 환경 설정

1. **저장소 클론**

```bash
git clone https://github.com/your-org/devops-automation.git
cd devops-automation
```

2. **백엔드 설정**

```bash
cd server
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필요한 값을 입력

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 개발 서버 실행
npm run start:dev
```

3. **프론트엔드 설정**

```bash
cd src
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 VITE_API_URL 설정

# 개발 서버 실행
npm run dev
```

### AWS 배포

상세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

**요약:**

1. Terraform으로 AWS 인프라 프로비저닝
2. GitHub Secrets 설정
3. GitHub Actions를 통한 자동 배포

## API 엔드포인트

### 백업 작업 관리

- `GET /api/jobs` - 모든 백업 작업 목록
- `POST /api/jobs` - 새 백업 작업 생성
- `GET /api/jobs/:id` - 특정 작업 조회
- `PUT /api/jobs/:id` - 작업 업데이트
- `DELETE /api/jobs/:id` - 작업 삭제
- `POST /api/jobs/:id/run` - 수동 백업 실행

### 백업 히스토리

- `GET /api/runs` - 모든 백업 실행 기록
- `GET /api/runs/:id` - 특정 실행 기록 조회

### 무결성 검사

- `POST /api/integrity/check/:jobRunId` - 무결성 검사 실행
- `GET /api/integrity/results` - 검사 결과 목록

## 환경 변수

### 백엔드 (server/.env)

```env
# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/drox_devops

# AWS
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# 인증
ADMIN_API_KEY=your-admin-api-key

# 외부 서비스 (선택사항)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
NOTION_TOKEN=secret_xxx
NOTION_DATABASE_ID=xxx
```

### 프론트엔드 (src/.env)

```env
VITE_API_URL=http://localhost:4000/api
```

## 라이센스

MIT License

## 기여

Pull Request를 환영합니다!

## 지원

문제가 발생하면 GitHub Issues에 등록해주세요.
