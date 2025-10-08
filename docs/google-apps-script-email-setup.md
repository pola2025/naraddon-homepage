# Google Apps Script 이메일 발송 설정 가이드

> 신규 회원 가입 시 환영 이메일을 자동으로 발송하는 Google Apps Script 설정 방법

## 📋 목차

1. [Google Apps Script 프로젝트 생성](#1-google-apps-script-프로젝트-생성)
2. [이메일 발송 코드 작성](#2-이메일-발송-코드-작성)
3. [웹 앱으로 배포](#3-웹-앱으로-배포)
4. [환경변수 설정](#4-환경변수-설정)
5. [테스트](#5-테스트)

---

## 1. Google Apps Script 프로젝트 생성

### 1-1. Google Apps Script 접속

1. 브라우저에서 [Google Apps Script](https://script.google.com) 접속
2. Gmail 계정으로 로그인 (이메일 발송에 사용할 계정)
3. **"새 프로젝트"** 버튼 클릭

### 1-2. 프로젝트 이름 설정

- 좌측 상단 "제목 없는 프로젝트" 클릭
- 프로젝트 이름 입력: `나라똔 환영이메일 발송`

---

## 2. 이메일 발송 코드 작성

### 2-1. 코드 에디터에 붙여넣기

`Code.gs` 파일에 다음 코드를 복사하여 붙여넣으세요:

\`\`\`javascript
/**
 * 나라똔 신규 회원 환영 이메일 발송 웹훅
 *
 * 웹 앱 URL: POST 요청 수신
 * 기능: 신규 회원에게 환영 이메일 자동 발송
 */

// POST 요청 처리 (웹훅 엔드포인트)
function doPost(e) {
  try {
    // 요청 데이터 파싱
    const data = JSON.parse(e.postData.contents);

    Logger.log('📧 Welcome email request received:');
    Logger.log(JSON.stringify(data, null, 2));

    // 타입 확인
    if (data.type !== 'welcome_email') {
      return createResponse(false, 'Invalid request type');
    }

    // 필수 데이터 확인
    if (!data.recipient || !data.recipient.email) {
      return createResponse(false, 'Recipient email is required');
    }

    // 환영 이메일 발송
    const result = sendWelcomeEmail(data);

    return createResponse(true, 'Welcome email sent successfully', result);

  } catch (error) {
    Logger.log('❌ Error processing request: ' + error.toString());
    return createResponse(false, 'Error: ' + error.toString());
  }
}

// 환영 이메일 발송 함수
function sendWelcomeEmail(data) {
  const recipient = data.recipient;
  const emailData = data.data || {};
  const emailContent = data.emailContent || {};

  // 이메일 제목
  const subject = emailContent.subject || '[나라똔] 회원가입을 환영합니다! 🎉';

  // 이메일 HTML 본문
  const htmlBody = createWelcomeEmailHTML(
    recipient.name,
    emailContent.variables || {},
    emailData
  );

  // 이메일 발송 옵션
  const options = {
    htmlBody: htmlBody,
    name: '나라똔',
    replyTo: 'jjk_naraddon@naver.com', // 답장 받을 이메일 주소
    noReply: false
  };

  try {
    // Gmail 이메일 발송
    MailApp.sendEmail(
      recipient.email,
      subject,
      '이 이메일은 HTML을 지원하는 메일 클라이언트에서 확인하세요.',
      options
    );

    Logger.log('✅ Email sent to: ' + recipient.email);

    return {
      success: true,
      recipient: recipient.email,
      sentAt: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('❌ Failed to send email: ' + error.toString());
    throw error;
  }
}

// 환영 이메일 HTML 템플릿 생성
function createWelcomeEmailHTML(userName, variables, data) {
  const websiteUrl = data.websiteUrl || 'https://naraddon.com';
  const loginUrl = data.loginUrl || websiteUrl + '/auth/signin';
  const myPageUrl = data.myPageUrl || websiteUrl + '/mypage';
  const provider = variables.provider || '소셜 로그인';
  const year = variables.year || new Date().getFullYear();

  return \`
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>나라똔 회원가입 환영</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .highlight {
      color: #667eea;
      font-weight: bold;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .info-box h3 {
      margin-top: 0;
      color: #333333;
      font-size: 16px;
    }
    .info-box ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .info-box li {
      margin: 8px 0;
      color: #555555;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: bold;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #666666;
      font-size: 14px;
      border-top: 1px solid #eeeeee;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      margin: 0 10px;
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 헤더 -->
    <div class="header">
      <h1>🎉 나라똔 가입을 환영합니다!</h1>
    </div>

    <!-- 본문 -->
    <div class="content">
      <div class="greeting">
        안녕하세요, <span class="highlight">\${userName}</span>님!<br>
        <strong>나라똔</strong>에 가입해 주셔서 진심으로 감사드립니다.
      </div>

      <p style="line-height: 1.8; color: #555555;">
        \${provider}으로 간편하게 가입하셨습니다.<br>
        이제 나라똔의 다양한 서비스를 이용하실 수 있습니다.
      </p>

      <!-- 서비스 안내 -->
      <div class="info-box">
        <h3>📌 나라똔에서 제공하는 서비스</h3>
        <ul>
          <li><strong>전문가 상담</strong>: 사업 관련 전문가의 1:1 맞춤 상담</li>
          <li><strong>기업심사관 매칭</strong>: 정부지원사업 신청 전문가 연결</li>
          <li><strong>정책 소식</strong>: 최신 정부지원정책 및 사업 정보</li>
          <li><strong>나라똔튜브</strong>: 사업에 도움되는 영상 콘텐츠</li>
          <li><strong>비즈니스 보이스</strong>: 사업자 커뮤니티 및 Q&A</li>
        </ul>
      </div>

      <!-- CTA 버튼 -->
      <div style="text-align: center;">
        <a href="\${myPageUrl}" class="button">
          내 정보 확인하기
        </a>
      </div>

      <p style="margin-top: 30px; color: #666666; font-size: 14px; line-height: 1.6;">
        궁금하신 사항이 있으시면 언제든지 문의해 주세요.<br>
        나라똔이 여러분의 성공적인 사업을 응원합니다! 💪
      </p>
    </div>

    <!-- 푸터 -->
    <div class="footer">
      <div class="social-links">
        <a href="\${websiteUrl}">홈페이지</a> |
        <a href="\${loginUrl}">로그인</a> |
        <a href="\${myPageUrl}">마이페이지</a>
      </div>

      <p style="margin: 10px 0;">
        <strong>나라똔</strong><br>
        사업자의 성공 파트너
      </p>

      <p style="margin: 10px 0; font-size: 12px; color: #999999;">
        이 이메일은 나라똔 회원가입 시 자동으로 발송됩니다.<br>
        © \${year} 나라똔. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  \`;
}

// HTTP 응답 생성 헬퍼
function createResponse(success, message, data) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  };

  if (data) {
    response.data = data;
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET 요청 처리 (상태 확인용)
function doGet(e) {
  return createResponse(true, 'Welcome Email Webhook is running', {
    version: '1.0.0',
    service: 'Naraddon Welcome Email',
    status: 'active'
  });
}
\`\`\`

### 2-2. 코드 저장

- **Ctrl + S** (또는 상단 저장 아이콘) 클릭
- 프로젝트 저장 완료

---

## 3. 웹 앱으로 배포

### 3-1. 배포 시작

1. 상단 메뉴에서 **"배포" → "새 배포"** 클릭
2. **"유형 선택"** 옆 톱니바퀴 아이콘 클릭
3. **"웹 앱"** 선택

### 3-2. 배포 설정

다음과 같이 설정:

| 항목 | 설정 값 |
|------|---------|
| **새 설명** | `나라똔 환영이메일 v1.0` |
| **다음 계정으로 실행** | `나` (본인 계정) |
| **액세스 권한** | **모든 사용자** |

⚠️ **중요**: "액세스 권한"을 반드시 **"모든 사용자"**로 설정해야 외부 웹훅 요청을 받을 수 있습니다.

### 3-3. 권한 승인

1. **"배포"** 버튼 클릭
2. **"액세스 승인"** 클릭
3. Gmail 계정 선택
4. **"고급"** 클릭 → **"(프로젝트 이름)(으)로 이동"** 클릭
5. **"허용"** 버튼 클릭

### 3-4. 웹 앱 URL 복사

배포 완료 후 나타나는 **"웹 앱 URL"**을 복사하세요.

예시:
\`\`\`
https://script.google.com/macros/s/AKfycby...생략.../exec
\`\`\`

이 URL을 Vercel 환경변수에 설정할 예정입니다.

---

## 4. 환경변수 설정

### 4-1. Vercel 환경변수 추가

1. [Vercel Dashboard](https://vercel.com) 접속
2. 나라똔 프로젝트 선택
3. **Settings → Environment Variables** 이동
4. 다음 환경변수 추가:

#### 환경변수 1: 환영 이메일 웹훅 URL

| 필드 | 값 |
|------|-----|
| **Key** | \`WELCOME_EMAIL_WEBHOOK_URL\` |
| **Value** | \`https://script.google.com/macros/s/...복사한_URL.../exec\` |
| **Environment** | Production, Preview, Development 모두 체크 |

#### 환경변수 2: 신규 가입자 알림 웹훅 URL (선택사항)

관리자에게 이메일 알림도 보내려면:

| 필드 | 값 |
|------|-----|
| **Key** | \`NEW_USER_NOTIFICATION_WEBHOOK_URL\` |
| **Value** | \`https://script.google.com/macros/s/...복사한_URL.../exec\` |
| **Environment** | Production, Preview, Development 모두 체크 |

### 4-2. Vercel 재배포

환경변수 추가 후 자동으로 재배포됩니다.
또는 **Deployments** 탭에서 **Redeploy** 클릭

---

## 5. 테스트

### 5-1. 웹훅 테스트 (Google Apps Script)

Google Apps Script 에디터에서:

1. 상단 함수 선택 드롭다운에서 **\`doGet\`** 선택
2. **"실행"** 버튼 클릭
3. 하단 로그에 다음 메시지 확인:
   \`\`\`json
   {
     "success": true,
     "message": "Welcome Email Webhook is running",
     "status": "active"
   }
   \`\`\`

### 5-2. API 엔드포인트 테스트

터미널에서 다음 명령어 실행:

\`\`\`bash
# 환영 이메일 API 상태 확인
curl https://naraddon.com/api/notifications/welcome-email

# 예상 응답
{
  "configured": true,
  "webhookUrl": "설정됨",
  "status": "ready"
}
\`\`\`

### 5-3. 실제 이메일 발송 테스트

새 계정으로 회원가입하여 테스트:

1. 네이버/카카오/구글 계정으로 로그인 (처음 가입하는 계정)
2. 가입 완료 후 이메일 확인
3. 다음 이메일이 도착했는지 확인:
   - **제목**: \`[나라똔] 회원가입을 환영합니다! 🎉\`
   - **발신자**: 나라똔
   - **내용**: 환영 메시지 및 서비스 안내

---

## 📝 트러블슈팅

### 문제 1: 이메일이 발송되지 않음

**원인**: 환경변수 미설정 또는 잘못된 URL

**해결**:
1. Vercel 환경변수에서 \`WELCOME_EMAIL_WEBHOOK_URL\` 확인
2. Google Apps Script 배포 URL이 정확한지 확인
3. URL 끝에 \`/exec\`가 있는지 확인

### 문제 2: 403 Forbidden 에러

**원인**: Google Apps Script 배포 시 "액세스 권한" 잘못 설정

**해결**:
1. Google Apps Script로 돌아가기
2. **배포 → 배포 관리** 클릭
3. 연필 아이콘 (편집) 클릭
4. "액세스 권한"을 **"모든 사용자"**로 변경
5. **버전 업데이트 → 배포** 클릭

### 문제 3: 스팸 폴더로 이메일 도착

**원인**: Gmail 발신자 인증 부족

**해결**:
1. Gmail에서 **스팸 아님** 표시
2. 발신자를 주소록에 추가
3. (장기 해결) Google Workspace 사용 또는 SendGrid 등 전문 이메일 서비스 도입

### 문제 4: Google Apps Script 실행 오류

**원인**: 권한 미승인

**해결**:
1. Google Apps Script 에디터에서 함수 실행
2. 권한 요청 팝업에서 **"권한 검토"** 클릭
3. 모든 권한 승인

---

## 🔒 보안 권장사항

1. **환경변수 보호**
   - Vercel 환경변수에만 웹훅 URL 저장
   - 코드에 URL 하드코딩 절대 금지

2. **웹훅 인증 추가 (선택사항)**
   - Google Apps Script에서 요청 헤더 또는 시크릿 키 검증
   - 무단 요청 차단

3. **이메일 발송 제한**
   - Gmail 일일 발송 제한: 100통 (일반), 1,500통 (Google Workspace)
   - 대량 발송 필요 시 SendGrid, AWS SES 등 고려

---

## 📚 추가 자료

- [Google Apps Script 공식 문서](https://developers.google.com/apps-script)
- [MailApp 클래스 레퍼런스](https://developers.google.com/apps-script/reference/mail/mail-app)
- [HTML 이메일 템플릿 가이드](https://www.campaignmonitor.com/css/)

---

## 💡 다음 단계

환영 이메일 발송이 정상 작동하면:

1. ✅ 신규 회원 가입 시 자동 환영 이메일 발송
2. ✅ 관리자에게 텔레그램 + 이메일 알림
3. 📧 추가 이메일 기능 확장 가능:
   - 비밀번호 재설정 이메일
   - 상담 완료 안내 이메일
   - 정기 뉴스레터 발송

---

*최종 업데이트: 2025-10-08*
*작성자: Claude Code*
