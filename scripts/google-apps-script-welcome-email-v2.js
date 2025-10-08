/**
 * 나라똔 신규 회원 환영 이메일 발송 웹훅 (v2 - 인라인 스타일)
 *
 * Google Apps Script에 복사하여 사용
 * 배포: 웹 앱으로 배포 → 액세스 권한: "모든 사용자"
 *
 * 작성일: 2025-10-08
 * 버전: 2.0 (인라인 스타일 적용 - 이메일 클라이언트 호환성 개선)
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
    replyTo: 'jjk_naraddon@naver.com',
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

// 환영 이메일 HTML 템플릿 생성 (인라인 스타일)
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
</head>
<body style="margin: 0; padding: 0; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- 메인 컨테이너 -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

          <!-- 헤더 -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🎉 나라똔 가입을 환영합니다!
              </h1>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- 인사말 -->
              <div style="font-size: 18px; color: #333333; margin-bottom: 20px; line-height: 1.6;">
                안녕하세요, <span style="color: #667eea; font-weight: bold;">${userName}</span>님!<br>
                <strong>나라똔</strong>에 가입해 주셔서 진심으로 감사드립니다.
              </div>

              <p style="line-height: 1.8; color: #555555; margin: 20px 0;">
                ${provider}으로 간편하게 가입하셨습니다.<br>
                이제 나라똔의 다양한 서비스를 이용하실 수 있습니다.
              </p>

              <!-- 서비스 안내 박스 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border-left: 4px solid #667eea; margin: 30px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 16px;">
                      📌 나라똔에서 제공하는 서비스
                    </h3>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0; color: #555555; line-height: 1.6;">
                          <strong>• 전문가 상담:</strong> 사업 관련 전문가의 1:1 맞춤 상담
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #555555; line-height: 1.6;">
                          <strong>• 기업심사관 매칭:</strong> 정부지원사업 신청 전문가 연결
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #555555; line-height: 1.6;">
                          <strong>• 정책 소식:</strong> 최신 정부지원정책 및 사업 정보
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #555555; line-height: 1.6;">
                          <strong>• 나라똔튜브:</strong> 사업에 도움되는 영상 콘텐츠
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #555555; line-height: 1.6;">
                          <strong>• 비즈니스 보이스:</strong> 사업자 커뮤니티 및 Q&A
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA 버튼 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${myPageUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      내 정보 확인하기
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin-top: 30px; color: #666666; font-size: 14px; line-height: 1.6;">
                궁금하신 사항이 있으시면 언제든지 문의해 주세요.<br>
                나라똔이 여러분의 성공적인 사업을 응원합니다! 💪
              </p>

            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; color: #666666; font-size: 14px; border-top: 1px solid #eeeeee;">

              <div style="margin: 20px 0;">
                <a href="${websiteUrl}" style="color: #667eea; text-decoration: none; margin: 0 10px;">홈페이지</a>
                <span style="color: #cccccc;">|</span>
                <a href="${loginUrl}" style="color: #667eea; text-decoration: none; margin: 0 10px;">로그인</a>
                <span style="color: #cccccc;">|</span>
                <a href="${myPageUrl}" style="color: #667eea; text-decoration: none; margin: 0 10px;">마이페이지</a>
              </div>

              <p style="margin: 10px 0; font-weight: bold;">
                나라똔<br>
                <span style="font-weight: normal; font-size: 12px;">사업자의 성공 파트너</span>
              </p>

              <p style="margin: 10px 0; font-size: 12px; color: #999999;">
                이 이메일은 나라똔 회원가입 시 자동으로 발송됩니다.<br>
                © ${year} 나라똔. All rights reserved.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
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
    version: '2.0',
    service: 'Naraddon Welcome Email',
    status: 'active',
    update: 'Inline styles for better email client compatibility'
  });
}
