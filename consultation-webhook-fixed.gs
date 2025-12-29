function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('빈 요청입니다.');
    }

    const payload = JSON.parse(e.postData.contents);

    if (!isAuthorized(payload)) {
      Logger.log('[consultation-webhook] invalid secret');
      return jsonResponse({ ok: false, message: 'Unauthorized request' });
    }

    const submission = payload.submission || {};
    const submittedAtIso = payload.submittedAt || new Date().toISOString();
    const submittedAtText = formatKstDate(submittedAtIso);

    appendToSpreadsheet(submission, submittedAtText);

    const meta = payload.meta || {};
    const notification = payload.notification || {};

    const summaryText = buildSummaryText(submission, submittedAtText);
    const emailBody = buildEmailBody(submission, submittedAtText, meta);
    const smsBody = buildSmsContent(submission, submittedAtText);

    dispatchEmails(notification, summaryText, emailBody);
    dispatchTelegram(notification, summaryText);
    dispatchSensSms(notification, submission.phone, smsBody);

    return jsonResponse({ ok: true });
  } catch (error) {
    Logger.log('[consultation-webhook] 오류: ' + (error.stack || error));
    return jsonResponse({ ok: false, message: error.message || String(error) });
  }
}

function isAuthorized(payload) {
  const expectedSecret = getScriptProperty('GAS_WEBAPP_SECRET');
  if (!expectedSecret) {
    return true;
  }

  const providedSecret =
    payload && payload.auth && typeof payload.auth.secret === 'string'
      ? payload.auth.secret.trim()
      : '';

  return providedSecret && providedSecret === expectedSecret;
}

function appendToSpreadsheet(submission, submittedAtText) {
  const spreadsheetId = getScriptProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID 속성이 설정되어 있지 않습니다.');
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheetName = getScriptProperty('TARGET_SHEET_NAME');
  const sheet = sheetName ? spreadsheet.getSheetByName(sheetName) : spreadsheet.getSheets()[0];

  if (!sheet) {
    throw new Error('대상 시트를 찾을 수 없습니다.');
  }

  // 스프레드시트 헤더 순서:
  // 제출시간 | 배정담당자 | 상담결과 | 지역 | 사업자번호 | 이름 | 회사명 | 연락처 | 이메일 | 상담희망분야 | 연매출 | 직원수 | 상담희망시간 | 희망상담시기 | 문의사항 | 개인정보동의 | 마케팅동의
  const row = [
    submittedAtText,                              // 1. 제출시간
    '',                                           // 2. 배정담당자 (관리자 작성 - 빈칸)
    '',                                           // 3. 상담결과 (관리자 작성 - 빈칸)
    submission.region || '',                      // 4. 지역
    submission.businessNumber || '',              // 5. 사업자번호
    submission.name || '',                        // 6. 이름
    submission.company || '',                     // 7. 회사명 (API에서 company로 전송)
    submission.phone || '',                       // 8. 연락처
    submission.email || '',                       // 9. 이메일
    submission.consultTypeDetail || submission.consultType || '',  // 10. 상담희망분야 (정부지원금, 인증 등)
    submission.annualRevenue || '',               // 11. 연매출
    submission.employeeCount || '',               // 12. 직원수
    submission.desiredTime || '',                 // 13. 상담희망시간
    submission.preferredTime || '',               // 14. 희망상담시기
    submission.message || '',                     // 15. 문의사항
    submission.privacyConsent ? '동의' : '미동의', // 16. 개인정보 동의
    submission.marketingConsent ? '동의' : '미동의', // 17. 마케팅 동의
  ];

  sheet.appendRow(row);
}

function dispatchEmails(notification, summaryText, htmlBody) {
  const recipients = resolveEmailRecipients(notification);
  if (!recipients.length) {
    return;
  }

  const subject = '[나라똔] 신규 상담 신청 알림';
  MailApp.sendEmail({
    to: recipients.join(','),
    subject,
    htmlBody,
    name: '나라똔 상담센터',
  });
}

