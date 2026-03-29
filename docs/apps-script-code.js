// ================================================
// 나라똔 브랜드 컬러 (리디자인)
// ================================================
var BRAND_COLORS = {
  primaryDark: '#1B4332',
  accent: '#52B788',
  light: '#74C69D',
  white: '#FFFFFF',
  text: '#1a1a1a',
  textMuted: '#666666',
  label: '#888888',
  sectionLabel: '#777777',
  border: '#f0f0f0',
  footerBg: '#fafafa',
  bannerBg: '#edf7f0',
  bannerText: '#2d5a3f',
  consentYes: '#52B788',
  consentNo: '#cc6666',
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('빈 요청입니다.');
    }

    var payload = JSON.parse(e.postData.contents);

    if (!isAuthorized(payload)) {
      Logger.log('[consultation-webhook] invalid secret');
      return jsonResponse({ ok: false, message: 'Unauthorized request' }, 401);
    }

    var submission = payload.submission || {};
    var submittedAtIso = payload.submittedAt || new Date().toISOString();
    var submittedAtText = formatKstDate(submittedAtIso);

    appendToSpreadsheet(submission, submittedAtText);

    var meta = payload.meta || {};
    var notification = payload.notification || {};

    var summaryText = buildSummaryText(submission, submittedAtText);
    var staffEmailBody = buildStaffEmailBody(submission, submittedAtText, meta);
    var customerEmailBody = buildCustomerEmailBody(submission, submittedAtText);
    var smsBody = buildSmsContent(submission, submittedAtText);

    dispatchEmails(notification, summaryText, staffEmailBody);

    // 고객 이메일은 Resend로 발송 (Next.js API에서 처리)
    // if (submission.email) {
    //   dispatchCustomerEmail(submission.email, customerEmailBody);
    // }

    dispatchTelegram(notification, summaryText);
    dispatchSensSms(notification, submission.phone, smsBody);

    return jsonResponse({ ok: true });
  } catch (error) {
    Logger.log('[consultation-webhook] 오류: ' + (error.stack || error));
    return jsonResponse({ ok: false, message: error.message || String(error) }, 500);
  }
}

function isAuthorized(payload) {
  var expectedSecret = getScriptProperty('WEBHOOK_SECRET');
  if (!expectedSecret) {
    return true;
  }

  var providedSecret =
    payload && payload.auth && typeof payload.auth.secret === 'string'
      ? payload.auth.secret.trim()
      : '';

  return providedSecret && providedSecret === expectedSecret;
}

function appendToSpreadsheet(submission, submittedAtText) {
  var spreadsheetId = getScriptProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID 속성이 설정되어 있지 않습니다.');
  }

  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheetName = getScriptProperty('TARGET_SHEET_NAME');
  var sheet = sheetName ? spreadsheet.getSheetByName(sheetName) : spreadsheet.getSheets()[0];

  if (!sheet) {
    throw new Error('대상 시트를 찾을 수 없습니다.');
  }

  var row = [
    submittedAtText,
    '',
    '',
    submission.region || '',
    submission.businessNumber || '',
    submission.name || '',
    submission.company || '',
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
  var recipients = resolveEmailRecipients(notification);
  if (!recipients.length) {
    return;
  }

  var subject = '[나라똔] 신규 상담 신청 알림';
  MailApp.sendEmail({
    to: recipients.join(','),
    subject: subject,
    htmlBody: htmlBody,
    name: '나라똔 상담센터',
  });
}

function dispatchCustomerEmail(customerEmail, htmlBody) {
  if (!customerEmail) {
    Logger.log('[consultation-webhook] 고객 이메일 주소가 없습니다.');
    return;
  }

  try {
    var subject = '[나라똔] 상담 신청이 접수되었습니다';
    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: '나라똔',
    });
    Logger.log('[consultation-webhook] 고객 이메일 발송 완료: ' + customerEmail);
  } catch (error) {
    Logger.log('[consultation-webhook] 고객 이메일 발송 실패: ' + (error.stack || error));
  }
}

function dispatchTelegram(notification, summaryText) {
  var config = resolveTelegramConfig(notification);
  if (!config.enabled) {
    return;
  }

  var url = 'https://api.telegram.org/bot' + config.botToken + '/sendMessage';
  var payload = {
    chat_id: config.chatId,
    text: summaryText,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() >= 300) {
    Logger.log('[consultation-webhook] Telegram 전송 실패: ' + response.getContentText());
  }
}

