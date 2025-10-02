// ================================================
// 솔트 기업성장연구소 - Meta 리드 웹훅 처리 시스템
// 웹앱 배포 버전 - 2025.01.20 (SMS OFF)
// 텔레그램 + 이메일 알림
// ================================================

// 통일된 설정값
const CONFIG = {
  SPREADSHEET_ID: '1b0Hi8zYyfCZxKWi0234SAjkJ1lm2a3fAEs98u9Fpw4o',
  TELEGRAM: {
    BOT_TOKEN: '7947112373:AAGXL3AO9D8jkWnFkuUmU_VQbNpvOWHZREI',
    CHAT_ID: '-1003009690358'
  },
  EMAIL: {
    TO: 'saltbizgrow@gmail.com',
    BCC: 'mkt@polarad.co.kr',
    SUBJECT_PREFIX: '[솔트 기업성장연구소] '
  },
  SENS: {
    ENABLED: false  // SMS 비활성화
  },
  WEBHOOK_SECRET: 'salt2025secret',
  COMPANY_INFO: {
    NAME: '솔트 기업성장연구소',
    CEO: '이빈',
    PHONE: '1844-2611',
    ADDRESS: '경기도 부천시 원미구 중동로 248번길 105, 6층 602-27호',
    BIZ_NUMBER: '276-34-01483',
    HOMEPAGE: 'https://saltbizgrow.imweb.me/'
  }
};

// 실제 시트 데이터 컬럼 매핑
const COLUMN_MAP = {
  timestamp: 1,      // A열: 접수일
  platform: 2,       // B열: 플랫폼
  adName: 3,         // C열: 광고명
  bizType: 4,        // D열: 사업자종류
  location: 5,       // E열: 지역
  name: 6,           // F열: 이름
  phone: 7,          // G열: 연락처
  company: 8,        // H열: 상호명
  industry: 9,       // I열: 업종
  revenue: 10,       // J열: 직전년도매출
  amount: 11,        // K열: 필요자금
  privacy: 12,       // L열: 안내고지
  consultTime: 13,   // M열: 상담희망시간
  smsStatus: 14,     // N열: SMS발송
  telegramStatus: 15,// O열: 텔레그램발송
  emailStatus: 16,   // P열: 메일발송
  source: 17         // Q열: 접수플랫폼
};

