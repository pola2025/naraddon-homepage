import { google } from 'googleapis';
import { ConsultationRequest } from '@/types/consultation.types';

// Google Sheets API 설정
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// 스프레드시트 ID (환경변수로 관리)
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = '상담신청'; // 시트 이름

/**
 * 상담 신청 내역을 Google Sheets에 기록
 */
export async function appendConsultationToSheet(consultation: Partial<ConsultationRequest>) {
  try {
    if (!SPREADSHEET_ID) {
      console.error('Google Spreadsheet ID가 설정되지 않았습니다.');
      return false;
    }

    // 현재 시간 (한국 시간)
    const kstDate = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 스프레드시트에 추가할 데이터
    const row = [
      kstDate, // 접수일시
      consultation.userName || '',
      consultation.userPhone || '',
      consultation.userEmail || '',
      consultation.companyName || '',
      consultation.businessNumber || '',
      consultation.consultationType || '',
      consultation.annualRevenue || '',
      consultation.employeeCount || '',
      consultation.preferredTime || '',
      consultation.message || '',
      consultation.source || 'WEB_FORM',
      consultation.status || 'PENDING',
      '', // 담당자 (나중에 배정)
      '', // 처리일시
      '', // 처리내용
    ];

    // Google Sheets에 데이터 추가
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:P`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    console.log('[Google Sheets] 상담 신청 기록 완료:', response.data);
    return true;
  } catch (error) {
    console.error('[Google Sheets] 상담 신청 기록 실패:', error);
    return false;
  }
}

/**
 * Google Sheets 헤더 초기화 (첫 실행시에만)
 */
export async function initializeSheetHeaders() {
  try {
    if (!SPREADSHEET_ID) {
      console.error('Google Spreadsheet ID가 설정되지 않았습니다.');
      return false;
    }

    const headers = [
      '접수일시',
      '이름/회사명',
      '연락처',
      '이메일',
      '회사명',
      '사업자등록번호',
      '상담유형',
      '연매출',
      '직원수',
      '희망시기',
      '상담내용',
      '접수경로',
      '상태',
      '담당자',
      '처리일시',
      '처리내용',
    ];

    // 첫 번째 행에 헤더 설정
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:P1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    console.log('[Google Sheets] 헤더 초기화 완료');
    return true;
  } catch (error) {
    console.error('[Google Sheets] 헤더 초기화 실패:', error);
    return false;
  }
}