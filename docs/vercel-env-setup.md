# Vercel 환경변수 설정 가이드

## 🔧 환영 이메일 웹훅 설정

### 1. Vercel Dashboard 접속

1. https://vercel.com 접속
2. **나라똔 프로젝트** 선택
3. **Settings** 탭 클릭
4. 좌측 메뉴에서 **Environment Variables** 선택

---

### 2. 환경변수 추가

다음 3개의 환경변수를 추가하세요:

#### ✅ 환경변수 1: WELCOME_EMAIL_WEBHOOK_URL

신규 가입자에게 환영 이메일을 발송하는 Google Apps Script 웹훅 URL

| 필드 | 값 |
|------|-----|
| **Name** | `WELCOME_EMAIL_WEBHOOK_URL` |
| **Value** | `https://script.google.com/macros/s/AKfycbyPLBKI5CTDEHp4RAVLszclvK9HODXZf2FRPdziMwLVOP2OsXZDBvfT2jaX1CmdMZHvRg/exec` |
| **Environment** | ✅ Production<br>✅ Preview<br>✅ Development |

#### ✅ 환경변수 2: NEW_USER_NOTIFICATION_WEBHOOK_URL (선택사항)

관리자에게 신규 가입자 알림 이메일을 발송하는 웹훅 URL (현재는 텔레그램만 사용 중이므로 선택사항)

| 필드 | 값 |
|------|-----|
| **Name** | `NEW_USER_NOTIFICATION_WEBHOOK_URL` |
| **Value** | `https://script.google.com/macros/s/AKfycbyPLBKI5CTDEHp4RAVLszclvK9HODXZf2FRPdziMwLVOP2OsXZDBvfT2jaX1CmdMZHvRg/exec` |
| **Environment** | ✅ Production<br>✅ Preview<br>✅ Development |

#### ✅ 환경변수 3: CONSULTATION_NOTIFICATION_EMAILS (확인)

관리자 이메일 주소 (이미 설정되어 있을 수 있음)

| 필드 | 값 |
|------|-----|
| **Name** | `CONSULTATION_NOTIFICATION_EMAILS` |
| **Value** | `jjk_naraddon@naver.com` (또는 관리자 이메일 주소) |
| **Environment** | ✅ Production<br>✅ Preview<br>✅ Development |

---

### 3. 환경변수 입력 주의사항

⚠️ **중요**: 환경변수 입력 시 다음 사항을 주의하세요:

1. **따옴표 없이 입력**
   ```
   ❌ 잘못된 예: "https://script.google.com/..."
   ✅ 올바른 예: https://script.google.com/...
   ```

2. **앞뒤 공백 제거**
   ```
   ❌ 잘못된 예:  https://script.google.com/...
   ✅ 올바른 예: https://script.google.com/...
   ```

3. **줄바꿈 없이 한 줄로 입력**

---

### 4. 재배포

환경변수를 추가한 후:

1. 자동으로 재배포가 시작됩니다
2. 또는 **Deployments** 탭에서 최신 배포를 선택하고 **Redeploy** 클릭

---

### 5. 환경변수 확인

배포 완료 후 다음 URL로 설정 확인:

```bash
# 환영 이메일 API 상태 확인
curl https://naraddon.com/api/notifications/welcome-email

# 예상 응답 (설정 완료 시)
{
  "configured": true,
  "webhookUrl": "설정됨",
  "status": "ready"
}

# 예상 응답 (설정 안 됨 시)
{
  "configured": false,
  "webhookUrl": "미설정 - 환영 이메일이 발송되지 않습니다",
  "status": "not_configured"
}
```

---

## 📊 환경변수 목록 (전체)

나라똔 프로젝트에서 사용 중인 모든 환경변수:

### ✅ 필수 환경변수
- `MONGODB_URI` - MongoDB 연결 문자열
- `NEXTAUTH_SECRET` - NextAuth 비밀키
- `NEXTAUTH_URL` - 사이트 URL (https://naraddon.com)
- `NAVER_CLIENT_ID` - 네이버 로그인 클라이언트 ID
- `NAVER_CLIENT_SECRET` - 네이버 로그인 시크릿

### ✅ 알림 관련 환경변수
- `TELEGRAM_BOT_TOKEN` - 텔레그램 봇 토큰
- `TELEGRAM_CHAT_ID` - 텔레그램 채팅 ID
- `WELCOME_EMAIL_WEBHOOK_URL` - 환영 이메일 웹훅 (신규 추가)
- `NEW_USER_NOTIFICATION_WEBHOOK_URL` - 신규 가입자 알림 웹훅 (선택)
- `CONSULTATION_NOTIFICATION_EMAILS` - 관리자 이메일

### ⚙️ 선택 환경변수
- `CLOUDFLARE_R2_*` - Cloudflare R2 스토리지
- `KAKAO_CLIENT_ID` - 카카오 로그인 (미구현)
- `GOOGLE_CLIENT_ID` - 구글 로그인 (미구현)
- `OPENAI_API_KEY` - OpenAI API
- `NOTION_API_KEY` - Notion API

---

## 🧪 테스트

환경변수 설정 완료 후 테스트:

1. **새 계정으로 회원가입** (네이버 로그인)
2. **이메일 확인** (환영 이메일 도착 확인)
3. **텔레그램 확인** (관리자 알림 확인)

---

## 🔒 보안

- 환경변수는 **절대 Git에 커밋하지 마세요**
- `.env.local` 파일은 `.gitignore`에 포함되어 있습니다
- Vercel 환경변수는 암호화되어 저장됩니다

---

*최종 업데이트: 2025-10-08*
*Google Apps Script 웹 앱 URL: https://script.google.com/macros/s/AKfycbyPLBKI5CTDEHp4RAVLszclvK9HODXZf2FRPdziMwLVOP2OsXZDBvfT2jaX1CmdMZHvRg/exec*