// ===== 웹앱 엔트리 포인트 =====
function doPost(e) {
  try {
    console.log('=== 솔트 기업성장연구소 웹훅 수신 ===');
    console.log('원본 데이터:', e.postData?.contents);

    // POST 데이터 파싱
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
      console.log('파싱된 데이터:', JSON.stringify(data));
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      throw new Error('No data received');
    }

    // Secret 키 검증 (Make 웹훅 보안)
    if (CONFIG.WEBHOOK_SECRET) {
      const receivedSecret = data.webhook_secret || data.secret || e.parameter?.secret;
      if (receivedSecret !== CONFIG.WEBHOOK_SECRET) {
        console.error('Invalid webhook secret');
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Unauthorized: Invalid secret'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      console.log('✅ Secret 검증 성공');
    }

    // Meta 리드 데이터 정규화
    const normalizedData = normalizeMetaLeadData(data);
    console.log('정규화된 데이터:', JSON.stringify(normalizedData));
    console.log('업종:', normalizedData.industry);
    console.log('사업자종류:', normalizedData.bizType);
    console.log('상담희망시간:', normalizedData.consultTime);

    // 데이터 처리
    const result = processLead(normalizedData);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Lead processed successfully',
      result: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('웹훅 처리 오류:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== Meta 플랫폼 감지 함수 =====
function detectMetaPlatform(data) {
  if (data.platform) {
    return data.platform;
  }

  if (data.form_id) {
    if (data.form_id.includes('instagram')) return '인스타그램';
    if (data.form_id.includes('facebook')) return '페이스북';
  }

  if (data.source) {
    if (data.source.toLowerCase().includes('instagram')) return '인스타그램';
    if (data.source.toLowerCase().includes('facebook')) return '페이스북';
  }

  return 'Meta';
}

// ===== Meta 리드 데이터 정규화 =====
function normalizeMetaLeadData(rawData) {
  // Meta에서 오는 다양한 필드명을 통일된 형식으로 변환
  const normalized = {
    // 기본 정보
    name: rawData.full_name || rawData.name || rawData.이름 || '',
    phone: rawData.phone_number || rawData.phone || rawData.전화번호 || rawData.연락처 || '',
    company: rawData.company_name || rawData.company || rawData.상호명 || rawData.회사명 || '',

    // 사업 정보
    industry: rawData.industry || rawData.업종 || rawData.business_type || '',
    location: rawData.city || rawData.location || rawData.지역 || rawData.위치 || '',
    bizType: rawData.business_type || rawData.bizType || rawData.사업자종류 || rawData.사업자형태 || '',
    revenue: rawData.revenue || rawData.annual_revenue || rawData.매출 || rawData.연매출 || '',
    amount: rawData.loan_amount || rawData.amount || rawData.필요자금 || rawData.대출금액 || '',

    // 상담 정보
    consultTime: rawData.preferred_contact_time ||
                 rawData.consultation_time ||
                 rawData.consultTime ||
                 rawData.상담희망시간 ||
                 rawData.희망시간 ||
                 rawData.상담가능시간 || '',

    // 광고 정보
    adName: rawData.ad_name || rawData.adName || rawData.광고명 || rawData.캠페인명 || '',

    // 기타
    privacy: rawData.privacy || rawData.개인정보동의 || 'Y',
    platform: detectMetaPlatform(rawData),
    timestamp: rawData.timestamp || new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };

  return normalized;
}

// ===== 리드 처리 메인 함수 (SMS OFF) =====
function processLead(data) {
  console.log('=== 솔트 기업성장연구소 리드 처리 시작 ===');
  console.log('받은 데이터:', JSON.stringify(data));

  // 타임스탬프 추가
  if (!data.timestamp) {
    data.timestamp = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // 스프레드시트에 저장
  const rowNumber = saveToSheet(data);
  console.log(`✅ 스프레드시트 저장 완료: ${rowNumber}번 행`);

  // SMS는 비활성화 상태
  console.log('ℹ️ SMS 발송: 비활성화 상태');
  updateSmsStatus(rowNumber, '비활성화');

  // 이메일 발송
  const emailSent = sendEmailNotification(data, rowNumber);

  // 텔레그램 알림
  const telegramSent = sendTelegramNotification(data, rowNumber);

  // 상태 업데이트
  updateStatus(rowNumber, {
    email: emailSent,
    telegram: telegramSent
  });

  return {
    rowNumber: rowNumber,
    emailSent: emailSent,
    telegramSent: telegramSent,
    smsStatus: '비활성화',
    platform: data.platform
  };
}

// ===== 스프레드시트 저장 =====
function saveToSheet(data) {
  const sheet = getSheet();

  // 현재 시간 (한국 시간)
  const koreaTime = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // 접수 출처 상세 정보
  const sourceDetail = `${data.platform || 'Meta'} - ${data.adName || data.ad_name || data.form_name || '직접접수'}`;

  // 상담희망시간 처리 (값이 없으면 '미선택' 표시)
  const consultTimeValue = data.consultTime || '미선택';

  // 데이터 행 구성
  const rowData = [
    koreaTime,                        // A: 접수일
    data.platform || 'Meta',          // B: 플랫폼
    data.adName || '',                 // C: 광고명
    data.bizType || '',                // D: 사업자종류
    data.location || '',               // E: 지역
    data.name || '',                   // F: 이름
    normalizePhoneNumber(data.phone), // G: 연락처
    data.company || '',                // H: 상호명
    data.industry || '',               // I: 업종
    data.revenue || '',                // J: 직전년도매출
    data.amount || '',                 // K: 필요자금
    data.privacy || 'Y',               // L: 안내고지
    consultTimeValue,                  // M: 상담희망시간
    'SMS_OFF',                         // N: SMS발송
    '대기',                            // O: 텔레그램발송
    '대기',                            // P: 메일발송
    sourceDetail                       // Q: 접수플랫폼
  ];

  // 스프레드시트에 행 추가
  sheet.appendRow(rowData);
  const lastRow = sheet.getLastRow();

  console.log(`데이터 저장 완료: ${lastRow}번 행`);
  console.log(`상담희망시간: ${consultTimeValue}`);
  return lastRow;
}

// ===== SMS 상태 업데이트 (비활성화 표시) =====
function updateSmsStatus(rowNumber, status) {
  try {
    const sheet = getSheet();
    const currentTime = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const smsStatusText = `⏸️ SMS_OFF_${currentTime}`;

    sheet.getRange(rowNumber, COLUMN_MAP.smsStatus).setValue(smsStatusText);
    console.log(`SMS 상태 기록: ${smsStatusText}`);
  } catch (error) {
    console.error('SMS 상태 업데이트 실패:', error);
  }
}

// ===== 이메일 발송 =====
function sendEmailNotification(data, rowNumber) {
  try {
    // data 객체가 없거나 빈 객체인 경우 처리
    if (!data) {
      data = {};
    }

    const platform = data.platform || 'Meta';
    const platformEmoji = platform === '인스타그램' ? '📷' : '👍';
    const adInfo = data.adName ? ` [광고: ${data.adName}]` : '';
    const subject = `${CONFIG.EMAIL.SUBJECT_PREFIX}${platformEmoji} ${platform} 정책자금 상담 신청 [${data.company || '미입력'}]${adInfo}`;

    // HTML 이메일 본문 (솔트 블루 컬러 테마)
    const htmlBody = `
      <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">💎 솔트 기업성장연구소 신규 상담 신청</h2>
          <p style="margin: 10px 0 0 0; opacity: 0.95;">${platformEmoji} ${platform} 리드 광고 접수${data.adName ? ` - ${data.adName}` : ''}</p>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="background: rgba(30, 60, 114, 0.05); padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e3c72; margin: 0 0 15px 0; font-size: 18px;">📋 접수 정보</h3>
            <table style="width: 100%;">
              <tr><td style="padding: 8px 0; color: #475569;">📅 접수일시</td><td>${safeString(data.timestamp)}</td></tr>
              <tr><td style="padding: 8px 0; color: #475569;">${platformEmoji} 플랫폼</td><td style="color: #2a5298; font-weight: 600;">${platform}</td></tr>
              ${data.adName ? `<tr><td style="padding: 8px 0; color: #475569;">📢 광고명</td><td style="color: #60a5fa; font-weight: 600;">${safeString(data.adName)}</td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #475569;">🏢 상호명</td><td style="font-weight: 600;">${safeString(data.company)}</td></tr>
              <tr><td style="padding: 8px 0; color: #475569;">👤 담당자</td><td>${safeString(data.name)}</td></tr>
              <tr><td style="padding: 8px 0; color: #475569;">📞 연락처</td><td style="color: #2a5298; font-weight: 600;">${normalizePhoneNumber(data.phone)}</td></tr>
              <tr><td style="padding: 8px 0; color: #475569;">⏰ 상담희망시간</td><td style="color: #3b82f6; font-weight: 600;">${safeString(data.consultTime) || '미선택'}</td></tr>
            </table>
          </div>

          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #60a5fa;">
            <h3 style="color: #1e3c72; margin: 0 0 15px 0; font-size: 18px;">💼 사업 정보</h3>
            <table style="width: 100%;">
              <tr><td style="padding: 8px 0; color: #475569;">🏭 업종</td><td>${safeString(data.industry)}</td></tr>
              <tr><td style="padding: 8px 0; color: #475569;">📍 지역</td><td>${safeString(data.location)}</td></tr>
              <tr><td style="padding: 8px 0; color: #475569;">💼 사업자종류</td><td>${safeString(data.bizType)}</td></tr>
              <tr><td style="padding: 8px 0; color: #475569;">💵 직전년도매출</td><td>${safeString(data.revenue)}</td></tr>
              <tr><td style="padding: 8px 0; color: #475569;">💰 필요자금</td><td style="color: #2a5298; font-weight: 700;">${safeString(data.amount)}</td></tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/edit#gid=0&range=${rowNumber}:${rowNumber}"
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #60a5fa);
                      color: white; padding: 14px 35px; text-decoration: none; border-radius: 50px; font-weight: 600;">
              📊 스프레드시트에서 확인하기
            </a>
          </div>
        </div>

        <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 0 0 10px 10px; color: #64748b; font-size: 12px;">
          <p>솔트 기업성장연구소 | ${CONFIG.COMPANY_INFO.PHONE}</p>
        </div>
      </div>
    `;

    // 일반 텍스트 본문
    const plainBody = `
[솔트 기업성장연구소] 새로운 정책자금 상담 신청

==== 접수 정보 ====
📅 접수일시: ${safeString(data.timestamp)}
${platformEmoji} 플랫폼: ${platform}
${data.adName ? `📢 광고명: ${safeString(data.adName)}\n` : ''}🏢 상호명: ${safeString(data.company)}
👤 담당자: ${safeString(data.name)}
📞 연락처: ${normalizePhoneNumber(data.phone)}
⏰ 상담희망시간: ${safeString(data.consultTime) || '미선택'}

==== 사업 정보 ====
🏭 업종: ${safeString(data.industry)}
📍 지역: ${safeString(data.location)}
💼 사업자종류: ${safeString(data.bizType)}
💵 직전년도매출: ${safeString(data.revenue)}
💰 필요자금: ${safeString(data.amount)}

📊 스프레드시트: https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}

솔트 기업성장연구소 | ${CONFIG.COMPANY_INFO.PHONE}
    `;

    // 이메일 발송
    const emailOptions = {
      to: CONFIG.EMAIL.TO,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody
    };

    if (CONFIG.EMAIL.BCC) {
      emailOptions.bcc = CONFIG.EMAIL.BCC;
    }

    MailApp.sendEmail(emailOptions);

    console.log(`✅ 이메일 발송 성공: ${CONFIG.EMAIL.TO}`);
    return true;

  } catch (error) {
    console.error('❌ 이메일 발송 실패:', error);
    return false;
  }
}

// ===== 텔레그램 알림 =====
function sendTelegramNotification(data, rowNumber) {
  try {
    // data 객체가 없거나 빈 객체인 경우 처리
    if (!data) {
      data = {};
    }

    // platform 기본값 설정
    const platform = data.platform || 'Meta';
    const platformEmoji = platform === '인스타그램' ? '📷' : '👍';

    // 텔레그램 메시지 (솔트 스타일)
    const message = `
💎 <b>솔트 기업성장연구소 신규 상담신청</b>
${platformEmoji} <b>${platform} 접수</b>${data.adName ? `\n📢 광고: ${safeString(data.adName)}` : ''}

<b>📋 기본정보</b>
├ 🏢 상호명: <b>${safeString(data.company)}</b>
├ 👤 담당자: ${safeString(data.name)}
├ 📞 연락처: <code>${normalizePhoneNumber(data.phone)}</code>
└ ⏰ 상담희망: <b>${safeString(data.consultTime) || '미선택'}</b>

<b>💼 사업정보</b>
├ 🏭 업종: ${safeString(data.industry)}
├ 📍 지역: ${safeString(data.location)}
├ 💼 사업자: ${safeString(data.bizType)}
├ 💵 매출: ${safeString(data.revenue)}
└ 💰 필요자금: <b>${safeString(data.amount)}</b>

📊 <a href="https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}/edit#gid=0&range=${rowNumber}:${rowNumber}">스프레드시트 바로가기</a>

⏰ ${new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})}
📞 문의: ${CONFIG.COMPANY_INFO.PHONE}
    `.trim();

    return sendToTelegram(message);

  } catch (error) {
    console.error('❌ 텔레그램 알림 실패:', error);
    return false;
  }
}

// ===== 텔레그램 전송 함수 =====
function sendToTelegram(message) {
  try {
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM.BOT_TOKEN}/sendMessage`;

    const payload = {
      chat_id: CONFIG.TELEGRAM.CHAT_ID,
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

    if (response.getResponseCode() === 200 && responseData.ok) {
      console.log('✅ 텔레그램 전송 성공');
      return true;
    } else {
      console.error('텔레그램 응답 오류:', responseData);
      return false;
    }

  } catch (error) {
    console.error('텔레그램 전송 실패:', error);
    return false;
  }
}

// ===== 상태 업데이트 =====
function updateStatus(rowNumber, status) {
  try {
    const sheet = getSheet();
    const currentTime = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 이메일 상태 업데이트
    if (status.email !== undefined) {
      const emailStatus = status.email
        ? `✅ 발송완료_${currentTime}`
        : `❌ 발송실패_${currentTime}`;
      sheet.getRange(rowNumber, COLUMN_MAP.emailStatus).setValue(emailStatus);
      console.log(`이메일 상태 기록: ${emailStatus}`);
    }

    // 텔레그램 상태 업데이트
    if (status.telegram !== undefined) {
      const telegramStatus = status.telegram
        ? `✅ 발송완료_${currentTime}`
        : `❌ 발송실패_${currentTime}`;
      sheet.getRange(rowNumber, COLUMN_MAP.telegramStatus).setValue(telegramStatus);
      console.log(`텔레그램 상태 기록: ${telegramStatus}`);
    }

    console.log(`상태 업데이트 완료: 행 ${rowNumber}`);

  } catch (error) {
    console.error('상태 업데이트 실패:', error);
  }
}

// ===== 헬퍼 함수들 =====
function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return spreadsheet.getSheets()[0];
}

function normalizePhoneNumber(phone) {
  if (!phone) return '';

  phone = String(phone).trim();

  // +82 형식 처리 개선
  if (phone.startsWith('+82')) {
    phone = '0' + phone.substring(3);
  } else if (phone.startsWith('82')) {
    phone = '0' + phone.substring(2);
  }

  // 0이 없으면 추가
  if (!phone.startsWith('0')) {
    phone = '0' + phone;
  }

  // 숫자만 남기기
  phone = phone.replace(/[^0-9]/g, '');

  // 11자리 휴대폰 번호 형식화
  if (phone.length === 11 && phone.startsWith('010')) {
    return phone.slice(0, 3) + '-' + phone.slice(3, 7) + '-' + phone.slice(7);
  }

  return phone;
}

function safeString(value) {
  if (value === null || value === undefined) return '-';
  if (value === '') return '-';
  return String(value);
}

// ===== 테스트 함수들 =====

// 전체 웹훅 테스트
function testWebhook() {
  const testData = {
    timestamp: new Date().toISOString(),
    platform: '인스타그램',
    adName: '정책자금_테스트광고_01',
    bizType: '개인사업자',
    location: '서울',
    name: '테스트담당자',
    phone: '010-1234-5678',
    company: '솔트테스트',
    industry: 'IT/소프트웨어',
    revenue: '5억원 이상',
    amount: '3억원',
    consultTime: '오후 2시~4시',
    privacy: 'Y'
  };

  console.log('=== 솔트 기업성장연구소 테스트 시작 ===');
  console.log('테스트 데이터:', JSON.stringify(testData));

  const result = processLead(testData);
  console.log('처리 결과:', JSON.stringify(result));

  return result;
}

// 개별 기능 테스트
function testIndividualFunctions() {
  console.log('=== 개별 기능 테스트 ===');

  const testData = {
    company: '테스트회사',
    name: '테스트담당자',
    phone: '010-1234-5678',
    industry: 'IT/소프트웨어',
    location: '서울',
    bizType: '법인',
    revenue: '10억원',
    amount: '5억원',
    consultTime: '오전 10시~12시',
    platform: '페이스북',
    privacy: 'Y',
    timestamp: new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})
  };

  console.log('테스트 데이터:', JSON.stringify(testData));

  console.log('\n1. 이메일 테스트...');
  const emailResult = sendEmailNotification(testData, 999);
  console.log('이메일 결과:', emailResult);

  console.log('\n2. 텔레그램 테스트...');
  const telegramResult = sendTelegramNotification(testData, 999);
  console.log('텔레그램 결과:', telegramResult);

  return {
    email: emailResult,
    telegram: telegramResult
  };
}

