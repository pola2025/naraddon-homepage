// ================================================
// 나라똔 - Google Apps Script (Sheets 저장용)
// ================================================
// 용도: Airtable에서 호출하여 Google Sheets에 데이터 저장
// 배포: 웹 앱으로 배포 후 URL을 Airtable 스크립트에 입력
// ================================================

/**
 * Google Apps Script 설정 방법:
 *
 * 1. Google Sheets 생성
 *    - 새 스프레드시트 만들기
 *    - 시트 이름: "상담접수"
 *    - 첫 행에 헤더 입력:
 *      접수일시 | 이름 | 회사명 | 연락처 | 이메일 | 사업자번호 |
 *      상담유형 | 연매출 | 직원수 | 희망시간 | 지역 | 요청내용
 *
 * 2. 확장 프로그램 → Apps Script 클릭
 *
 * 3. 아래 코드 전체 복사 → 붙여넣기
 *
 * 4. 배포:
 *    - "배포" → "새 배포" 클릭
 *    - 유형: "웹 앱" 선택
 *    - 실행 주체: "나"
 *    - 액세스 권한: "모든 사용자"
 *    - "배포" 클릭
 *    - 웹 앱 URL 복사 → Airtable 스크립트의 GOOGLE_SHEETS_WEBHOOK_URL에 입력
 *
 * 5. 권한 승인 (최초 1회)
 */

// ================================================
// 설정값
// ================================================

const SHEET_NAME = '상담접수'; // 시트 이름

// ================================================
// 웹 요청 처리 (POST)
// ================================================

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const data = payload.data;

    if (action === 'addRow') {
      const result = addRowToSheet(data);
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, result: result }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET 요청 처리 (테스트용)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      message: '나라똔 상담접수 웹훅 활성화됨',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================
// 시트에 행 추가
// ================================================

function addRowToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`시트 '${SHEET_NAME}'를 찾을 수 없습니다.`);
  }

  // 새 행 데이터 (헤더 순서와 일치해야 함)
  const newRow = [
    data.createdAt || new Date().toLocaleString('ko-KR'),  // 접수일시
    data.name || '',                                        // 이름
    data.company || '',                                     // 회사명
    data.phone || '',                                       // 연락처
    data.email || '',                                       // 이메일
    data.businessNumber || '',                              // 사업자번호
    data.consultType || '',                                 // 상담유형
    data.annualRevenue || '',                               // 연매출
    data.employeeCount || '',                               // 직원수
    data.preferredTime || '',                               // 희망시간
    data.region || '',                                      // 지역
    data.message || ''                                      // 요청내용
  ];

  // 마지막 행 다음에 추가
  sheet.appendRow(newRow);

  // 추가된 행 번호 반환
  const lastRow = sheet.getLastRow();

  return {
    row: lastRow,
    timestamp: new Date().toISOString()
  };
}

// ================================================
// 테스트 함수
// ================================================

function testAddRow() {
  const testData = {
    name: '테스트',
    company: '테스트회사',
    phone: '010-1234-5678',
    email: 'test@test.com',
    businessNumber: '123-45-67890',
    consultType: '정부지원금',
    annualRevenue: '1억 미만',
    employeeCount: '1-5명',
    preferredTime: '평일 오후',
    region: '서울',
    message: '테스트 메시지입니다.',
    createdAt: new Date().toLocaleString('ko-KR')
  };

  const result = addRowToSheet(testData);
  Logger.log('테스트 결과:', result);
}
