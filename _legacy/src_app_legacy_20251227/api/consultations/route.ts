import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';
import {
  ConsultationRequest,
  ConsultationStatus,
  ConsultationSource,
  CustomerType,
  ConsultationPhase
} from '@/types/consultation.types';

// ================================================
// Resend 설정 (고객 이메일 발송용)
// ================================================
const RESEND_CONFIG = {
  API_KEY: 're_HY8u6j2q_8Du7qzLQvLHLemNmySELy7EP',
  FROM: '나라똔 <noreply@mail.policy-fund.online>'
};

// 나라똔 브랜드 컬러
const BRAND_COLORS = {
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

// HTML 이스케이프
function sanitizeHtml(value: string | undefined | null): string {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 한국 시간 포맷
function formatKstDate(date: Date): string {
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// 고객용 이메일 HTML (앱스크립트와 동일 디자인)
function buildCustomerEmailHtml(submission: {
  name?: string;
  consultType?: string;
  desiredTime?: string;
  preferredTime?: string;
}, submittedAtText: string): string {
  const c = BRAND_COLORS;
  const customerName = submission.name || '고객';
  const receiptNumber = submittedAtText.replace(/[^0-9]/g, '').slice(0, 12);

  return `<div style="font-family:Pretendard,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:${c.white};">
    <div style="background:linear-gradient(135deg,${c.primary} 0%,${c.secondary} 100%);padding:40px 30px;border-radius:12px 12px 0 0;text-align:center;">
      <div style="width:60px;height:60px;background:${c.white};border-radius:50%;margin:0 auto 16px;line-height:60px;"><span style="font-size:28px;">✅</span></div>
      <h1 style="margin:0;color:${c.white};font-size:24px;">상담 신청 완료</h1>
      <p style="margin:12px 0 0;color:${c.veryLight};font-size:15px;">접수가 정상적으로 완료되었습니다</p>
    </div>
    <div style="padding:32px 24px;">
      <div style="background:${c.background};padding:24px;border-radius:12px;margin-bottom:24px;border-left:4px solid ${c.accent};">
        <p style="margin:0 0 12px;font-size:18px;color:${c.text};">안녕하세요, <strong style="color:${c.primary};">${sanitizeHtml(customerName)}</strong>님</p>
        <p style="margin:0;color:${c.textLight};font-size:14px;line-height:1.7;">나라똔 상담 서비스에 신청해 주셔서 감사합니다.<br>전문 상담사가 빠른 시일 내에 연락드리겠습니다.</p>
      </div>
      <div style="background:${c.white};border:1px solid ${c.border};border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <div style="background:${c.primary};padding:16px 20px;"><h3 style="margin:0;color:${c.white};font-size:15px;">📋 접수 내용</h3></div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:14px 20px;font-size:13px;color:${c.textLight};border-bottom:1px solid ${c.border};width:100px;">접수번호</td><td style="padding:14px 20px;font-size:14px;color:${c.text};font-weight:600;border-bottom:1px solid ${c.border};">${receiptNumber}</td></tr>
          <tr><td style="padding:14px 20px;font-size:13px;color:${c.textLight};border-bottom:1px solid ${c.border};">접수일시</td><td style="padding:14px 20px;font-size:14px;color:${c.text};border-bottom:1px solid ${c.border};">${submittedAtText}</td></tr>
          <tr><td style="padding:14px 20px;font-size:13px;color:${c.textLight};border-bottom:1px solid ${c.border};">상담 분야</td><td style="padding:14px 20px;font-size:14px;color:${c.primary};font-weight:600;border-bottom:1px solid ${c.border};">${sanitizeHtml(submission.consultType || '-')}</td></tr>
          <tr><td style="padding:14px 20px;font-size:13px;color:${c.textLight};">희망 시간</td><td style="padding:14px 20px;font-size:14px;color:${c.text};">${sanitizeHtml(submission.desiredTime || submission.preferredTime || '-')}</td></tr>
        </table>
      </div>
      <div style="background:linear-gradient(135deg,${c.secondary} 0%,${c.accent} 100%);padding:24px;border-radius:12px;text-align:center;">
        <p style="margin:0 0 8px;color:${c.white};font-size:16px;font-weight:700;">📞 영업일 기준 24시간 이내</p>
        <p style="margin:0;color:${c.background};font-size:14px;">전문 상담사가 연락드리겠습니다</p>
      </div>
    </div>
    <div style="background:${c.primaryDark};padding:24px;text-align:center;border-radius:0 0 12px 12px;">
      <p style="margin:0 0 8px;color:${c.white};font-size:14px;font-weight:600;">나라똔</p>
      <p style="margin:0 0 4px;color:${c.light};font-size:12px;">소상공인 정책자금 플랫폼</p>
      <p style="margin:12px 0 0;color:${c.veryLight};font-size:11px;">본 메일은 발신 전용입니다.</p>
    </div>
  </div>`;
}

// Resend로 고객 이메일 발송
async function sendCustomerEmailViaResend(
  customerEmail: string,
  submission: {
    name?: string;
    consultType?: string;
    desiredTime?: string;
    preferredTime?: string;
  },
  submittedAtText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_CONFIG.API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_CONFIG.FROM,
        to: customerEmail,
        subject: '[나라똔] 상담 신청이 접수되었습니다',
        html: buildCustomerEmailHtml(submission, submittedAtText)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Resend] 발송 실패:', response.status, errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('[Resend] 고객 이메일 발송 성공:', customerEmail, result.id);
    return { success: true };
  } catch (error) {
    console.error('[Resend] 오류:', error);
    return { success: false, error: String(error) };
  }
}

// GET /api/consultations - 상담 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const phase = searchParams.get('phase');
    const staffId = searchParams.get('staffId');
    const userId = searchParams.get('userId');

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 필터 조건 생성
    const filter: any = {};
    if (status) filter.status = status;
    if (phase) filter.currentPhase = phase;
    if (staffId) filter.assignedStaffId = staffId;
    if (userId) filter.userId = userId;

    // 사용자 역할에 따른 필터
    const userEmail = session.user?.email;
    const userRole = (session.user as any)?.role;

    if (userRole === 'user') {
      // 일반 사용자는 자신의 상담만 조회
      filter.userEmail = userEmail;
    } else if (userRole === 'examiner') {
      // 기업심사관은 자신에게 배정된 상담만 조회
      filter.assignedStaffId = userEmail;
    }
    // admin은 모든 상담 조회 가능

    const consultations = await db.collection('consultations')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(consultations);
  } catch (error) {
    console.error('Failed to fetch consultations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    );
  }
}

