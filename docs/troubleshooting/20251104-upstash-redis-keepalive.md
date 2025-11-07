# 트러블슈팅: Upstash Redis 무료 티어 비활성 방지

## 📅 타임라인
- **발생일**: 2025-11-04 09:00 (KST)
- **해결일**: 2025-11-04 09:20 (KST)
- **소요시간**: 약 20분

## 🔍 문제 상황

### 증상
Upstash에서 무료 티어 Redis 데이터베이스(`naraddon-rbac-cache`) 비활성 경고 메일 수신

```
Subject: Inactive Database Notice

We've noticed that your free tier Database naraddon-rbac-cache,
has not received any traffic in the past few weeks.

To optimize our services, we periodically archive databases that
remain inactive for extended periods.
```

### 발생 환경
- **서비스**: Upstash Redis (무료 티어)
- **데이터베이스명**: naraddon-rbac-cache
- **용도**: RBAC(Role-Based Access Control) 권한 캐싱
- **URL**: `https://summary-oyster-13411.upstash.io`

## 💡 원인 분석

### 근본 원인
1. **실제 사용자 트래픽 부족**
   - Redis는 사용자 로그인/권한 확인 시에만 사용
   - 현재 실사용자가 적어서 Redis 요청이 거의 없음

2. **Upstash 무료 티어 정책**
   - 일정 기간 트래픽이 없으면 자동 아카이브
   - 비활성 데이터베이스 최적화 정책

### 영향 범위
- **현재**: 데이터베이스는 사용 가능한 상태
- **미래**: 비활성 상태 지속 시 자동 아카이브 예정
- **영향받는 기능**:
  - `src/lib/redis.ts` - RBAC 권한 캐싱
  - `scripts/test-rbac.ts` - RBAC 테스트
  - 사용자 권한 조회 성능 최적화

## 🛠️ 해결 과정

### 시도한 방법들

#### 1. **옵션 검토** ✅
- 옵션 1: 헬스체크 스크립트 + GitHub Actions (무료) → **선택**
- 옵션 2: 유료 플랜 업그레이드 ($10/월)
- 옵션 3: 삭제 후 필요시 재생성

**선택 이유**: 무료로 해결 가능하며, GitHub Actions의 스케줄 기능 활용

#### 2. **Redis Keepalive 스크립트 생성** ✅

**파일**: `scripts/redis-keepalive.js`

```javascript
/**
 * Upstash Redis Keepalive 스크립트
 *
 * @purpose 무료 티어 Redis 데이터베이스 비활성 방지
 * @context GitHub Actions에서 주기적으로 실행
 * @interval 6시간마다 PING 요청 전송
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const REDIS_URL = process.env.REDIS_URL;
const REDIS_TOKEN = process.env.REDIS_TOKEN;

async function pingRedis() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('❌ REDIS_URL 또는 REDIS_TOKEN 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  try {
    console.log('🔄 [Redis Keepalive] Upstash Redis에 연결 중...');

    // Upstash REST API로 PING 요청
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['PING']),
    });

    const result = await response.json();
    console.log('✅ [Redis Keepalive] PING 성공:', result);

    // SET/GET 테스트
    await testSetGet();

  } catch (error) {
    console.error('❌ [Redis Keepalive] PING 실패:', error.message);
    process.exit(1);
  }
}

pingRedis();
```

#### 3. **GitHub Actions 워크플로우 생성** ✅

**파일**: `.github/workflows/redis-keepalive.yml`

```yaml
name: Keep Upstash Redis Active

on:
  schedule:
    # 6시간마다 실행 (UTC 0, 6, 12, 18시)
    - cron: '0 */6 * * *'

  workflow_dispatch:  # 수동 실행 가능

jobs:
  ping-redis:
    name: Ping Upstash Redis
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install dotenv

      - name: Run Redis Keepalive
        env:
          REDIS_URL: ${{ secrets.REDIS_URL }}
          REDIS_TOKEN: ${{ secrets.REDIS_TOKEN }}
        run: node scripts/redis-keepalive.js
```

#### 4. **package.json 스크립트 추가** ✅

```json
{
  "scripts": {
    "redis:keepalive": "node scripts/redis-keepalive.js",
    "redis:ping": "node scripts/redis-keepalive.js"
  }
}
```

#### 5. **환경변수 수정** ✅

**문제 발견**: `.env.local` 파일의 `REDIS_TOKEN`에 잘못된 값이 붙어있음

```bash
# ❌ 수정 전
REDIS_TOKEN=ATRjAAIncDIwNjBjZDY2OGVmMTk0OWFhODdlNGE0YWI2MDgyYjBiZHAyMTM0MTERBAC_BUILD_ID=$(date +%s)

# ✅ 수정 후
REDIS_TOKEN=ATRjAAIncDIwNjBjZDY2OGVmMTk0OWFhODdlNGE0YWI2MDgyYjBiZHAyMTM0MTE
```

#### 6. **GitHub Secrets 설정** ✅

```bash
# GitHub CLI로 Secrets 설정
gh secret set REDIS_URL --body "https://summary-oyster-13411.upstash.io" \
  --repo pola2025/naraddon-homepage

gh secret set REDIS_TOKEN --body "ATRjAAIncDIwNjBjZDY2OGVmMTk0OWFhODdlNGE0YWI2MDgyYjBiZHAyMTM0MTE" \
  --repo pola2025/naraddon-homepage

# 확인
gh secret list --repo pola2025/naraddon-homepage
```

### 최종 해결 방법

