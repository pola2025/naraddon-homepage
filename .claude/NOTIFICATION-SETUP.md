# 🔔 사용자 알림 시스템 설정 가이드

## 📋 개요

사용자 응답이 필요할 때 3가지 방식으로 알림:
1. **모달창** - 대시보드에 팝업 표시
2. **사운드** - 알림음 재생
3. **텔레그램** - 모바일/PC로 메시지 전송

---

## 🚀 빠른 시작

### 1단계: Telegram Bot 생성 (5분)

#### 1️⃣ BotFather와 대화
1. Telegram 앱 열기
2. `@BotFather` 검색
3. `/newbot` 명령 입력
4. Bot 이름 입력 (예: `Naraddon Claude Bot`)
5. Bot username 입력 (예: `naraddon_claude_bot`)
6. **Bot Token 복사** (예: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

#### 2️⃣ Chat ID 확인
1. 생성한 Bot과 대화 시작 (`/start` 입력)
2. 브라우저에서 열기:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
3. `"chat":{"id":` 뒤의 숫자 복사 (예: `987654321`)

### 2단계: 환경변수 설정 (1분)

`.env.local` 파일에 추가:
```bash
# Telegram 알림 설정
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=987654321
```

### 3단계: 개발 서버 재시작
```bash
npm run dev
```

### 4단계: 테스트 (1분)

#### 브라우저에서 테스트
1. 대시보드 열기: `.claude/dashboard/monitor.html`
2. F12 개발자 도구 열기
3. 콘솔에서 실행:
   ```javascript
   // 모달창 + 사운드 테스트
   testUserResponseModal()

   // 텔레그램 알림 테스트
   testTelegramNotification()
   ```

#### API 직접 테스트
```bash
# GET: 설정 확인
curl http://localhost:3000/api/telegram-notify

# POST: 테스트 메시지 전송
curl -X POST http://localhost:3000/api/telegram-notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "테스트 알림",
    "type": "info",
    "details": "API 테스트입니다"
  }'
```

---

## 📱 Telegram 알림 예시

### 알림 타입별 메시지

#### 1. 일반 알림 (info)
```
ℹ️ *Claude A 알림*

Claude B가 코드 검토를 완료했습니다.

📋 상세:
UI/UX 개선 필요: 로딩 스피너 추가 권장

⏰ 2025-10-06 17:30:45
```

#### 2. 경고 (warning)
```
⚠️ *Claude A 알림*

Claude B가 수정 요청을 보냈습니다.

📋 상세:
NEEDS_CHANGES: 에러 처리 개선 필요

⏰ 2025-10-06 17:35:12
```

#### 3. 성공 (success)
```
✅ *Claude A 알림*

Claude C 검증 완료 - 배포 가능!

📋 상세:
보안 점수: 92/100
Decision: APPROVED

⏰ 2025-10-06 17:40:20
```

#### 4. 오류 (error)
```
❌ *Claude A 알림*

빌드 실패 - 사용자 확인 필요

📋 상세:
TypeError: Cannot read property 'map' of undefined

⏰ 2025-10-06 17:45:33
```

---

## 🎵 사운드 알림

### 자동 재생
- 모달창 표시 시 자동으로 알림음 재생
- Web Audio API 사용 (브라우저 내장)
- 2음계 멜로디 (높은 음 → 낮은 음)

### 브라우저 권한
일부 브라우저는 사용자 상호작용 없이 소리 재생을 차단할 수 있습니다.
- 해결: 대시보드를 한 번 클릭하면 이후 자동 재생 가능

---

## 🎯 사용 시나리오

### 시나리오 1: Claude B 검토 완료
```javascript
// Claude B가 검토 완료 시
showUserResponseModal(
  'Claude B가 코드 검토를 완료했습니다.',
  'Decision: NEEDS_CHANGES\n개선 필요: 로딩 스피너 추가'
);

// 결과:
// 1. ⚠️ 모달창 표시
// 2. 🔔 알림음 재생
// 3. 📱 텔레그램 메시지 전송
```

### 시나리오 2: Claude C 검증 완료
```javascript
// Claude C가 검증 완료 시
showUserResponseModal(
  'Claude C 보안 검증이 완료되었습니다. 배포를 승인해주세요.',
  'Score: 92/100\nDecision: APPROVED'
);
```

### 시나리오 3: 빌드 실패
```javascript
// 빌드 실패 시
showUserResponseModal(
  '빌드 실패 - 사용자 확인이 필요합니다.',
  'Error: TypeScript compilation failed\n파일: src/components/VideoForm.tsx:45'
);
```

---

## 🔧 고급 설정

### 1. 알림 커스터마이징

#### 메시지 포맷 변경
`app/api/telegram-notify/route.ts` 수정:
```typescript
// 기본 포맷
let telegramMessage = `${icon} *Claude A 알림*\n\n`;
telegramMessage += `${message}\n`;

// 커스터마이징 예시
telegramMessage = `🤖 *[나라똔] ${type.toUpperCase()}*\n\n`;
telegramMessage += `📢 ${message}\n`;
telegramMessage += `\n🔗 [대시보드 열기](http://localhost:3000)`;
```

### 2. 알림음 변경

`monitor.html` 수정:
```javascript
function playNotificationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // 알림음 커스터마이징
  oscillator.type = 'sine'; // 'sine', 'square', 'sawtooth', 'triangle'
  oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // 주파수 변경

  // 볼륨 조절
  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // 0.0 ~ 1.0

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3); // 재생 시간
}
```

### 3. 모달창 스타일 변경

`monitor.html` 모달창 스타일 수정:
```css
/* 모달창 배경색 변경 */
background: rgba(0,0,0,0.95); /* 더 어둡게 */