function dispatchTelegram(notification, summaryText) {
  var config = resolveTelegramConfig(notification);
  if (!config.enabled) {
    return;
  }

  // 스프레드시트 링크 추가 (HTML 형식)
  var spreadsheetId = getScriptProperty('SPREADSHEET_ID');
  var messageWithLink = summaryText;
  if (spreadsheetId) {
    var sheetUrl = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId;
    messageWithLink += '\n\n<a href="' + sheetUrl + '">📊 스프레드시트 바로가기</a>';
  }

  var url = 'https://api.telegram.org/bot' + config.botToken + '/sendMessage';
  var payload = {
    chat_id: config.chatId,
    text: messageWithLink,
    parse_mode: 'HTML',  // Markdown에서 HTML로 변경 (하이퍼링크 지원)
    disable_web_page_preview: true,
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() >= 300) {
    Logger.log('[consultation-webhook] Telegram 전송 실패: ' + response.getContentText());
  }
}

function dispatchSensSms(notification, recipientPhone, smsBody) {
  const config = resolveSensConfig(notification);
  if (!config.enabled) {
    return;
  }

  if (!recipientPhone) {
    Logger.log('[consultation-webhook] SENS 전송 실패: 수신 번호가 없습니다.');
    return;
  }

  if (!config.serviceId || !config.accessKey || !config.secretKey || !config.senderNumber) {
    Logger.log('[consultation-webhook] SENS 설정이 완전하지 않아 전송하지 않습니다.');
    return;
  }

  try {
    const sanitizedRecipient = recipientPhone.replace(/[^0-9]/g, '');
    const urlPath = '/sms/v2/services/' + config.serviceId + '/messages';
    const endpoint = 'https://sens.apigw.ntruss.com' + urlPath;
    const timestamp = Date.now().toString();

    const signature = Utilities.computeHmacSha256Signature(
      'POST ' + urlPath + '\n' + timestamp + '\n' + config.accessKey,
      config.secretKey
    );
    const signatureBase64 = Utilities.base64Encode(signature);

    const payload = {
      type: 'SMS',
      contentType: 'COMM',
      countryCode: '82',
      from: config.senderNumber,
      content: smsBody,
      messages: [{ to: sanitizedRecipient }],
    };

    const options = {
      method: 'post',
      contentType: 'application/json; charset=utf-8',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: {
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': config.accessKey,
        'x-ncp-apigw-signature-v2': signatureBase64,
      },
    };

    const response = UrlFetchApp.fetch(endpoint, options);
    if (response.getResponseCode() >= 300) {
      Logger.log('[consultation-webhook] SENS 전송 실패: ' + response.getContentText());
    }
  } catch (error) {
    Logger.log('[consultation-webhook] SENS 전송 오류: ' + (error.stack || error));
  }
}

function resolveEmailRecipients(notification) {
  if (notification && Array.isArray(notification.emails) && notification.emails.length) {
    return notification.emails.filter(Boolean);
  }
  return getPropertyList('MAIL_RECIPIENTS');
}

function resolveTelegramConfig(notification) {
  const raw = (notification && notification.telegram) || {};
  const token = raw.botToken || getScriptProperty('TELEGRAM_TOKEN');
  const chatId = raw.chatId || getScriptProperty('TELEGRAM_CHAT_ID');
  const enabled =
    typeof raw.enabled === 'boolean' ? raw.enabled : Boolean(token && chatId);

  return { enabled, botToken: token, chatId: chatId };
}

function resolveSensConfig(notification) {
  const raw = (notification && notification.sms) || {};
  const enabled =
    typeof raw.enabled === 'boolean'
      ? raw.enabled
      : getScriptProperty('NAVER_SENS_ENABLED').toLowerCase() === 'true';

  return {
    enabled,
    serviceId: raw.serviceId || getScriptProperty('NAVER_SENS_SERVICE_ID'),
    accessKey: raw.accessKey || getScriptProperty('NAVER_SENS_ACCESS_KEY'),
    secretKey: raw.secretKey || getScriptProperty('NAVER_SENS_SECRET_KEY'),
    senderNumber: raw.senderNumber || getScriptProperty('NAVER_SENS_SENDER_NUMBER'),
  };
}