// POST /api/consultations - 상담 신청 (웹폼)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const data = await request.json();

    // 디버깅: 받은 데이터 확인
    console.log('[상담신청] 받은 데이터:', JSON.stringify(data, null, 2));
    console.log('[상담신청] MongoDB URI 설정:', process.env.MONGODB_URI ? '있음' : '없음');
    console.log('[상담신청] 웹훅 URL:', process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL ? '설정됨' : '기본값 사용');

    // 상담 신청 데이터 생성
    const consultation: Partial<ConsultationRequest> = {
      source: ConsultationSource.WEB_FORM,
      customerType: session ? CustomerType.MEMBER : CustomerType.NON_MEMBER,

      // 신청자 정보
      userId: session ? (session.user as any)?.id || session.user?.email : undefined,
      userName: data.userName || session?.user?.name || '',
      userEmail: data.userEmail || session?.user?.email || '',
      userPhone: data.userPhone || '',
      companyName: data.companyName || '',
      businessNumber: data.businessNumber || '',

      // 상담 정보
      consultationType: data.isExaminerConsultation ? '기업심사관 상담' : (data.consultationType || '전문가 상담'),
      message: data.message || '',
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
      preferredTime: data.preferredTime || data.desiredTime,

      // 추가 정보 (기업심사관 상담인 경우)
      annualRevenue: data.annualRevenue,
      employeeCount: data.employeeCount,

      // 상태 정보
      status: ConsultationStatus.PENDING,
      currentPhase: ConsultationPhase.PHONE,

      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 필수 필드 검증
    if (!consultation.userName || !consultation.userEmail || !consultation.userPhone) {
      return NextResponse.json(
        { error: '필수 정보를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // MongoDB 저장 시도 (실패해도 계속 진행)
    let mongoSaveSuccess = false;
    let mongoInsertedId = null;

    try {
      const client = await clientPromise;
      if (client && client.db) {
        const db = client.db('naraddon');
        console.log('[상담신청] MongoDB 연결 성공');

        // 디버깅: 저장할 데이터 확인
        console.log('[상담신청] 저장할 데이터:', JSON.stringify(consultation, null, 2));

        // 상담 신청 저장
        const result = await db.collection('consultations').insertOne(consultation);
        mongoInsertedId = result.insertedId;

        // insertedId가 dummy 또는 fallback으로 시작하면 실제 저장 실패
        if (mongoInsertedId && typeof mongoInsertedId === 'string' &&
            (mongoInsertedId.startsWith('dummy-') || mongoInsertedId.startsWith('fallback-'))) {
          console.warn('[상담신청] MongoDB 더미 클라이언트 사용 중, 실제 저장 안됨');
          mongoSaveSuccess = false;
        } else {
          mongoSaveSuccess = true;
          console.log('[상담신청] MongoDB 실제 저장 완료:', result.insertedId);
        }
      } else {
        console.warn('[상담신청] MongoDB 클라이언트가 없음 (더미 클라이언트 사용 중)');
      }
    } catch (mongoError) {
      console.error('[상담신청] MongoDB 저장 실패:', mongoError);
      // MongoDB 저장 실패해도 계속 진행
    }

    // Google Apps Script 웹훅 호출 (스프레드시트, 이메일, 텔레그램 알림)
    let webhookSuccess = false;
    let webhookErrorDetail = '';

    try {
      // 환경변수에서 따옴표와 공백 제거 (Vercel 환경변수 입력 실수 방지)
      const rawWebhookUrl = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbyzrH3BgdAyqyqw-Mzk013BGkCAZEPnej_Jd7DpN_0g-hKP8qJH85aEdCFlSHxRY3ybZQ/exec';
      const webhookUrl = rawWebhookUrl.trim().replace(/^["']|["']$/g, '');

      const rawWebhookSecret = process.env.CONSULTATION_WEBHOOK_SECRET_EXAMINER || '';
      const webhookSecret = rawWebhookSecret.trim().replace(/^["']|["']$/g, '');

      console.log('[상담신청 웹훅] 환경 체크:', {
        webhookUrlExists: !!process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL,
        webhookUrlLength: webhookUrl.length,
        webhookSecretExists: !!process.env.CONSULTATION_WEBHOOK_SECRET_EXAMINER,
        webhookSecretLength: webhookSecret.length,
        isProduction: process.env.NODE_ENV === 'production'
      });

      // 연매출 영어 -> 한글 변환 매핑
      const annualRevenueMap: Record<string, string> = {
        'pre-startup': '예비창업',
        'under-100m': '1억 미만',
        '100m-500m': '1-5억',
        '500m-1b': '5-10억',
        '1b-5b': '10-50억',
        'over-5b': '50억 이상'
      };

      // 직원 수 영어 -> 한글 변환 매핑
      const employeeCountMap: Record<string, string> = {
        '0': '없음',
        '1-5': '1-5명',
        '6-10': '6-10명',
        '11-30': '11-30명',
        '31-100': '31-100명',
        'over-100': '100명 이상'
      };

      // 한글로 변환 (이미 한글이면 그대로, 영어면 변환)
      const annualRevenueKorean = consultation.annualRevenue
        ? (annualRevenueMap[consultation.annualRevenue] || consultation.annualRevenue)
        : '';

      const employeeCountKorean = consultation.employeeCount
        ? (employeeCountMap[consultation.employeeCount] || consultation.employeeCount)
        : '';

      const webhookPayload = {
        auth: {
          secret: webhookSecret
        },
        submission: {
          name: consultation.userName,
          phone: consultation.userPhone,
          email: consultation.userEmail,
          region: data.region || '', // 지역 정보
          businessNumber: consultation.businessNumber,
          consultType: consultation.consultationType,
          annualRevenue: annualRevenueKorean,
          employeeCount: employeeCountKorean,
          desiredTime: data.desiredTime || '',
          preferredTime: consultation.preferredTime,
          message: consultation.message,
          privacyConsent: true, // 상담 신청시 기본 동의
          marketingConsent: false
        },
        submittedAt: new Date().toISOString(),
        meta: {
          source: consultation.source,
          isExaminerConsultation: data.isExaminerConsultation || false
        },
        notification: {
          emails: process.env.CONSULTATION_NOTIFICATION_EMAILS?.split(',') || ['jjk_naraddon@naver.com'],
          telegram: {
            enabled: true // 텔레그램 설정은 Google Apps Script에서 관리
          },
          sms: {
            enabled: false // SMS는 비활성화
          }
        }
      };

      console.log('[상담신청] 웹훅 URL:', webhookUrl);
      console.log('[상담신청] 웹훅 페이로드:', JSON.stringify(webhookPayload, null, 2));

      // 웹훅 호출 (await로 변경하여 응답 확인)
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      console.log('[상담신청] 웹훅 응답 상태:', webhookResponse.status);

      const responseText = await webhookResponse.text();
      console.log('[상담신청] 웹훅 응답 내용:', responseText);

      if (!webhookResponse.ok) {
        webhookErrorDetail = `Status ${webhookResponse.status}: ${responseText}`;
        console.error('[상담신청] 웹훅 호출 실패:', webhookErrorDetail);
      } else {
        webhookSuccess = true;
        console.log('[상담신청] 웹훅 호출 성공');

        // 응답 내용 파싱 시도
        try {
          const responseJson = JSON.parse(responseText);
          console.log('[상담신청] 웹훅 응답 JSON:', responseJson);
        } catch (e) {
          console.log('[상담신청] 웹훅 응답이 JSON이 아님');
        }
      }

    } catch (webhookError) {
      webhookErrorDetail = webhookError instanceof Error ? webhookError.message : String(webhookError);
      console.error('[상담신청] 웹훅 오류:', webhookError);
      // 웹훅 실패시에도 상담 신청은 성공으로 처리
    }

    // Resend로 고객에게 확인 이메일 발송
    let resendSuccess = false;
    if (consultation.userEmail) {
      const submittedAtText = formatKstDate(new Date());
      const resendResult = await sendCustomerEmailViaResend(
        consultation.userEmail,
        {
          name: consultation.userName,
          consultType: consultation.consultationType,
          desiredTime: data.desiredTime,
          preferredTime: consultation.preferredTime
        },
        submittedAtText
      );
      resendSuccess = resendResult.success;
    }

    // 웹훅 호출 성공 여부와 관계없이 성공 응답 반환
    return NextResponse.json({
      success: true,
      consultationId: mongoInsertedId || 'webhook-only',
      message: '상담 신청이 접수되었습니다. 담당자 배정 후 연락드리겠습니다.',
      debug: process.env.NODE_ENV === 'development' ? {
        mongoSaved: mongoSaveSuccess,
        webhookCalled: true,
        webhookSuccess,
        webhookError: webhookSuccess ? undefined : webhookErrorDetail
      } : undefined
    });
  } catch (error) {
    console.error('Failed to create consultation:', error);

    // 프로덕션 디버깅을 위한 상세 에러 정보
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    const isProduction = process.env.NODE_ENV === 'production';

    return NextResponse.json(
      {
        error: '상담 신청 중 오류가 발생했습니다.',
        details: isProduction ? undefined : errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}