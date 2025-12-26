// ================================================
// 나라똔 - Airtable Automation Script
// ================================================
// 용도: 상담 접수 시 Google Sheets 저장 + 텔레그램 알림
// 트리거: When record is created → Run a script
// ================================================

/**
 * Airtable Automation 설정 방법:
 *
 * 1. Airtable Base 열기 (appNSHE8lXo0RTG0b)
 * 2. 상단 "Automations" 클릭
 * 3. "+ Create automation" 클릭
 * 4. 이름: "상담접수 알림 (Sheets + Telegram)"
 *
 * 5. 트리거 설정:
 *    - "When record is created" 선택
 *    - Table: 상담접수 테이블 선택
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
    GOOGLE_SHEETS_WEBHOOK_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEBHOOK_URL', // Google Apps Script 웹훅 URL
    SPREADSHEET_URL: 'YOUR_SPREADSHEET_URL', // 공유할 스프레드시트 URL

    // 텔레그램 설정
    TELEGRAM_BOT_TOKEN: '8053531001:AAHsPDUPGx0PzuqqXJMmveevEWAlVo-Bcjk',
    TELEGRAM_CHAT_ID: '-1002948627243',

    // Airtable 테이블명
    TABLE_NAME: '상담접수' // 실제 테이블명으로 변경
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

    if (CONFIG.GOOGLE_SHEETS_WEBHOOK_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEBHOOK_URL') {
        try {
            let sheetsResponse = await fetch(CONFIG.GOOGLE_SHEETS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
    } else {
        console.log('⚠️ Google Sheets 웹훅 URL 미설정');
    }

    // ================================================
    // 2. 텔레그램 알림 전송 (스프레드시트 URL 포함)
    // ================================================
    const telegramMessage = `📝 *새로운 상담 접수*

👤 이름: ${data.name}
🏢 회사명: ${data.company}
📱 연락처: ${data.phone}
📧 이메일: ${data.email}
🔢 사업자번호: ${data.businessNumber}

📋 상담유형: ${data.consultType}
💰 연매출: ${data.annualRevenue}
👥 직원수: ${data.employeeCount}
🕐 희망시간: ${data.preferredTime}
📍 지역: ${data.region}

💬 요청내용:
${data.message}

📅 접수시간: ${data.createdAt}

📊 *스프레드시트 바로가기:*
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
                    disable_web_page_preview: false
                })
            }
        );

        let telegramResult = await telegramResponse.json();

        if (telegramResult.ok) {
            console.log('✅ 텔레그램 알림 전송 성공');
            output.set('status', 'success');
            output.set('telegram_message_id', telegramResult.result.message_id);
        } else {
            console.log('❌ 텔레그램 전송 실패:', telegramResult.description);
            output.set('status', 'partial');
            output.set('error', telegramResult.description);
        }
    } catch (error) {
        console.log('❌ 텔레그램 오류:', error.message);
        output.set('status', 'error');
        output.set('error', error.message);
    }

    output.set('sheets_saved', sheetsResult.success);
}