function buildSummaryText(submission, submittedAtText) {
  // 상담 유형에 따른 태그 설정
  var title = '📨 신규 상담 신청';
  if (submission.consultType === '전문가 상담') {
    title = '📨 [전문가 상담접수]';
  } else if (submission.consultType === '기업심사관 상담') {
    title = '📨 [기업심사관 상담접수]';
  }

  const lines = [
    title,
    '• 접수시각: ' + submittedAtText,
    '• 이름/회사명: ' + (submission.name || '-'),
    '• 연락처: ' + (submission.phone || '-'),
  ];

  // 지역 정보는 기업심사관 상담일 때만 추가
  if (submission.consultType === '기업심사관 상담' && submission.region) {
    lines.push('• 지역: ' + submission.region);
  }

  // 전문가 상담일 때는 상담 분야 표시
  if (submission.consultType === '전문가 상담' && submission.consultField) {
    lines.push('• 상담분야: ' + submission.consultField);
  } else if (submission.consultType === '기업심사관 상담') {
    // 기업심사관 상담일 때는 상담희망분야 표시 (정부지원금, 인증 등)
    lines.push('• 상담희망분야: ' + (submission.consultTypeDetail || '-'));
  } else {
    lines.push('• 상담희망분야: ' + (submission.consultType || '-'));
  }

  // 상담 희망 시간
  var timeInfo = (submission.desiredTime || '-') + ' (' + (submission.preferredTime || '-') + ')';
  lines.push('• 상담희망시간: ' + timeInfo);

  // 기업심사관 상담일 때는 추가 정보 표시
  if (submission.consultType === '기업심사관 상담') {
    if (submission.annualRevenue) {
      lines.push('• 연매출: ' + submission.annualRevenue);
    }
    if (submission.employeeCount) {
      lines.push('• 직원수: ' + submission.employeeCount);
    }
  }

  if (submission.message) {
    lines.push('• 문의사항: ' + submission.message);
  }

  return lines.join('\n');
}

// 나라똔 브랜드 컬러
var BRAND_COLORS = {
  primaryDark: '#1B4332',
  primary: '#2D6A4F',
  secondary: '#40916C',
  accent: '#52B788',
  light: '#74C69D',
  veryLight: '#95D5B2',
  background: '#D8F3DC',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#4B5563',
  border: '#E5E7EB'
};

