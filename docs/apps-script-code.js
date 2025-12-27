// ================================================
// 나라똔 브랜드 컬러 (따스한 녹색)
// ================================================
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
    payload && payload.auth && typeof payload.auth.secret === 'string' ? payload.auth.secret.trim() : '';

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
    submission.marketingConsent ? '동의' : '미동의'
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
    name: '나라똔 상담센터'
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
      name: '나라똔'
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
    disable_web_page_preview: true
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
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
      messages: [{ to: sanitizedRecipient }]
    };

    var options = {
      method: 'post',
      contentType: 'application/json; charset=utf-8',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: {
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': config.accessKey,
        'x-ncp-apigw-signature-v2': signatureBase64
      }
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
  var enabled =
    typeof raw.enabled === 'boolean'
      ? raw.enabled
      : Boolean(token && chatId);

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
    senderNumber: raw.senderNumber || getScriptProperty('NAVER_SENS_SENDER_NUMBER')
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
    '• 상담희망시간: ' + (submission.desiredTime || '-') + ' (' + (submission.preferredTime || '-') + ')'
  ];

  if (submission.message) {
    lines.push('• 문의사항: ' + submission.message);
  }

  lines.push('');
  lines.push('📊 스프레드시트 바로가기');
  lines.push('https://docs.google.com/spreadsheets/d/1s1F6yw3ioJv1_pzI_OKG1u_st1S2pGRc99jqsUQbnIw/edit?gid=0#gid=0');
  lines.push('위 링크를 클릭하시면 접수내역으로 바로 이동됩니다.');

  return lines.join('\n');
}

function buildStaffEmailBody(submission, submittedAtText, meta) {
  var c = BRAND_COLORS;

  var customerRows = [
    ['이름', submission.name || '-'],
    ['연락처', submission.phone || '-'],
    ['이메일', submission.email || '-'],
    ['지역', submission.region || '-']
  ];

  var companyRows = [
    ['사업자번호', submission.businessNumber || '-'],
    ['연매출', submission.annualRevenue || '-'],
    ['직원 수', submission.employeeCount || '-']
  ];

  var consultRows = [
    ['상담 분야', submission.consultType || '-'],
    ['희망 시간', submission.desiredTime || '-'],
    ['희망 시기', submission.preferredTime || '-']
  ];

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
      '<h1 style="margin:0;color:' + c.white + ';font-size:22px;font-weight:700;">📋 신규 상담 신청</h1>' +
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

function buildCustomerEmailBody(submission, submittedAtText) {
  var c = BRAND_COLORS;
  var customerName = submission.name || '고객';

  var html = '' +
    '<div style="font-family:Pretendard,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;background:' + c.white + ';">' +
    '<div style="background:linear-gradient(135deg, ' + c.primary + ' 0%, ' + c.secondary + ' 100%);padding:40px 30px;border-radius:12px 12px 0 0;text-align:center;">' +
      '<div style="width:60px;height:60px;background:' + c.white + ';border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">' +
        '<span style="font-size:28px;">✅</span>' +
      '</div>' +
      '<h1 style="margin:0;color:' + c.white + ';font-size:24px;font-weight:700;">상담 신청 완료</h1>' +
      '<p style="margin:12px 0 0;color:' + c.veryLight + ';font-size:15px;">접수가 정상적으로 완료되었습니다</p>' +
    '</div>' +
    '<div style="padding:32px 24px;">' +
      '<div style="background:linear-gradient(135deg, ' + c.background + ' 0%, #f0fdf4 100%);padding:24px;border-radius:12px;margin-bottom:24px;border-left:4px solid ' + c.accent + ';">' +
        '<p style="margin:0 0 12px;font-size:18px;color:' + c.text + ';">안녕하세요, <strong style="color:' + c.primary + ';">' + sanitizeHtml(customerName) + '</strong>님</p>' +
        '<p style="margin:0;color:' + c.textLight + ';font-size:14px;line-height:1.7;">나라똔 상담 서비스에 신청해 주셔서 감사합니다.<br>전문 상담사가 빠른 시일 내에 연락드리겠습니다.</p>' +
      '</div>' +
      '<div style="background:' + c.white + ';border:1px solid ' + c.border + ';border-radius:12px;overflow:hidden;margin-bottom:24px;">' +
        '<div style="background:' + c.primary + ';padding:16px 20px;">' +
          '<h3 style="margin:0;color:' + c.white + ';font-size:15px;font-weight:600;">📋 접수 내용</h3>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          '<tr>' +
            '<td style="padding:14px 20px;font-size:13px;color:' + c.textLight + ';border-bottom:1px solid ' + c.border + ';width:100px;">접수번호</td>' +
            '<td style="padding:14px 20px;font-size:14px;color:' + c.text + ';font-weight:600;border-bottom:1px solid ' + c.border + ';">' + submittedAtText.replace(/[^0-9]/g, '').slice(0, 12) + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:14px 20px;font-size:13px;color:' + c.textLight + ';border-bottom:1px solid ' + c.border + ';">접수일시</td>' +
            '<td style="padding:14px 20px;font-size:14px;color:' + c.text + ';border-bottom:1px solid ' + c.border + ';">' + submittedAtText + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:14px 20px;font-size:13px;color:' + c.textLight + ';border-bottom:1px solid ' + c.border + ';">상담 분야</td>' +
            '<td style="padding:14px 20px;font-size:14px;color:' + c.primary + ';font-weight:600;border-bottom:1px solid ' + c.border + ';">' + sanitizeHtml(submission.consultType || '-') + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:14px 20px;font-size:13px;color:' + c.textLight + ';">희망 시간</td>' +
            '<td style="padding:14px 20px;font-size:14px;color:' + c.text + ';">' + sanitizeHtml(submission.desiredTime || submission.preferredTime || '-') + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +
      '<div style="background:linear-gradient(135deg, ' + c.secondary + ' 0%, ' + c.accent + ' 100%);padding:24px;border-radius:12px;text-align:center;">' +
        '<p style="margin:0 0 8px;color:' + c.white + ';font-size:16px;font-weight:700;">📞 영업일 기준 24시간 이내</p>' +
        '<p style="margin:0;color:' + c.background + ';font-size:14px;">전문 상담사가 연락드리겠습니다</p>' +
      '</div>' +
    '</div>' +
    '<div style="background:' + c.primaryDark + ';padding:24px;text-align:center;border-radius:0 0 12px 12px;">' +
      '<p style="margin:0 0 8px;color:' + c.white + ';font-size:14px;font-weight:600;">나라똔</p>' +
      '<p style="margin:0 0 4px;color:' + c.light + ';font-size:12px;">소상공인 정책자금 플랫폼</p>' +
      '<p style="margin:12px 0 0;color:' + c.veryLight + ';font-size:11px;">본 메일은 발신 전용입니다. 문의사항은 상담사 연락을 기다려주세요.</p>' +
    '</div>' +
  '</div>';

  return html;
}

function buildSmsContent(submission, submittedAtText) {
  var message =
    '나라돈 상담신청\n' +
    '접수:' + submittedAtText + '\n' +
    '이름:' + (submission.name || '-') + '\n' +
    '연락:' + (submission.phone || '-') + '\n' +
    '분야:' + (submission.consultType || '-') + '\n' +
    '시간:' + (submission.desiredTime || '-') + ' (' + (submission.preferredTime || '-') + ')';

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
