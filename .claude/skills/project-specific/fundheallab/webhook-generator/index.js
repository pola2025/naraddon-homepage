/**
 * Webhook Generator Skill
 * @purpose Google Apps Script 웹훅 자동 생성
 * @context 기업심사관 프로젝트 전용 - 텔레그램 연동
 */

module.exports = {
  name: 'webhook-generator',
  version: '1.0.0',
  description: 'Google Apps Script 웹훅 자동 생성 (텔레그램 연동)',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {object} context.brandInfo - 브랜드 정보
   * @param {string} context.brandInfo.telegramChatId - 텔레그램 채팅 ID (필수)
   * @param {string} context.brandInfo.spreadsheetId - 구글 스프레드시트 ID (선택)
   */
  async run(context) {
    console.log('📡 [webhook-generator] 웹훅 스크립트 생성 시작...\n');

    const brandInfo = context.brandInfo || {};

    // 필수 정보 검증
    if (!brandInfo.telegramChatId) {
      return {
        success: false,
        error: '텔레그램 채팅 ID가 필요합니다',
        missingFields: ['telegramChatId'],
      };
    }

    // 기본값 설정
    const config = {
      spreadsheetId: brandInfo.spreadsheetId || '',
      telegram: {
        botToken: '7947112373:AAGXL3AO9D8jkWnFkuUmU_VQbNpvOWHZREI', // 고정값
        chatId: brandInfo.telegramChatId,
      },
      email: {
        to: brandInfo.email || '',
        bcc: 'mkt@polarad.co.kr',
      },
      brand: {
        name: brandInfo.brandName || '',
        fullName: brandInfo.brandName || '',
        phone: brandInfo.phone || '',
        mobile: brandInfo.phone || '',
        ceo: brandInfo.ceo || '',
        address: brandInfo.address || '',
        bizNo: brandInfo.bizNo || '',
        email: brandInfo.email || '',
        color: {
          primary: brandInfo.primaryColor || '#0f172e',
          secondary: brandInfo.accentColor || '#d4af37',
          accent: brandInfo.accentColor || '#d4af37',
          gradient: `linear-gradient(135deg, ${brandInfo.primaryColor || '#0f172e'} 0%, ${brandInfo.accentColor || '#d4af37'} 100%)`,
        },
      },
    };

    // 웹훅 스크립트 생성
    const webhookScript = this.generateWebhookScript(config);

    console.log('✅ 웹훅 스크립트 생성 완료\n');

    return {
      success: true,
      webhookScript,
      config,
      instructions: this.getInstructions(),
    };
  },

  /**
   * 웹훅 스크립트 생성
   */
  generateWebhookScript(config) {
    return `const CONFIG = {
  SPREADSHEET_ID: '${config.spreadsheetId}', // ${config.brand.name} 스프레드시트 ID
  TELEGRAM: {
    BOT_TOKEN: '${config.telegram.botToken}', // 텔레그램 봇 토큰 (고정)
    CHAT_ID: '${config.telegram.chatId}' // ${config.brand.name} 채팅 ID
  },
  EMAIL: {
    TO: '${config.email.to}', // ${config.brand.name} 이메일
    BCC: '${config.email.bcc}' // 마케팅 부서
  },
  BRAND: {
    NAME: '${config.brand.name}',
    FULL_NAME: '${config.brand.fullName}',
    PHONE: '${config.brand.phone}',
    MOBILE: '${config.brand.mobile}',
    CEO: '${config.brand.ceo}',
    ADDRESS: '${config.brand.address}',
    BIZ_NO: '${config.brand.bizNo}',
    EMAIL: '${config.brand.email}',
    COLOR: {
      PRIMARY: '${config.brand.color.primary}',     // Primary Color
      SECONDARY: '${config.brand.color.secondary}',   // Accent Color
      ACCENT: '${config.brand.color.accent}',      // Accent Color
      GRADIENT: '${config.brand.color.gradient}'
    }
  }
};

// 입력폼용 doPost 함수
function doPost(e) {
  console.log('=== doPost 함수 시작 ===');
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // 헤더가 없을 경우 추가
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        '접수일시', '회사명', '사업자등록번호', '담당자명', '직책',
        '연락처', '이메일', '업종', '설립연도', '희망자금규모',
        '자금종류', '상담내용', '개인정보동의', '상담희망시간'
      ]);
    }

    const koreanTime = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    const newRow = [
      koreanTime,
      data.company || '',
      data.bizno || '',
      data.name || '',
      data.position || '',
      data.phone || '',
      data.email || '',
      data.industry || '',
      data.founded || '',
      data.amount || '',
      data.fundType || '',
      data.message || '',
      data.privacy || 'false',
      data.consultTime || ''
    ];

    sheet.appendRow(newRow);
    const lastRow = sheet.getLastRow();

    const notificationData = {
      timestamp: koreanTime,
      company: data.company,
      bizno: data.bizno,
      name: data.name,
      position: data.position,
      phone: data.phone,
      email: data.email,
      industry: data.industry,
      founded: data.founded,
      amount: data.amount,
      fundType: data.fundType,
      message: data.message,
      privacy: data.privacy,
      consultTime: data.consultTime,
      source: '홈페이지 접수',
      row: lastRow
    };

    sendTelegramNotificationFromForm(notificationData);
    sendEmailNotification(notificationData);

    return ContentService.createTextOutput(JSON.stringify({
      result: 'success',
      message: '신규상담신청이 정상적으로 접수되었습니다.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('=== doPost 함수 에러 ===', error);
    sendErrorToTelegram('doPost 에러: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      result: 'error',
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 향상된 이메일 알림 전송 함수
function sendEmailNotification(data) {
  try {
    const subject = \`[\${CONFIG.BRAND.NAME}] 신규상담신청 접수: \${data.company || '미입력'}\`;
    const safeString = (value, preWrap = false) => {
      const str = (value || '').toString().trim() || '미입력';
      return preWrap ? str.replace(/\\n/g, '<br>') : str;
    };

    const htmlBody = \`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Malgun Gothic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
  <div style="width: 100%; background-color: #f5f7fa; padding: 40px 20px;">
    <div style="max-width: 640px; margin: 0 auto;">

      <!-- 메인 카드 -->
      <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">

        <!-- 헤더 -->
        <div style="background: \${CONFIG.BRAND.COLOR.GRADIENT}; padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
            \${CONFIG.BRAND.FULL_NAME}
          </h1>
          <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
            신규상담신청이 접수되었습니다
          </p>
        </div>

        <!-- 컨텐츠 영역 -->
        <div style="padding: 40px 30px;">

          <!-- 기본 정보 섹션 -->
          <div style="margin-bottom: 35px;">
            <h2 style="margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid \${CONFIG.BRAND.COLOR.PRIMARY}; color: \${CONFIG.BRAND.COLOR.PRIMARY}; font-size: 18px; font-weight: 600;">
              📋 기본 정보
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 14px 16px; background: #f8f9fb; border-radius: 8px 0 0 0; font-weight: 600; color: #4a5568; width: 140px; font-size: 14px;">접수일시</td>
                <td style="padding: 14px 16px; background: #f8f9fb; border-radius: 0 8px 0 0; color: #2d3748; font-size: 14px;">\${safeString(data.timestamp)}</td>
              </tr>
              <tr>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #4a5568; font-size: 14px;">회사명</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px; font-weight: 600;">\${safeString(data.company)}</td>
              </tr>
              <tr>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #4a5568; font-size: 14px;">사업자번호</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px;">\${safeString(data.bizno)}</td>
              </tr>
              <tr>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #4a5568; font-size: 14px;">담당자</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px;">\${safeString(data.name)} \${data.position ? \`(\${safeString(data.position)})\` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #4a5568; font-size: 14px;">연락처</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px;">
                  <a href="tel:\${safeString(data.phone)}" style="color: \${CONFIG.BRAND.COLOR.ACCENT}; text-decoration: none; font-weight: 500;">\${safeString(data.phone)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 14px 16px; font-weight: 600; color: #4a5568; font-size: 14px;">이메일</td>
                <td style="padding: 14px 16px; color: #2d3748; font-size: 14px;">
                  <a href="mailto:\${safeString(data.email)}" style="color: \${CONFIG.BRAND.COLOR.ACCENT}; text-decoration: none;">\${safeString(data.email)}</a>
                </td>
              </tr>
            </table>
          </div>

          <!-- 사업 정보 섹션 -->
          <div style="margin-bottom: 35px;">
            <h2 style="margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid \${CONFIG.BRAND.COLOR.PRIMARY}; color: \${CONFIG.BRAND.COLOR.PRIMARY}; font-size: 18px; font-weight: 600;">
              🏢 사업 정보
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #4a5568; width: 140px; font-size: 14px;">업종</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px;">\${safeString(data.industry)}</td>
              </tr>
              <tr>
                <td style="padding: 14px 16px; font-weight: 600; color: #4a5568; font-size: 14px;">설립연도</td>
                <td style="padding: 14px 16px; color: #2d3748; font-size: 14px;">\${safeString(data.founded)}</td>
              </tr>
            </table>
          </div>

          <!-- 자금 정보 섹션 -->
          <div style="margin-bottom: 35px;">
            <h2 style="margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid \${CONFIG.BRAND.COLOR.PRIMARY}; color: \${CONFIG.BRAND.COLOR.PRIMARY}; font-size: 18px; font-weight: 600;">
              💰 자금 정보
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #4a5568; width: 140px; font-size: 14px;">희망자금규모</td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px; font-weight: 600; color: \${CONFIG.BRAND.COLOR.ACCENT};">\${safeString(data.amount)}</td>
              </tr>
              <tr>
                <td style="padding: 14px 16px; font-weight: 600; color: #4a5568; font-size: 14px;">자금종류</td>
                <td style="padding: 14px 16px; color: #2d3748; font-size: 14px;">\${safeString(data.fundType)}</td>
              </tr>
            </table>
          </div>

          <!-- 상담 희망시간 섹션 -->
          \${data.consultTime && data.consultTime.trim() !== '' ? \`
          <div style="margin-bottom: 35px;">
            <h2 style="margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid \${CONFIG.BRAND.COLOR.PRIMARY}; color: \${CONFIG.BRAND.COLOR.PRIMARY}; font-size: 18px; font-weight: 600;">
              ⏰ 상담 희망시간
            </h2>
            <div style="background: #e0f2fe; border-left: 4px solid \${CONFIG.BRAND.COLOR.ACCENT}; padding: 20px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #2d3748; line-height: 1.7; font-size: 14px; font-weight: 600;">\${safeString(data.consultTime)}</p>
            </div>
          </div>
          \` : ''}

          <!-- 상담 내용 섹션 -->
          \${data.message && data.message.trim() !== '' ? \`
          <div style="margin-bottom: 35px;">
            <h2 style="margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid \${CONFIG.BRAND.COLOR.PRIMARY}; color: \${CONFIG.BRAND.COLOR.PRIMARY}; font-size: 18px; font-weight: 600;">
              📝 상담 내용
            </h2>
            <div style="background: #f0f9ff; border-left: 4px solid \${CONFIG.BRAND.COLOR.ACCENT}; padding: 20px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #2d3748; line-height: 1.7; font-size: 14px; white-space: pre-wrap;">\${safeString(data.message, true)}</p>
            </div>
          </div>
          \` : ''}

          <!-- 개인정보 동의 상태 -->
          <div style="padding: 16px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; margin-bottom: 25px;">
            <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px;">
              <strong>개인정보 수집·이용 동의:</strong>
              <span style="font-weight: 600; color: \${(data.privacy === 'true' || data.privacy === true || data.privacy === '동의') ? '#059669' : '#dc2626'};">
                \${(data.privacy === 'true' || data.privacy === true || data.privacy === '동의') ? '✅ 동의함' : '❌ 미동의'}
              </span>
            </p>
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>접수출처:</strong>
              <span style="font-weight: 600;">\${data.source || '홈페이지 접수'}</span>
            </p>
          </div>

          <!-- 액션 버튼 -->
          <div style="text-align: center; padding-top: 20px;">
            <a href="https://docs.google.com/spreadsheets/d/\${CONFIG.SPREADSHEET_ID}/edit#gid=0&range=A\${data.row}"
               style="display: inline-block; padding: 14px 32px; background: \${CONFIG.BRAND.COLOR.PRIMARY}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px 0 rgba(37,99,235,0.25);">
              📊 스프레드시트에서 확인하기
            </a>
          </div>

        </div>

        <!-- 푸터 -->
        <div style="background: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px;">
            이 메일은 <strong>\${CONFIG.BRAND.NAME}</strong> 홈페이지에서 자동 발송되었습니다.
          </p>
          <p style="margin: 0 0 8px 0; color: #718096; font-size: 12px;">
            대표: \${CONFIG.BRAND.CEO} | 사업자번호: \${CONFIG.BRAND.BIZ_NO}
          </p>
          <p style="margin: 0; color: #a0aec0; font-size: 12px;">
            문의: \${CONFIG.BRAND.PHONE} / \${CONFIG.BRAND.MOBILE}
          </p>
        </div>

      </div>

    </div>
  </div>
</body>
</html>
    \`;

    GmailApp.sendEmail(CONFIG.EMAIL.TO, subject, '', {
      htmlBody: htmlBody,
      bcc: CONFIG.EMAIL.BCC
    });

    console.log('✅ 이메일 알림 전송 완료');
  } catch (error) {
    console.error('❌ 이메일 전송 오류:', error);
    sendErrorToTelegram('이메일 전송 에러: ' + error.toString());
  }
}

// 입력폼용 텔레그램 알림 함수
function sendTelegramNotificationFromForm(data) {
  try {
    const safeString = (value) => (value || '').toString().trim() || '미입력';

    let message = \`🔔 <b>신규상담신청 접수 (\${CONFIG.BRAND.NAME} 홈페이지)</b>\\n\\n\`;

    message += \`<b>[기본 정보]</b>\\n\`;
    message += \`<b>접수일시:</b> \${safeString(data.timestamp)}\\n\`;
    message += \`<b>회사명:</b> \${safeString(data.company)}\\n\`;
    message += \`<b>사업자번호:</b> \${safeString(data.bizno)}\\n\`;
    message += \`<b>담당자:</b> \${safeString(data.name)} (\${safeString(data.position)})\\n\`;
    message += \`<b>연락처:</b> <code>\${safeString(data.phone)}</code>\\n\`;
    message += \`<b>이메일:</b> \${safeString(data.email)}\\n\\n\`;

    message += \`<b>[사업 정보]</b>\\n\`;
    message += \`<b>업종:</b> \${safeString(data.industry)}\\n\`;
    message += \`<b>설립연도:</b> \${safeString(data.founded)}\\n\\n\`;

    message += \`<b>[자금 정보]</b>\\n\`;
    message += \`<b>희망자금:</b> \${safeString(data.amount)}\\n\`;
    message += \`<b>자금종류:</b> \${safeString(data.fundType)}\\n\\n\`;

    if (data.consultTime && data.consultTime.trim() !== '' && data.consultTime.trim() !== '미입력') {
      message += \`<b>⏰ 상담희망시간:</b> \${safeString(data.consultTime)}\\n\\n\`;
    }

    if (data.message && data.message.trim() !== '' && data.message.trim() !== '미입력') {
      message += \`<b>📝 상담내용:</b> \${safeString(data.message)}\\n\`;
    }

    message += \`\\n────────────────────\\n\`;
    message += \`<b>개인정보동의:</b> \${(data.privacy === 'true' || data.privacy === true || data.privacy === '동의' ? '✅ 동의함' : '❌ 미동의')}\\n\`;
    message += \`<b>접수출처:</b> \${data.source || '홈페이지 접수'}\\n\`;
    message += \`📊 <a href="https://docs.google.com/spreadsheets/d/\${CONFIG.SPREADSHEET_ID}/edit#gid=0&range=A\${data.row}">스프레드시트에서 전체보기</a>\`;

    sendToTelegram(message);
    console.log('✅ 텔레그램 알림 전송 완료');
  } catch (error) {
    console.error('❌ 텔레그램 알림 구성 오류:', error);
    sendErrorToTelegram('입력폼 알림 에러: ' + error.toString());
  }
}

// 공통 텔레그램 전송 함수
function sendToTelegram(message) {
  try {
    if (!message || typeof message !== 'string') {
      throw new Error('전송할 메시지가 유효하지 않습니다.');
    }

    const url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM.BOT_TOKEN + '/sendMessage';
    const payload = {
      chat_id: String(CONFIG.TELEGRAM.CHAT_ID),
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };

    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseData = JSON.parse(response.getContentText());

    if (responseData.ok) {
      console.log('✅ 텔레그램 메시지 전송 성공');
    } else {
      console.error('❌ 텔레그램 전송 실패:', responseData.description);
      sendErrorToTelegram('텔레그램 API 에러: ' + responseData.description);
    }
  } catch (error) {
    console.error('텔레그램 전송 중 심각한 오류:', error);
  }
}

// 에러 전용 텔레그램 전송 함수
function sendErrorToTelegram(errorMessage) {
  try {
    const koreanTime = new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'});
    const message = \`🚨 <b>[\${CONFIG.BRAND.NAME}] 시스템 에러</b>\\n\\n\` +
                   \`⏰ <b>시간:</b> \${koreanTime}\\n\` +
                   \`❌ <b>에러:</b> \${errorMessage}\`;

    const url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM.BOT_TOKEN + '/sendMessage';
    const payload = {
      chat_id: String(CONFIG.TELEGRAM.CHAT_ID),
      text: message,
      parse_mode: 'HTML'
    };

    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error('에러 알림 전송조차 실패:', e);
  }
}

// 수동 작성/수정용 onEdit 함수
function onEdit(e) {
  try {
    const range = e.range;
    if (range.getRow() <= 1) return;

    const sheet = e.source.getActiveSheet();
    const editedRow = range.getRow();
    const rowData = sheet.getRange(editedRow, 1, 1, sheet.getLastColumn()).getValues()[0];

    const data = {
      company: rowData[1],
      name: rowData[3],
      phone: rowData[5],
      amount: rowData[9],
      consultTime: rowData[13]
    };

    const safeString = (value) => (value || '').toString().trim() || '미입력';

    let message = \`✏️ <b>상담 신청 수동 입력/수정 (\${CONFIG.BRAND.NAME})</b>\\n\\n\`;
    message += \`🏢 <b>회사명:</b> \${safeString(data.company)}\\n\`;
    message += \`👤 <b>담당자:</b> \${safeString(data.name)}\\n\`;
    message += \`📞 <b>연락처:</b> <code>\${safeString(data.phone)}</code>\\n\`;
    message += \`💰 <b>희망자금:</b> \${safeString(data.amount)}\\n\`;

    if (data.consultTime && data.consultTime.trim() !== '') {
      message += \`⏰ <b>상담희망시간:</b> \${safeString(data.consultTime)}\\n\`;
    }

    message += \`\\n📋 <b>행 번호:</b> \${editedRow}번\\n\`;
    message += \`📊 <a href="https://docs.google.com/spreadsheets/d/\${CONFIG.SPREADSHEET_ID}/edit#gid=0&range=A\${editedRow}">스프레드시트에서 확인</a>\`;

    sendToTelegram(message);

  } catch (error) {
    console.error('onEdit 트리거 오류:', error);
    sendErrorToTelegram('onEdit 알림 에러: ' + error.toString());
  }
}

// 테스트 및 유틸리티 함수들
function doGet() {
  return ContentService.createTextOutput(\`\${CONFIG.BRAND.NAME} Apps Script가 정상 작동 중입니다.\`);
}

// 텔레그램 단독 테스트
function testTelegramMessage() {
  try {
    console.log('텔레그램 단독 발송 테스트를 시작합니다.');
    const messageToSend = \`🧪 <b>\${CONFIG.BRAND.NAME} 텔레그램 테스트</b>\\n\\n\` +
                        '이 메시지가 정상적으로 수신되면, 봇 토큰과 채팅 ID 설정이 모두 올바른 것입니다.\\n\\n' +
                        '<b>테스트 시간:</b> ' +
                        new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    sendToTelegram(messageToSend);
    console.log('테스트 메시지를 성공적으로 전송 요청했습니다. 텔레그램을 확인해주세요.');
  } catch (error) {
    console.error('텔레그램 테스트 중 오류가 발생했습니다.', error);
  }
}

// 실제 데이터 형식 테스트
function testWithRealData() {
  const testData = {
    timestamp: new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}),
    company: '테스트 주식회사',
    bizno: '123-45-67890',
    name: '홍길동',
    position: '대표이사',
    phone: '010-1234-5678',
    email: 'test@example.com',
    industry: 'IT 서비스업',
    founded: '2023',
    amount: '3억원',
    fundType: '운영자금',
    privacy: 'true',
    message: '정책자금 상담을 신청합니다.\\n빠른 연락 부탁드립니다.',
    consultTime: '오전 10시-12시',
    row: 999
  };

  try {
    console.log('실제 데이터 형식으로 테스트 시작...');
    sendTelegramNotificationFromForm(testData);
    sendEmailNotification(testData);
    console.log('✅ 실제 데이터 형식 테스트 완료!');
  } catch (error) {
    console.error('❌ 실제 데이터 형식 테스트 실패:', error);
  }
}

// 설정 확인 함수
function checkConfiguration() {
  console.log('=== 현재 설정 확인 ===');
  console.log('브랜드명:', CONFIG.BRAND.NAME);
  console.log('대표:', CONFIG.BRAND.CEO);
  console.log('사업자번호:', CONFIG.BRAND.BIZ_NO);
  console.log('대표번호:', CONFIG.BRAND.PHONE);
  console.log('휴대폰:', CONFIG.BRAND.MOBILE);
  console.log('이메일 수신자:', CONFIG.EMAIL.TO);
  console.log('이메일 BCC:', CONFIG.EMAIL.BCC);
  console.log('주소:', CONFIG.BRAND.ADDRESS);
  console.log('스프레드시트 ID:', CONFIG.SPREADSHEET_ID);
  console.log('텔레그램 채팅 ID:', CONFIG.TELEGRAM.CHAT_ID);
  console.log('브랜드 컬러:', CONFIG.BRAND.COLOR.PRIMARY);
  console.log('===================');

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    console.log('✅ 스프레드시트 접근 성공:', sheet.getName());
  } catch (error) {
    console.error('❌ 스프레드시트 접근 실패:', error.toString());
  }
}
`;
  },

  /**
   * 사용 안내
   */
  getInstructions() {
    return [
      {
        step: 1,
        title: 'Google Apps Script 열기',
        description: '구글 스프레드시트 → 확장 프로그램 → Apps Script',
      },
      {
        step: 2,
        title: '코드 붙여넣기',
        description: '생성된 웹훅 스크립트를 Code.gs에 붙여넣기',
      },
      {
        step: 3,
        title: '배포',
        description: '배포 → 새 배포 → 웹 앱으로 배포 → URL 복사',
      },
      {
        step: 4,
        title: '입력폼과 연결',
        description: '복사한 URL을 입력폼의 action 속성에 설정',
      },
      {
        step: 5,
        title: '테스트',
        description: 'testTelegramMessage() 함수 실행하여 텔레그램 연동 확인',
      },
    ];
  },
};
