// ================================================
// 나라똔 - Airtable Automation Script
// ================================================
// 용도: 상담 접수 시 Google Sheets 저장 + 텔레그램 알림 + 고객 이메일 발송
// 트리거: When record is created → Run a script
// ================================================

/**
 * Airtable Automation 설정 방법:
 *
 * 1. Airtable Base 열기 (appNSHE8lXo0RTG0b)
 * 2. 상단 "Automations" 클릭
 * 3. "+ Create automation" 클릭
 * 4. 이름: "상담접수 알림 (Sheets + Telegram + Email)"
 *
 * 5. 트리거 설정:
 *    - "When record is created" 선택
 *    - Table: 나라똔_상담접수 테이블 선택
 *
 * 6. 액션 설정:
 *    - "+ Add action" 클릭
 *    - "Run a script" 선택
 *    - 아래 코드 전체 복사 → 붙여넣기
 *
 * 7. Input variables 설정 (좌측 패널):
 *    - recordId: Record ID 선택
 *
 * 8. "Test" 클릭하여 테스트
 * 9. 성공 시 토글 ON (활성화)
 */

// ================================================
// 설정값 (여기만 수정하세요)
// ================================================

const CONFIG = {
    // Google Sheets 설정
    GOOGLE_SHEETS_WEBHOOK_URL: 'https://script.google.com/macros/s/AKfycbxxXp3rfZV3KfNajiWcbhHAbaX6X6Nm-2YlDwUfYgAq63NAJa8bkZNzpdDp8izqos4H/exec',
    SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1l2yt4HjVGFt7V8Iy4EOvQvYH1DV_FqP0yTSa9CUnOoQ/edit',

    // 텔레그램 설정
    TELEGRAM_BOT_TOKEN: '8053531001:AAHsPDUPGx0PzuqqXJMmveevEWAlVo-Bcjk',
    TELEGRAM_CHAT_ID: '-1002948627243',

    // Resend 이메일 설정
    RESEND_API_KEY: 're_HY8u6j2q_8Du7qzLQvLHLemNmySELy7EP',
    EMAIL_FROM: '나라똔 <noreply@mail.policy-fund.online>',

    // Airtable 테이블명
    TABLE_NAME: '나라똔_상담접수'
};

// ================================================
// 메인 스크립트
// ================================================

let inputConfig = input.config();
let recordId = inputConfig.recordId;

// 테이블에서 레코드 가져오기
let table = base.getTable(CONFIG.TABLE_NAME);
let record = await table.selectRecordAsync(recordId);

