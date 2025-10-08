/**
 * 나라똔 신규 회원 환영 이메일 발송 웹훅
 *
 * Google Apps Script에 복사하여 사용
 * 배포: 웹 앱으로 배포 → 액세스 권한: "모든 사용자"
 *
 * 작성일: 2025-10-08
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

  return `
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
        안녕하세요, <span class="highlight">${userName}</span>님!<br>
        <strong>나라똔</strong>에 가입해 주셔서 진심으로 감사드립니다.
      </div>

      <p style="line-height: 1.8; color: #555555;">
        ${provider}으로 간편하게 가입하셨습니다.<br>
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
        <a href="${myPageUrl}" class="button">
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
        <a href="${websiteUrl}">홈페이지</a> |
        <a href="${loginUrl}">로그인</a> |
        <a href="${myPageUrl}">마이페이지</a>
      </div>

      <p style="margin: 10px 0;">
        <strong>나라똔</strong><br>
        사업자의 성공 파트너
      </p>

      <p style="margin: 10px 0; font-size: 12px; color: #999999;">
        이 이메일은 나라똔 회원가입 시 자동으로 발송됩니다.<br>
        © ${year} 나라똔. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
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