// ===== 웹앱 GET 요청 처리 (테스트 페이지) =====
function doGet(e) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>솔트 기업성장연구소 웹훅 테스트</title>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Noto Sans KR', sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 20px rgba(30, 60, 114, 0.1);
        }
        h1 {
          color: #1e3c72;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 10px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          color: #2a5298;
        }
        input, select {
          width: 100%;
          padding: 10px;
          border: 1px solid #93c5fd;
          border-radius: 5px;
          font-size: 14px;
        }
        button {
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          color: white;
          padding: 12px 30px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        }
        button:hover {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
        #result {
          margin-top: 20px;
          padding: 20px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 5px;
          display: none;
        }
        .success { color: #2a5298; }
        .error { color: #dc3545; }
        .info-box {
          background: rgba(59, 130, 246, 0.05);
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin-bottom: 20px;
        }
        .platform-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        .platform-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid #93c5fd;
          background: white;
          color: #2a5298;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .platform-btn.active {
          background: #2a5298;
          color: white;
        }
        .sms-status {
          display: inline-block;
          padding: 2px 8px;
          background: #95a5a6;
          color: white;
          border-radius: 3px;
          font-size: 12px;
          margin-left: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>💎 솔트 기업성장연구소 Meta 웹훅 테스트</h1>

        <div class="info-box">
          <strong>ℹ️ 테스트 환경</strong><br>
          회사: ${CONFIG.COMPANY_INFO.NAME}<br>
          대표: ${CONFIG.COMPANY_INFO.CEO}<br>
          연락처: ${CONFIG.COMPANY_INFO.PHONE}<br>
          이메일: ${CONFIG.EMAIL.TO}<br>
          텔레그램: 설정완료<br>
          SMS: <span class="sms-status">비활성화</span>
        </div>

        <div class="info-box" style="background: #f0f9ff; border-left-color: #2a5298;">
          <strong>📌 Meta 리드 폼 필드 매핑</strong><br>
          <small>
          • full_name → 담당자명<br>
          • phone_number → 연락처<br>
          • company_name → 상호명<br>
          • preferred_contact_time → <b>상담희망시간</b><br>
          • consultation_time → <b>상담희망시간</b><br>
          • city/location → 지역<br>
          • industry → 업종<br>
          • business_type → 사업자종류<br>
          • revenue → 직전년도 매출<br>
          • loan_amount → 필요자금
          </small>
        </div>

        <form id="testForm">
          <div class="form-group">
            <label>접수 플랫폼 선택 *</label>
            <div class="platform-selector">
              <button type="button" class="platform-btn active" data-platform="인스타그램">📷 인스타그램</button>
              <button type="button" class="platform-btn" data-platform="페이스북">👍 페이스북</button>
            </div>
            <input type="hidden" name="platform" value="인스타그램">
          </div>

          <div class="form-group">
            <label>상호명 *</label>
            <input type="text" name="company" value="테스트기업" required>
          </div>

          <div class="form-group">
            <label>담당자명 *</label>
            <input type="text" name="name" value="홍길동" required>
          </div>

          <div class="form-group">
            <label>연락처 *</label>
            <input type="text" name="phone" value="010-1234-5678" required>
          </div>

          <div class="form-group">
            <label>업종</label>
            <select name="industry">
              <option value="제조업">제조업</option>
              <option value="도소매업">도소매업</option>
              <option value="서비스업">서비스업</option>
              <option value="건설업">건설업</option>
              <option value="IT/소프트웨어" selected>IT/소프트웨어</option>
              <option value="요식업">요식업</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div class="form-group">
            <label>지역</label>
            <select name="location">
              <option value="서울" selected>서울</option>
              <option value="경기">경기</option>
              <option value="인천">인천</option>
              <option value="부산">부산</option>
              <option value="대구">대구</option>
              <option value="광주">광주</option>
              <option value="대전">대전</option>
              <option value="울산">울산</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div class="form-group">
            <label>사업자종류</label>
            <select name="bizType">
              <option value="개인사업자">개인사업자</option>
              <option value="법인사업자">법인사업자</option>
            </select>
          </div>

          <div class="form-group">
            <label>직전년도 매출</label>
            <select name="revenue">
              <option value="1억원 미만">1억원 미만</option>
              <option value="1억원~5억원">1억원~5억원</option>
              <option value="5억원~10억원" selected>5억원~10억원</option>
              <option value="10억원~30억원">10억원~30억원</option>
              <option value="30억원 이상">30억원 이상</option>
            </select>
          </div>

          <div class="form-group">
            <label>필요자금</label>
            <select name="amount">
              <option value="5천만원 이하">5천만원 이하</option>
              <option value="5천만원~1억원">5천만원~1억원</option>
              <option value="1억원~3억원" selected>1억원~3억원</option>
              <option value="3억원~5억원">3억원~5억원</option>
              <option value="5억원 이상">5억원 이상</option>
            </select>
          </div>

          <div class="form-group">
            <label>상담희망시간</label>
            <select name="consultTime">
              <option value="">선택안함</option>
              <option value="오전 9시~12시">오전 9시~12시</option>
              <option value="오후 12시~3시">오후 12시~3시</option>
              <option value="오후 3시~6시" selected>오후 3시~6시</option>
              <option value="오후 6시 이후">오후 6시 이후</option>
            </select>
          </div>

          <div class="form-group">
            <label>보안 키 (Make 웹훅용)</label>
            <input type="text" name="webhook_secret" value="${CONFIG.WEBHOOK_SECRET}" readonly style="background: #f0f9ff;">
            <small style="color: #64748b;">* Make 시나리오에서 이 값을 webhook_secret 필드로 전송해야 합니다</small>
          </div>

          <button type="submit">📤 테스트 전송</button>
        </form>

        <div id="result"></div>
      </div>

      <script>
        // 플랫폼 선택 버튼
        document.querySelectorAll('.platform-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelector('input[name="platform"]').value = this.dataset.platform;
          });
        });

        document.getElementById('testForm').onsubmit = async (e) => {
          e.preventDefault();

          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = '⏳ 처리 중...';
          resultDiv.style.display = 'block';

          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData);
          data.timestamp = new Date().toISOString();
          data.privacy = 'Y';

          // webhook_secret이 있으면 포함
          if (data.webhook_secret) {
            data.secret = data.webhook_secret;
          }

          try {
            const response = await fetch(window.location.href, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
              const platformEmoji = data.platform === '인스타그램' ? '📷' : '👍';
              resultDiv.innerHTML = \`
                <h3 class="success">✅ 전송 성공!</h3>
                <p><strong>플랫폼:</strong> \${platformEmoji} \${data.platform}</p>
                <p><strong>행 번호:</strong> \${result.result.rowNumber}</p>
                <p><strong>SMS:</strong> ⏸️ 비활성화</p>
                <p><strong>이메일:</strong> \${result.result.emailSent ? '✅ 발송완료' : '❌ 실패'}</p>
                <p><strong>텔레그램:</strong> \${result.result.telegramSent ? '✅ 발송완료' : '❌ 실패'}</p>
                <p style="margin-top:15px">
                  <a href="https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}" target="_blank">
                    📊 스프레드시트 확인하기
                  </a>
                </p>
              \`;
            } else {
              resultDiv.innerHTML = \`
                <h3 class="error">❌ 전송 실패</h3>
                <p>\${result.error}</p>
              \`;
            }
          } catch (error) {
            resultDiv.innerHTML = \`
              <h3 class="error">❌ 오류 발생</h3>
              <p>\${error.message}</p>
            \`;
          }
        };
      </script>
    </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html);
}