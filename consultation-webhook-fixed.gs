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
  const expectedSecret = getScriptProperty('WEBHOOK_SECRET');
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

  const row = [
    submittedAtText,
    submission.region || '',
    submission.businessNumber || '',
    submission.name || '',
    submission.phone || '',
    submission.email || '',
    submission.consultType || '',
    submission.annualRevenue || '',
    submission.employeeCount || '',
    submission.desiredTime || '',
    submission.preferredTime || '',
    submission.message || '',
    submission.privacyConsent ? '동의' : '미동의',
    submission.marketingConsent ? '동의' : '미동의',
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
  const config = resolveTelegramConfig(notification);
  if (!config.enabled) {
    return;
  }

  const url = 'https://api.telegram.org/bot' + config.botToken + '/sendMessage';
  const payload = {
    chat_id: config.chatId,
    text: summaryText,
    parse_mode: 'Markdown',  // HTML 대신 Markdown 사용
    disable_web_page_preview: true,
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json; charset=utf-8',  // UTF-8 명시
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
  return getPropertyList('NOTIFICATION_EMAILS');
}

function resolveTelegramConfig(notification) {
  const raw = (notification && notification.telegram) || {};
  const token = raw.botToken || getScriptProperty('TELEGRAM_BOT_TOKEN');
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

function buildEmailBody(submission, submittedAtText, meta) {
  // 상담 유형에 따른 제목
  var emailTitle = '신규 상담 신청이 접수되었습니다.';
  if (submission.consultType === '전문가 상담') {
    emailTitle = '[전문가 상담접수] 신규 상담 신청이 접수되었습니다.';
  } else if (submission.consultType === '기업심사관 상담') {
    emailTitle = '[기업심사관 상담접수] 신규 상담 신청이 접수되었습니다.';
  }

  const rows = [
    ['접수시각', submittedAtText],
    ['이름/회사명', submission.name || '-'],
    ['연락처', submission.phone || '-'],
  ];

  // 지역 정보는 기업심사관 상담일 때만 추가
  if (submission.consultType === '기업심사관 상담') {
    rows.push(['지역', submission.region || '-']);
  }

  // 전문가 상담일 때는 상담 분야, 아니면 상담희망분야
  if (submission.consultType === '전문가 상담' && submission.consultField) {
    rows.push(['상담분야', submission.consultField]);
  }
  rows.push(['상담희망분야', submission.consultType || '-']);

  rows.push(['희망 상담 시간', submission.desiredTime || '-']);
  rows.push(['상담 희망 시기', submission.preferredTime || '-']);

  // 기업심사관 상담일 때만 추가 정보 표시
  if (submission.consultType === '기업심사관 상담') {
    rows.push(['연매출', submission.annualRevenue || '-']);
    rows.push(['직원 수', submission.employeeCount || '-']);
  }

  rows.push(['사업자번호', submission.businessNumber || '-']);
  rows.push(['이메일', submission.email || '-']);
  rows.push(['개인정보 수집 동의', submission.privacyConsent ? '동의' : '미동의']);
  rows.push(['마케팅 수신 동의', submission.marketingConsent ? '동의' : '미동의']);

  if (submission.message) {
    rows.push(['문의사항', submission.message]);
  }

  if (meta) {
    if (meta.ip || meta.forwardedFor) {
      rows.push(['요청 IP', meta.forwardedFor || meta.ip || '-']);
    }
    if (meta.userAgent) {
      rows.push(['User-Agent', meta.userAgent]);
    }
    if (meta.referer) {
      rows.push(['Referer', meta.referer]);
    }
  }

  const tableRows = rows
    .map(function (row) {
      return (
        '<tr>' +
        '<th style="padding:8px 12px;text-align:left;background:#0f172a;color:#fff;border-bottom:1px solid #e2e8f0;">' +
        row[0] +
        '</th>' +
        '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">' +
        sanitizeHtml(row[1]) +
        '</td>' +
        '</tr>'
      );
    })
    .join('');

  return (
    '<div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;color:#0f172a;">' +
    '<h2 style="margin:0 0 16px;font-size:18px;">' + emailTitle + '</h2>' +
    '<table style="border-collapse:collapse;min-width:360px;">' +
    tableRows +
    '</table>' +
    '<p style="margin-top:16px;color:#475569;">본 메일은 자동 발송되었습니다.</p>' +
    '</div>'
  );
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
  Logger.log('NOTIFICATION_EMAILS: ' + (getScriptProperty('NOTIFICATION_EMAILS') || '없음'));
  Logger.log('WEBHOOK_SECRET: ' + (getScriptProperty('WEBHOOK_SECRET') ? '설정됨' : '없음'));
  Logger.log('TELEGRAM_BOT_TOKEN: ' + (getScriptProperty('TELEGRAM_BOT_TOKEN') ? '설정됨' : '없음'));
  Logger.log('TELEGRAM_CHAT_ID: ' + (getScriptProperty('TELEGRAM_CHAT_ID') || '없음'));
  Logger.log('NAVER_SENS_ENABLED: ' + (getScriptProperty('NAVER_SENS_ENABLED') || 'false'));
  Logger.log('NAVER_SENS_SERVICE_ID: ' + (getScriptProperty('NAVER_SENS_SERVICE_ID') || '없음'));
  Logger.log('NAVER_SENS_ACCESS_KEY: ' + (getScriptProperty('NAVER_SENS_ACCESS_KEY') ? '설정됨' : '없음'));
  Logger.log('NAVER_SENS_SECRET_KEY: ' + (getScriptProperty('NAVER_SENS_SECRET_KEY') ? '설정됨' : '없음'));
  Logger.log('NAVER_SENS_SENDER_NUMBER: ' + (getScriptProperty('NAVER_SENS_SENDER_NUMBER') || '없음'));
}