function dispatchSensSms(notification, recipientPhone, smsBody) {
  var config = resolveSensConfig(notification);
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
    var sanitizedRecipient = recipientPhone.replace(/[^0-9]/g, '');
    var urlPath = '/sms/v2/services/' + config.serviceId + '/messages';
    var endpoint = 'https://sens.apigw.ntruss.com' + urlPath;
    var timestamp = Date.now().toString();

    var signature = Utilities.computeHmacSha256Signature(
      'POST ' + urlPath + '\n' + timestamp + '\n' + config.accessKey,
      config.secretKey
    );
    var signatureBase64 = Utilities.base64Encode(signature);

    var payload = {
      type: 'SMS',
      contentType: 'COMM',
      countryCode: '82',
      from: config.senderNumber,
      content: smsBody,
      messages: [{ to: sanitizedRecipient }],
    };

    var options = {
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

    var response = UrlFetchApp.fetch(endpoint, options);
    if (response.getResponseCode() >= 300) {
      Logger.log('[consultation-webhook] SENS 전송 실패: ' + response.getContentText());
    }
  } catch (error) {
    Logger.log('[consultation-webhook] SENS 전송 오류: ' + (error.stack || error));
  }
}

function resolveEmailRecipients(notification) {
  if (notification && notification.emails && notification.emails.length) {
    return notification.emails;
  }
  return getPropertyList('NOTIFICATION_EMAILS');
}

function resolveTelegramConfig(notification) {
  var raw = (notification && notification.telegram) || {};
  var token = raw.botToken || getScriptProperty('TELEGRAM_BOT_TOKEN');
  var chatId = raw.chatId || getScriptProperty('TELEGRAM_CHAT_ID');
  var enabled = typeof raw.enabled === 'boolean' ? raw.enabled : Boolean(token && chatId);

  return { enabled: enabled, botToken: token, chatId: chatId };
}

function resolveSensConfig(notification) {
  var raw = (notification && notification.sms) || {};
  var enabled =
    typeof raw.enabled === 'boolean'
      ? raw.enabled
      : getScriptProperty('NAVER_SENS_ENABLED').toLowerCase() === 'true';

  return {
    enabled: enabled,
    serviceId: raw.serviceId || getScriptProperty('NAVER_SENS_SERVICE_ID'),
    accessKey: raw.accessKey || getScriptProperty('NAVER_SENS_ACCESS_KEY'),
    secretKey: raw.secretKey || getScriptProperty('NAVER_SENS_SECRET_KEY'),
    senderNumber: raw.senderNumber || getScriptProperty('NAVER_SENS_SENDER_NUMBER'),
  };
}

function buildSummaryText(submission, submittedAtText) {
  var lines = [
    '[나라똔 홈페이지 신규상담신청]',
    '',
    '📨 신규 상담 신청',
    '• 접수시각: ' + submittedAtText,
    '• 이름: ' + (submission.name || '-'),
    '• 회사명: ' + (submission.company || '-'),
    '• 연락처: ' + (submission.phone || '-'),
    '• 지역: ' + (submission.region || '-'),
    '• 상담희망분야: ' + (submission.consultType || '-'),
    '• 상담희망시간: ' +
      (submission.desiredTime || '-') +
      ' (' +
      (submission.preferredTime || '-') +
      ')',
  ];

  if (submission.message) {
    lines.push('• 문의사항: ' + submission.message);
  }

  lines.push('');
  lines.push('📊 스프레드시트 바로가기');
  lines.push(
    'https://docs.google.com/spreadsheets/d/1s1F6yw3ioJv1_pzI_OKG1u_st1S2pGRc99jqsUQbnIw/edit?gid=0#gid=0'
  );
  lines.push('위 링크를 클릭하시면 접수내역으로 바로 이동됩니다.');

  return lines.join('\n');
}

