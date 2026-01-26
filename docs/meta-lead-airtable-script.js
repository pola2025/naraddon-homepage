// ================================================
// 나라똔 - Airtable Automation Script
// 용도: Meta 리드 수신 시 Worker 호출 (스프레드시트 + 이메일 + 텔레그램)
// 트리거: When record is created → Run a script
// ================================================

/**
 * Airtable Automation 설정 방법:
 *
 * 1. Airtable 접속 → Base 열기 (appNSHE8lXo0RTG0b)
 * 2. 상단 "Automations" 클릭
 * 3. "+ Create automation" 클릭
 * 4. 이름: "나라똔 Meta 리드 알림"
 *
 * 5. 트리거 설정:
 *    - "When record is created" 선택
 *    - Table: "고객정보"
 *
 * 6. 액션 설정:
 *    - "+ Add action" 클릭
 *    - "Run a script" 선택
 *    - 아래 코드 전체 복사 → 붙여넣기
 *
 * 7. Input variables 설정 (Configure 클릭):
 *    - recordId: Record ID 선택
 *
 * 8. "Test step" 클릭하여 테스트
 * 9. 성공 시 토글 ON (활성화)
 */

// ================================================
// 설정 정보
// ================================================

/**
 * Airtable:
 * - Base ID: appNSHE8lXo0RTG0b
 * - Table: 고객정보
 * - Share URL: https://airtable.com/appNSHE8lXo0RTG0b/shrkpQMM6KR1xUkiF
 *
 * Worker:
 * - URL: https://meta-naraddon.leejeho0110.workers.dev/
 *
 * Google Sheets:
 * - Webhook: https://script.google.com/macros/s/AKfycbzqNIqOSZeCuUVDty4WS1tWoboER2OC3x-XjaJAqa5C4HiPUFrmEo3t3YfEOgZk-tFZ6Q/exec
 * - Spreadsheet: https://docs.google.com/spreadsheets/d/1foybfKbAqi-JF3tMYO4JBDOmcIv8lTzy6ABoSyTcmmw/edit
 *
 * 이메일 수신:
 * - TO: imjoo@jjk-biz.com, ijy@jjk-biz.com, syj@jjk-biz.com
 * - BCC: mkt@polarad.co.kr
 *
 * 텔레그램:
 * - Chat ID: -1002948627243
 *
 * 브랜드 정보:
 * - 브랜드명: 나라똔
 *
 * 필드 구성:
 * - no: autonumber
 * - 플랫폼: singletext
 * - 광고명: singletext
 * - 지역: singletext
 * - 이름: singletext
 * - 연락처: phone number
 * - 사업자종류: singletext (개인사업자/법인사업자)
 */

// ================================================
// Input Variables 설정
// ================================================

let inputConfig = input.config();
let recordId = inputConfig.recordId;

console.log('🔍 받은 recordId:', recordId);

// ================================================
// 테이블에서 레코드 가져오기
// ================================================

let table = base.getTable('고객정보');
let record = await table.selectRecordAsync(recordId);

if (!record) {
    console.log('❌ 레코드를 찾을 수 없습니다.');
    output.set('status', 'error');
    output.set('error', 'Record not found');
} else {
    console.log('📋 레코드 조회 성공:', record.id);

    // ================================================
    // 필드값 추출
    // ================================================

    const data = {
        no: record.getCellValue('no') || '-',
        플랫폼: record.getCellValue('플랫폼') || 'Meta',
        광고명: record.getCellValue('광고명') || '-',
        지역: record.getCellValue('지역') || '-',
        이름: record.getCellValue('이름') || '-',
        연락처: record.getCellValue('연락처') || '-',
        사업자종류: record.getCellValue('사업자종류') || '-'
    };

    console.log('📋 추출된 데이터:', JSON.stringify(data));

    // ================================================
    // Worker 호출 (스프레드시트 + 이메일 + 텔레그램)
    // ================================================

    const WORKER_URL = 'https://meta-naraddon.leejeho0110.workers.dev/';

    try {
        console.log('🚀 Worker 호출 시작...');

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log('✅ Worker 호출 성공!');
            console.log('📊 스프레드시트:', result.googleSheets?.success ? '성공' : '실패');
            console.log('📧 이메일:', result.email?.success ? '성공' : '실패');
            console.log('📱 텔레그램:', result.telegram?.success ? '성공' : '실패');

            // 스프레드시트 실패 시 오류 상세 출력
            if (!result.googleSheets?.success) {
                console.log('📊 스프레드시트 오류:', result.googleSheets?.error || 'Unknown error');
            }

            // 이메일 실패 시 오류 상세 출력
            if (!result.email?.success) {
                console.log('📧 이메일 오류:', result.email?.error || 'Unknown error');
            }

            // 텔레그램 실패 시 오류 상세 출력
            if (!result.telegram?.success) {
                console.log('📱 텔레그램 오류:', result.telegram?.error || 'Unknown error');
            }

            output.set('status', 'success');
            output.set('sheets_status', result.googleSheets?.success ? 'saved' : 'failed');
            output.set('email_status', result.email?.success ? 'sent' : 'failed');
            output.set('telegram_status', result.telegram?.success ? 'sent' : 'failed');
        } else {
            console.log('❌ Worker 호출 실패');
            console.log('에러:', JSON.stringify(result));
            output.set('status', 'failed');
            output.set('error', result.error || 'Unknown error');
        }

    } catch (error) {
        console.log('❌ 요청 중 오류 발생');
        console.log('에러 메시지:', error.message);
        output.set('status', 'error');
        output.set('error', error.message);
    }
}