function buildEmailBody(submission, submittedAtText, meta) {
  var c = BRAND_COLORS;

  // 상담 유형에 따른 제목
  var emailTitle = '📋 신규 상담 신청';
  if (submission.consultType === '전문가 상담') {
    emailTitle = '📋 [전문가 상담] 신규 상담 신청';
  } else if (submission.consultType === '기업심사관 상담') {
    emailTitle = '📋 [기업심사관 상담] 신규 상담 신청';
  }

  var customerRows = [
    ['이름', submission.name || '-'],
    ['회사명', submission.company || '-'],
    ['연락처', submission.phone || '-'],
    ['이메일', submission.email || '-']
  ];

  if (submission.consultType === '기업심사관 상담' && submission.region) {
    customerRows.push(['지역', submission.region]);
  }

  var companyRows = [
    ['사업자번호', submission.businessNumber || '-']
  ];

  if (submission.consultType === '기업심사관 상담') {
    companyRows.push(['연매출', submission.annualRevenue || '-']);
    companyRows.push(['직원 수', submission.employeeCount || '-']);
  }

  var consultRows = [
    ['상담 분야', submission.consultType || '-']
  ];

  if (submission.consultType === '전문가 상담' && submission.consultField) {
    consultRows.push(['전문 분야', submission.consultField]);
  }

  consultRows.push(['희망 시간', submission.desiredTime || '-']);
  consultRows.push(['희망 시기', submission.preferredTime || '-']);

  function buildInfoTable(rows) {
    return rows.map(function(row) {
      return '<tr>' +
        '<td style="padding:10px 12px;font-size:13px;color:' + c.textLight + ';width:100px;white-space:nowrap;border-bottom:1px solid ' + c.border + ';">' + row[0] + '</td>' +
        '<td style="padding:10px 12px;font-size:14px;color:' + c.text + ';font-weight:600;border-bottom:1px solid ' + c.border + ';">' + sanitizeHtml(row[1]) + '</td>' +
        '</tr>';
    }).join('');
  }

  var html = '' +
    '<div style="font-family:Pretendard,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;background:' + c.white + ';">' +
    '<div style="background:linear-gradient(135deg, ' + c.primary + ' 0%, ' + c.secondary + ' 100%);padding:30px;border-radius:12px 12px 0 0;">' +
      '<h1 style="margin:0;color:' + c.white + ';font-size:22px;font-weight:700;">' + emailTitle + '</h1>' +
      '<p style="margin:8px 0 0;color:' + c.veryLight + ';font-size:14px;">나라똔 상담센터</p>' +
    '</div>' +
    '<div style="background:' + c.background + ';padding:16px 24px;border-left:4px solid ' + c.accent + ';">' +
      '<p style="margin:0;font-size:14px;color:' + c.primary + ';"><strong>⏰ 접수시각:</strong> ' + submittedAtText + '</p>' +
    '</div>' +
    '<div style="padding:24px;">' +
      '<div style="background:' + c.white + ';border:1px solid ' + c.border + ';border-radius:8px;margin-bottom:20px;overflow:hidden;">' +
        '<div style="background:' + c.primary + ';padding:12px 16px;">' +
          '<h3 style="margin:0;color:' + c.white + ';font-size:14px;font-weight:600;">👤 고객 정보</h3>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          buildInfoTable(customerRows) +
        '</table>' +
      '</div>' +
      '<div style="background:' + c.white + ';border:1px solid ' + c.border + ';border-radius:8px;margin-bottom:20px;overflow:hidden;">' +
        '<div style="background:' + c.secondary + ';padding:12px 16px;">' +
          '<h3 style="margin:0;color:' + c.white + ';font-size:14px;font-weight:600;">🏢 기업 정보</h3>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          buildInfoTable(companyRows) +
        '</table>' +
      '</div>' +
      '<div style="background:' + c.white + ';border:1px solid ' + c.border + ';border-radius:8px;margin-bottom:20px;overflow:hidden;">' +
        '<div style="background:' + c.accent + ';padding:12px 16px;">' +
          '<h3 style="margin:0;color:' + c.white + ';font-size:14px;font-weight:600;">💬 상담 정보</h3>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          buildInfoTable(consultRows) +
        '</table>' +
      '</div>';

  if (submission.message) {
    html += '' +
      '<div style="background:' + c.background + ';border:1px solid ' + c.light + ';border-radius:8px;padding:16px;margin-bottom:20px;">' +
        '<p style="margin:0 0 8px;font-size:13px;color:' + c.secondary + ';font-weight:600;">📝 문의사항</p>' +
        '<p style="margin:0;font-size:14px;color:' + c.text + ';line-height:1.6;">' + sanitizeHtml(submission.message) + '</p>' +
      '</div>';
  }

  html += '' +
      '<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;font-size:12px;color:' + c.textLight + ';">' +
        '<span>개인정보 수집: ' + (submission.privacyConsent ? '✅ 동의' : '❌ 미동의') + '</span>' +
        '<span style="margin-left:16px;">마케팅 수신: ' + (submission.marketingConsent ? '✅ 동의' : '❌ 미동의') + '</span>' +
      '</div>' +
    '</div>' +
    '<div style="background:' + c.primaryDark + ';padding:20px;text-align:center;border-radius:0 0 12px 12px;">' +
      '<p style="margin:0;color:' + c.veryLight + ';font-size:12px;">나라똔 | 소상공인 정책자금 플랫폼</p>' +
      '<p style="margin:8px 0 0;color:' + c.light + ';font-size:11px;">본 메일은 자동 발송되었습니다.</p>' +
    '</div>' +
  '</div>';

  return html;
}