**로컬 테스트 성공**:
```bash
$ npm run redis:keepalive

> naraddon-nextjs@0.1.6 redis:keepalive
> node scripts/redis-keepalive.js

🔄 [Redis Keepalive] Upstash Redis에 연결 중...
📍 [Redis Keepalive] URL: https://summary-oyster-13411.upstash.io
✅ [Redis Keepalive] PING 성공: { result: 'PONG' }
⏰ [Redis Keepalive] 실행 시각: 2025-11-04T00:13:29.177Z
📝 [Redis Keepalive] SET keepalive:last_ping = 2025-11-04T00:13:29.177Z
📖 [Redis Keepalive] GET keepalive:last_ping = 2025-11-04T00:13:29.177Z
```

**GitHub Actions 테스트 성공**:
```bash
$ gh workflow run "Keep Upstash Redis Active" --repo pola2025/naraddon-homepage

$ gh run list --workflow="Keep Upstash Redis Active" --repo pola2025/naraddon-homepage --limit 1
completed  success  Keep Upstash Redis Active  main  workflow_dispatch  1m7s
```

**Git 커밋 및 푸시**:
```bash
git add scripts/redis-keepalive.js .github/workflows/redis-keepalive.yml package.json
git commit -m "feat: Add Redis keepalive to prevent Upstash free tier inactivity"
git push naraddon main
```

## 🚀 예방 조치

### 재발 방지 대책

1. **자동 헬스체크 설정 완료**
   - GitHub Actions가 6시간마다 자동 PING
   - UTC 0시, 6시, 12시, 18시 (한국 시간: 9시, 15시, 21시, 3시)

2. **로컬 테스트 명령어 추가**
   ```bash
   npm run redis:keepalive
   npm run redis:ping
   ```

3. **환경변수 검증 로직 추가**
   ```javascript
   if (!REDIS_URL || !REDIS_TOKEN) {
     console.error('❌ 환경변수 미설정');
     process.exit(1);
   }
   ```

### 모니터링 방안

1. **GitHub Actions 로그 모니터링**
   - 주소: https://github.com/pola2025/naraddon-homepage/actions
   - 워크플로우: "Keep Upstash Redis Active"
   - 실패 시 GitHub에서 자동 알림

2. **Upstash 대시보드 확인**
   - 주기적으로 트래픽 확인
   - 비활성 경고 메일 수신 여부 확인

3. **Redis 연결 테스트**
   ```bash
   # 로컬에서 수동 테스트
   npm run redis:keepalive
   ```

## 📚 참고 자료

### 관련 파일
- `scripts/redis-keepalive.js` - Redis keepalive 스크립트
- `.github/workflows/redis-keepalive.yml` - GitHub Actions 워크플로우
- `src/lib/redis.ts` - Redis 클라이언트 (RBAC 캐싱용)
- `package.json` - npm 스크립트 정의

### 관련 문서
- [Upstash Redis 문서](https://docs.upstash.com/redis)
- [GitHub Actions 스케줄 문서](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Dotenv 문서](https://github.com/motdotla/dotenv)

### 외부 링크
- Upstash Console: https://console.upstash.com
- GitHub Actions: https://github.com/pola2025/naraddon-homepage/actions
- GitHub Secrets: https://github.com/pola2025/naraddon-homepage/settings/secrets/actions

## 🎓 학습 내용

### 핵심 개념

1. **Upstash Redis 무료 티어**
   - 비활성 데이터베이스는 자동 아카이브
   - 정기적인 트래픽 발생으로 활성 상태 유지 필요

2. **GitHub Actions Cron Schedule**
   - UTC 기준으로 동작
   - `*/6` = 6시간마다 실행
   - `workflow_dispatch`로 수동 실행 가능

3. **Upstash REST API**
   - Redis 프로토콜 대신 HTTPS REST API 사용
   - 서버리스 환경에 최적화
   - Bearer 토큰 인증

### 적용 가능한 패턴

1. **헬스체크 패턴**
   ```javascript
   // 주기적 PING으로 서비스 활성 상태 유지
   async function healthCheck() {
     await fetch(SERVICE_URL, {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${TOKEN}` },
       body: JSON.stringify(['PING'])
     });
   }
   ```

2. **GitHub Actions 스케줄링**
   ```yaml
   on:
     schedule:
       - cron: '0 */6 * * *'  # 6시간마다
     workflow_dispatch:        # 수동 실행 가능
   ```

3. **환경변수 보안 관리**
   ```bash
   # GitHub Secrets 사용
   gh secret set VARIABLE_NAME --body "value" --repo owner/repo
   ```

## ✅ 체크리스트

### 완료된 작업
- [x] Redis keepalive 스크립트 작성
- [x] GitHub Actions 워크플로우 생성
- [x] package.json 스크립트 명령어 추가
- [x] 로컬 테스트 성공
- [x] 환경변수 수정 (REDIS_TOKEN 오류 수정)
- [x] GitHub Secrets 설정
- [x] Git 커밋 및 푸시
- [x] GitHub Actions 워크플로우 테스트 성공

### 향후 확인 사항
- [ ] 며칠 후 Upstash 대시보드에서 트래픽 확인
- [ ] 비활성 경고 메일 재수신 여부 확인
- [ ] GitHub Actions 자동 실행 로그 확인 (6시간마다)

## 🏷️ 태그
`#upstash` `#redis` `#github-actions` `#keepalive` `#troubleshooting` `#devops` `#automation` `#rbac` `#caching`

---

**작성일**: 2025-11-04
**작성자**: Claude (AI Assistant)
**상태**: ✅ 해결 완료