if (!record) {
    console.log('❌ 레코드를 찾을 수 없습니다.');
    output.set('status', 'error');
    output.set('error', 'Record not found');
} else {
    console.log('📋 레코드 조회 성공:', record.id);

    // ================================================
    // 필드값 추출 (테이블 필드명에 맞게 수정)
    // ================================================
    const data = {
        name: record.getCellValueAsString('이름') || '-',
        company: record.getCellValueAsString('회사명') || '-',
        phone: record.getCellValueAsString('연락처') || '-',
        email: record.getCellValueAsString('이메일') || '-',
        businessNumber: record.getCellValueAsString('사업자번호') || '-',
        consultType: record.getCellValueAsString('상담유형') || '-',
        annualRevenue: record.getCellValueAsString('연매출') || '-',
        employeeCount: record.getCellValueAsString('직원수') || '-',
        preferredTime: record.getCellValueAsString('희망시간') || '-',
        region: record.getCellValueAsString('지역') || '-',
        message: record.getCellValueAsString('요청내용') || '-',
        createdAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    };

    // ================================================
    // 1. Google Sheets 저장 (웹훅 호출)
    // ================================================
    let sheetsResult = { success: false };

    try {
        let sheetsResponse = await fetch(CONFIG.GOOGLE_SHEETS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            redirect: 'follow',
            body: JSON.stringify({
                action: 'addRow',
                data: data
            })
        });

        if (sheetsResponse.ok) {
            sheetsResult.success = true;
            console.log('✅ Google Sheets 저장 성공');
        } else {
            console.log('❌ Google Sheets 저장 실패:', sheetsResponse.status);
        }
    } catch (error) {
        console.log('❌ Google Sheets 오류:', error.message);
    }

    // ================================================
    // 2. 텔레그램 알림 전송 (관리자용)
    // ================================================
    // 특수 문자 이스케이프 (Markdown 파싱 오류 방지)
    const escapeMarkdown = (text) => {
        if (!text) return '-';
        return String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    };

    const telegramMessage = `📋 *나라똔 홈페이지 상담접수*

👤 이름: ${escapeMarkdown(data.name)}
🏢 회사명: ${escapeMarkdown(data.company)}
📱 연락처: ${escapeMarkdown(data.phone)}
📧 이메일: ${escapeMarkdown(data.email)}
🔢 사업자번호: ${escapeMarkdown(data.businessNumber)}

📋 상담유형: ${escapeMarkdown(data.consultType)}
💰 연매출: ${escapeMarkdown(data.annualRevenue)}
👥 직원수: ${escapeMarkdown(data.employeeCount)}
⏰ 희망시간: ${escapeMarkdown(data.preferredTime)}
📍 지역: ${escapeMarkdown(data.region)}

📝 요청내용:
${escapeMarkdown(data.message)}

📅 접수시간: ${escapeMarkdown(data.createdAt)}

📊 스프레드시트에서 확인:
${CONFIG.SPREADSHEET_URL}`;

    try {
        let telegramResponse = await fetch(
            `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.TELEGRAM_CHAT_ID,
                    text: telegramMessage,
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                })
            }
        );

        let telegramResult = await telegramResponse.json();

        if (telegramResult.ok) {
            console.log('✅ 텔레그램 알림 전송 성공');
        } else {
            console.log('❌ 텔레그램 전송 실패:', telegramResult.description);
        }
    } catch (error) {
        console.log('❌ 텔레그램 오류:', error.message);
    }

    // ================================================
    // 3. 고객 이메일 발송 (Resend API)
    // ================================================
    let emailResult = { success: false };

    if (data.email && data.email !== '-' && data.email.includes('@')) {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .info-item { margin: 8px 0; }
        .label { color: #64748b; font-size: 14px; }
        .value { color: #1e293b; font-weight: 500; }
        .footer { background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 12px 12px; }
        .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>나라똔 상담 접수 완료</h1>
    </div>
    <div class="content">
        <p><strong>${data.name}</strong>님, 안녕하세요.</p>
        <p>정책자금 상담 신청이 정상적으로 접수되었습니다.</p>

        <div class="highlight">
            <strong>📞 영업일 기준 1일 이내에 담당자가 연락드립니다.</strong>
        </div>

        <div class="info-box">
            <h3 style="margin-top: 0; color: #1e40af;">접수 내용</h3>
            <div class="info-item"><span class="label">이름:</span> <span class="value">${data.name}</span></div>
            <div class="info-item"><span class="label">회사명:</span> <span class="value">${data.company}</span></div>
            <div class="info-item"><span class="label">연락처:</span> <span class="value">${data.phone}</span></div>
            <div class="info-item"><span class="label">상담유형:</span> <span class="value">${data.consultType}</span></div>
            <div class="info-item"><span class="label">희망시간:</span> <span class="value">${data.preferredTime}</span></div>
            <div class="info-item"><span class="label">접수시간:</span> <span class="value">${data.createdAt}</span></div>
        </div>

        <p>문의사항이 있으시면 아래로 연락 주세요.</p>
        <p>
            <strong>전화:</strong> 02-6914-5567<br>
            <strong>이메일:</strong> jjk_naraddon@naver.com
        </p>
    </div>
    <div class="footer">
        <p>나라똔 | 정책자금 전문 컨설팅</p>
        <p>본 메일은 발신 전용입니다.</p>
    </div>
</body>
</html>`;

        try {
            let emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CONFIG.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: CONFIG.EMAIL_FROM,
                    to: data.email,
                    subject: `[나라똔] ${data.name}님, 상담 접수가 완료되었습니다`,
                    html: emailHtml
                })
            });

            if (emailResponse.ok) {
                emailResult.success = true;
                console.log('✅ 고객 이메일 발송 성공:', data.email);
            } else {
                let errorData = await emailResponse.json();
                console.log('❌ 이메일 발송 실패:', errorData);
            }
        } catch (error) {
            console.log('❌ 이메일 오류:', error.message);
        }
    } else {
        console.log('⚠️ 고객 이메일 주소 없음 - 발송 건너뜀');
    }

    // 결과 출력
    output.set('status', 'success');
    output.set('sheets_saved', sheetsResult.success);
    output.set('email_sent', emailResult.success);
}