function buildSmsContent(submission, submittedAtText) {
  var message =
    '나라똔 상담신청\n' +
    '접수:' + submittedAtText + '\n' +
    '이름:' + (submission.name || '-') + '\n' +
    '연락:' + (submission.phone || '-') + '\n' +
    '분야:' + (submission.consultType || '-') + '\n' +
    '시간:' + (submission.desiredTime || '-') +
      ' (' + (submission.preferredTime || '-') + ')';

  if (submission.message) {
    message += '\n문의:' + submission.message;
  }

  if (message.length > 120) {
    message = message.substring(0, 117) + '...';
  }

  return message;
}

function formatKstDate(isoString) {
  var date = new Date(isoString);
  return Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
}

function sanitizeHtml(value) {
  if (typeof value !== 'string') {
    value = String(value || '');
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br />');
}

// ✅ 수정된 함수 - setResponseCode 제거
function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getScriptProperty(key, defaultValue) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (value == null) {
    return defaultValue || '';
  }
  return value;
}

function getPropertyList(key) {
  var raw = getScriptProperty(key, '');
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map(function (item) {
      return item.trim();
    })
    .filter(function (item) {
      return item.length > 0;
    });
}

// ===== 테스트 및 확인용 =====

function testEmail() {
  const recipients = resolveEmailRecipients(null);
  Logger.log('이메일 주소: ' + (recipients.join(', ') || '없음'));

  if (!recipients.length) {
    Logger.log('이메일 주소 없음');
    return;
  }

  try {
    MailApp.sendEmail({
      to: recipients.join(','),
      subject: '테스트 - ' + new Date().toLocaleString('ko-KR'),
      body: '이메일 테스트입니다.',
    });
    Logger.log('이메일 발송 성공');
  } catch (e) {
    Logger.log('이메일 실패: ' + e.toString());
  }
}

function testTelegram() {
  const config = resolveTelegramConfig(null);
  Logger.log('텔레그램 enabled: ' + config.enabled + ', chatId: ' + (config.chatId || '없음'));

  if (!config.enabled) {
    Logger.log('텔레그램 설정 없음');
    return;
  }

  try {
    const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + config.botToken + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: config.chatId,
        text: '테스트 메시지 - ' + new Date().toLocaleString('ko-KR'),
      }),
      muteHttpExceptions: true,
    });

    Logger.log('텔레그램 응답: ' + response.getContentText());
  } catch (e) {
    Logger.log('텔레그램 실패: ' + e.toString());
  }
}

function checkSettings() {
  Logger.log('=== 설정 확인 ===');
  Logger.log('SPREADSHEET_ID: ' + (getScriptProperty('SPREADSHEET_ID') || '없음'));
  Logger.log('TARGET_SHEET_NAME: ' + (getScriptProperty('TARGET_SHEET_NAME') || '기본 시트'));
  Logger.log('MAIL_RECIPIENTS: ' + (getScriptProperty('MAIL_RECIPIENTS') || '없음'));
  Logger.log('GAS_WEBAPP_SECRET: ' + (getScriptProperty('GAS_WEBAPP_SECRET') ? '설정됨' : '없음'));
  Logger.log('TELEGRAM_TOKEN: ' + (getScriptProperty('TELEGRAM_TOKEN') ? '설정됨' : '없음'));
  Logger.log('TELEGRAM_CHAT_ID: ' + (getScriptProperty('TELEGRAM_CHAT_ID') || '없음'));
  Logger.log('NAVER_SENS_ENABLED: ' + (getScriptProperty('NAVER_SENS_ENABLED') || 'false'));
  Logger.log('NAVER_SENS_SERVICE_ID: ' + (getScriptProperty('NAVER_SENS_SERVICE_ID') || '없음'));
  Logger.log('NAVER_SENS_ACCESS_KEY: ' + (getScriptProperty('NAVER_SENS_ACCESS_KEY') ? '설정됨' : '없음'));
  Logger.log('NAVER_SENS_SECRET_KEY: ' + (getScriptProperty('NAVER_SENS_SECRET_KEY') ? '설정됨' : '없음'));
  Logger.log('NAVER_SENS_SENDER_NUMBER: ' + (getScriptProperty('NAVER_SENS_SENDER_NUMBER') || '없음'));
}