function buildStaffEmailBody(submission, submittedAtText, meta) {
  var c = BRAND_COLORS;

  // --- 셀 빌더 ---
  function buildCell(label, value, isAccent, widthPct) {
    var valueColor = isAccent ? c.accent : c.text;
    var fontWeight = isAccent ? 'font-weight:500;' : '';
    return (
      '<td width="' +
      widthPct +
      '%" style="background:' +
      c.white +
      ';padding:10px 14px;">' +
      '<p style="font-size:9px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:' +
      c.label +
      ';margin:0 0 3px 0;">' +
      label +
      '</p>' +
      '<p style="font-size:13px;color:' +
      valueColor +
      ';' +
      fontWeight +
      'margin:0;">' +
      sanitizeHtml(value) +
      '</p>' +
      '</td>'
    );
  }

  // --- 그리드 테이블 빌더 ---
  function buildGrid(cells) {
    var widthPct = Math.floor(100 / cells.length);
    var lastWidth = 100 - widthPct * (cells.length - 1);
    var tds = '';
    for (var i = 0; i < cells.length; i++) {
      var w = i === cells.length - 1 ? lastWidth : widthPct;
      tds += buildCell(cells[i][0], cells[i][1], cells[i][2], w);
    }
    return (
      '<table width="100%" cellpadding="0" cellspacing="1" style="background:' +
      c.border +
      ';border-radius:2px;margin-bottom:20px;"><tr>' +
      tds +
      '</tr></table>'
    );
  }

  // --- 섹션 라벨 빌더 ---
  function sectionLabel(text) {
    return (
      '<p style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:' +
      c.sectionLabel +
      ';margin:0 0 10px 0;padding-bottom:7px;border-bottom:1px solid ' +
      c.border +
      ';">' +
      text +
      '</p>'
    );
  }

  var clientCells = [
    ['이름', submission.name || '-', false],
    ['연락처', submission.phone || '-', false],
    ['이메일', submission.email || '-', false],
    ['지역', submission.region || '-', true],
  ];

  var companyCells = [
    ['사업자번호', submission.businessNumber || '-', false],
    ['연매출', submission.annualRevenue || '-', false],
    ['직원수', submission.employeeCount || '-', false],
  ];

  var consultCells = [
    ['상담분야', submission.consultType || '-', true],
    ['희망시간', submission.desiredTime || '-', false],
    ['희망시기', submission.preferredTime || '-', false],
  ];

  // --- HTML 조립 ---
  var html =
    '' +
    '<div style="max-width:580px;margin:0 auto;background:' +
    c.white +
    ';border-radius:4px;overflow:hidden;font-family:-apple-system,Apple SD Gothic Neo,Noto Sans KR,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:' +
    c.primaryDark +
    ';">' +
    '<tr>' +
    '<td style="padding:20px 32px;font-size:17px;font-weight:600;color:' +
    c.light +
    ';letter-spacing:4px;text-transform:uppercase;">Naraddon</td>' +
    '<td style="padding:20px 32px;font-size:11px;color:' +
    c.accent +
    ';letter-spacing:2px;text-transform:uppercase;text-align:right;white-space:nowrap;">New Consultation</td>' +
    '</tr>' +
    '</table>' +
    '<div style="background:' +
    c.bannerBg +
    ';border-left:3px solid ' +
    c.accent +
    ';padding:9px 24px;font-size:12px;color:' +
    c.bannerText +
    ';letter-spacing:0.3px;">' +
    '신규 상담 신청이 접수되었습니다 &mdash; ' +
    submittedAtText +
    '</div>' +
    '<div style="padding:24px 28px 20px;">' +
    sectionLabel('Client') +
    buildGrid(clientCells) +
    sectionLabel('Company') +
    buildGrid(companyCells) +
    sectionLabel('Consultation') +
    buildGrid(consultCells);

  if (submission.message) {
    html +=
      sectionLabel('Message') +
      '<p style="margin:0 0 20px 0;font-size:13px;color:' +
      c.text +
      ';line-height:1.7;padding:10px 14px;background:' +
      c.footerBg +
      ';border-radius:2px;">' +
      sanitizeHtml(submission.message) +
      '</p>';
  }

  var privacyColor = submission.privacyConsent ? c.consentYes : c.consentNo;
  var privacyText = submission.privacyConsent ? '동의' : '미동의';
  var marketingColor = submission.marketingConsent ? c.consentYes : c.consentNo;
  var marketingText = submission.marketingConsent ? '동의' : '미동의';

  html +=
    '' +
    '<table width="100%" cellpadding="0" cellspacing="1" style="background:' +
    c.border +
    ';border-radius:2px;">' +
    '<tr>' +
    '<td width="50%" style="background:' +
    c.white +
    ';padding:8px 14px;">' +
    '<p style="font-size:9px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:' +
    c.label +
    ';margin:0 0 2px 0;">개인정보 수집</p>' +
    '<p style="font-size:12px;color:' +
    privacyColor +
    ';font-weight:500;margin:0;">' +
    privacyText +
    '</p>' +
    '</td>' +
    '<td width="50%" style="background:' +
    c.white +
    ';padding:8px 14px;">' +
    '<p style="font-size:9px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:' +
    c.label +
    ';margin:0 0 2px 0;">마케팅 수신</p>' +
    '<p style="font-size:12px;color:' +
    marketingColor +
    ';font-weight:500;margin:0;">' +
    marketingText +
    '</p>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</div>' +
    '<div style="background:' +
    c.footerBg +
    ';border-top:1px solid ' +
    c.border +
    ';padding:12px 28px;text-align:center;">' +
    '<p style="font-size:10px;color:' +
    c.label +
    ';margin:0;line-height:1.6;letter-spacing:0.3px;">나라똔 &middot; 소상공인 정책자금 플랫폼 &middot; 본 메일은 자동 발송되었습니다</p>' +
    '</div>' +
    '</div>';

  return html;
}

// 고객용 이메일은 Cloudflare Worker(naraddon-email-worker.js)에서 발송
// 이 함수는 레거시 참조용으로만 유지
function buildCustomerEmailBody(submission, submittedAtText) {
  // Cloudflare Worker의 buildCustomerEmailHtml()으로 대체됨
  return '';
}

function buildSmsContent(submission, submittedAtText) {
  var message =
    '나라돈 상담신청\n' +
    '접수:' +
    submittedAtText +
    '\n' +
    '이름:' +
    (submission.name || '-') +
    '\n' +
    '연락:' +
    (submission.phone || '-') +
    '\n' +
    '분야:' +
    (submission.consultType || '-') +
    '\n' +
    '시간:' +
    (submission.desiredTime || '-') +
    ' (' +
    (submission.preferredTime || '-') +
    ')';

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

function jsonResponse(payload, status) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
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