/* 테두리 색상 변경 */
border: 3px solid #ff6600; /* 주황색 */

/* 애니메이션 추가 */
animation: slideDown 0.3s ease;

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 🐛 트러블슈팅

### Q1. 텔레그램 메시지가 안 옴
**A**: 환경변수 확인
```bash
# 1. .env.local 파일 확인
cat .env.local | grep TELEGRAM

# 2. API 상태 확인
curl http://localhost:3000/api/telegram-notify

# 3. Bot Token 유효성 확인
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

### Q2. 사운드가 재생 안 됨
**A**: 브라우저 권한 확인
- Chrome: 대시보드를 한 번 클릭 (사용자 상호작용 필요)
- Firefox: 설정 → 자동 재생 허용
- Safari: 설정 → 웹사이트 → 자동 재생 → 허용

### Q3. 모달창이 표시 안 됨
**A**: 콘솔 에러 확인
```javascript
// F12 → Console 확인
// 에러 메시지가 있으면 보고
```

### Q4. 텔레그램 Chat ID를 못 찾겠음
**A**: 대체 방법
1. `@userinfobot`과 대화 시작
2. Chat ID 자동 표시됨

---

## 📊 알림 흐름도

```
사용자 응답 필요 상황 발생
    ↓
showUserResponseModal() 호출
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   모달창 표시   │   사운드 재생   │   텔레그램 전송 │
│   (즉시)        │   (즉시)        │   (비동기)      │
└─────────────────┴─────────────────┴─────────────────┘
    ↓
사용자 확인 대기
    ↓
[✅ 확인] 버튼 클릭
    ↓
모달창 닫힘 → 작업 재개
```

---

## ✅ 체크리스트

### 필수 설정
- [ ] Telegram Bot 생성됨
- [ ] Bot Token 복사됨
- [ ] Chat ID 확인됨
- [ ] `.env.local`에 추가됨
- [ ] 개발 서버 재시작됨

### 테스트
- [ ] `testUserResponseModal()` 실행
- [ ] 모달창 표시됨
- [ ] 사운드 재생됨
- [ ] 텔레그램 메시지 수신됨

### 선택 설정
- [ ] 알림음 커스터마이징
- [ ] 모달창 스타일 변경
- [ ] 메시지 포맷 변경

---

## 🎉 완성!

이제 사용자 응답이 필요할 때:
1. ⚠️  **모달창**이 자동으로 표시됩니다
2. 🔔 **알림음**이 재생됩니다
3. 📱 **텔레그램**으로 메시지가 전송됩니다

**Happy Coding! 🚀**

---

*최종 업데이트: 2025-10-06*
*작성자: Claude Code*
