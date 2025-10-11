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

// 웹훅 관련 환경변수 - 기업심사관(AUDITOR) 용 사용
// 환경변수에서 따옴표와 공백 제거 (Vercel 환경변수 입력 실수 방지)
const rawWebhookUrl = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL_AUDITOR || process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL || '';
const GOOGLE_APPS_SCRIPT_WEBHOOK_URL = rawWebhookUrl.trim().replace(/^["']|["']$/g, '');

const rawNotificationEmails = process.env.CONSULTATION_NOTIFICATION_EMAILS_AUDITOR || process.env.CONSULTATION_NOTIFICATION_EMAILS || '';
const CONSULTATION_NOTIFICATION_EMAILS = rawNotificationEmails.trim().replace(/^["']|["']$/g, '');

const rawTelegramToken = process.env.TELEGRAM_BOT_TOKEN_AUDITOR || '';
const TELEGRAM_BOT_TOKEN = rawTelegramToken.trim().replace(/^["']|["']$/g, '');

const rawTelegramChatId = process.env.TELEGRAM_CHAT_ID_AUDITOR || '';
const TELEGRAM_CHAT_ID = rawTelegramChatId.trim().replace(/^["']|["']$/g, '');

const rawWebhookSecret = process.env.CONSULTATION_WEBHOOK_SECRET_AUDITOR || '';
const CONSULTATION_WEBHOOK_SECRET = rawWebhookSecret.trim().replace(/^["']|["']$/g, '');

function parseEmailList(raw: string): string[] {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// 영어 값을 한글로 변환하는 헬퍼 함수들
function convertAnnualRevenue(value: string): string {
  const map: Record<string, string> = {
    // 기존 형식
    'under-1': '1억 미만',
    '1-5': '1억-5억',
    '5-10': '5억-10억',
    '10-30': '10억-30억',
    '30-50': '30억-50억',
    '50-100': '50억-100억',
    'over-100': '100억 이상',
    // 새로운 형식 (consultation-request 페이지)
    'pre-startup': '예비창업',
    'under-100m': '1억 미만',
    '100m-500m': '1-5억',
    '500m-1b': '5-10억',
    '1b-5b': '10-50억',
    'over-5b': '50억 이상'
  };
  return map[value] || value;
}

function convertEmployeeCount(value: string): string {
  const map: Record<string, string> = {
    '0': '없음',
    '1-5': '1-5명',
    '6-10': '6-10명',
    '11-30': '11-30명',
    '31-100': '31-100명',
    'over-100': '100명 이상'
  };
  return map[value] || value;
}

function convertPreferredTime(value: string): string {
  const map: Record<string, string> = {
    'immediate': '즉시 상담',
    'today': '오늘 중',
    'week': '1주 이내',
    'two_weeks': '2주 이내',
    'month': '1개월 이내',
    'weekday': '평일',
    'weekend': '주말',
    'anytime': '상관없음'
  };
  return map[value] || value;
}

function convertConsultationField(value: string): string {
  const map: Record<string, string> = {
    'legal': '법무·특허',
    'tax': '세무·회계',
    'labor': '인사·노무',
    'marketing': '마케팅·브랜딩',
    'tech': '기술·IT',
    'strategy': '경영전략'
  };
  return map[value] || value;
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
    } else if (userRole === 'auditor') {
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
      consultationType: data.isAuditorConsultation ? '기업심사관 상담' : (data.consultationType || '전문가 상담'),
      consultationField: data.consultationField, // 전문가 상담 분야 (법무·특허, 세무·회계 등)
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

    const client = await clientPromise;
    const db = client.db('naraddon');

    // 상담 신청 저장
    const result = await db.collection('consultations').insertOne(consultation);

    // 웹훅 호출로 알림 발송
    let notificationsForwarded = false;
    let notificationError: string | undefined;

    console.log('[Webhook Debug] Environment check:', {
      url: !!GOOGLE_APPS_SCRIPT_WEBHOOK_URL,
      urlLength: GOOGLE_APPS_SCRIPT_WEBHOOK_URL?.length,
      secret: !!CONSULTATION_WEBHOOK_SECRET,
      secretPrefix: CONSULTATION_WEBHOOK_SECRET?.substring(0, 10),
      telegram: !!TELEGRAM_BOT_TOKEN,
      chatId: !!TELEGRAM_CHAT_ID
    });

    if (GOOGLE_APPS_SCRIPT_WEBHOOK_URL) {
      const webhookPayload: Record<string, unknown> = {
        submission: {
          name: consultation.userName,
          phone: consultation.userPhone,
          email: consultation.userEmail,
          company: consultation.companyName,
          message: consultation.message,
          consultType: consultation.consultationType,
          consultField: convertConsultationField(consultation.consultationField || ''),
          preferredTime: convertPreferredTime(consultation.preferredTime || ''),
          annualRevenue: convertAnnualRevenue(consultation.annualRevenue || ''),
          employeeCount: convertEmployeeCount(consultation.employeeCount || ''),
          desiredTime: data.desiredTime || consultation.preferredTime || '',  // 상담희망시간 추가
          region: data.region || '',
          businessNumber: consultation.businessNumber,
          privacyConsent: true,
          marketingConsent: data.marketingConsent || false
        },
        submittedAt: new Date().toISOString(),
        meta: {
          consultationId: result.insertedId,
          source: 'consultation-request-form'
        },
        notification: {
          emails: parseEmailList(CONSULTATION_NOTIFICATION_EMAILS),
          telegram: {
            enabled: Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID),
            botToken: TELEGRAM_BOT_TOKEN,
            chatId: TELEGRAM_CHAT_ID,
          }
        }
      };

      if (CONSULTATION_WEBHOOK_SECRET) {
        (webhookPayload as { auth?: { secret: string } }).auth = {
          secret: CONSULTATION_WEBHOOK_SECRET,
        };
      }

      try {
        console.log('[Webhook Debug] Sending to:', GOOGLE_APPS_SCRIPT_WEBHOOK_URL);
        console.log('[Webhook Debug] Payload has auth:', !!webhookPayload.auth);

        const response = await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          body: JSON.stringify(webhookPayload),
        });

        const responseText = await response.text();
        console.log('[Webhook Debug] Response status:', response.status);
        console.log('[Webhook Debug] Response body:', responseText);

        if (!response.ok) {
          notificationError = `웹훅 응답 오류 (status: ${response.status})`;
          console.error('Webhook error:', notificationError);
        } else {
          const responseJson = JSON.parse(responseText);
          if (responseJson.ok === false) {
            notificationError = responseJson.message || 'Webhook returned error';
            console.error('[Webhook Debug] Webhook rejected:', notificationError);
          } else {
            notificationsForwarded = true;
            console.log('Webhook notification sent successfully');
          }
        }
      } catch (error) {
        notificationError =
          error instanceof Error ? error.message : '웹훅 전송 중 알 수 없는 오류가 발생했습니다.';
        console.error('Webhook catch error:', error);
        console.error('Webhook error details:', notificationError);
      }
    } else {
      notificationError = 'GOOGLE_APPS_SCRIPT_WEBHOOK_URL 환경변수가 설정되지 않았습니다.';
      console.warn(notificationError);
    }

    return NextResponse.json({
      success: true,
      consultationId: result.insertedId,
      message: '상담 신청이 접수되었습니다. 담당자 배정 후 연락드리겠습니다.',
      notificationsForwarded,
      notificationError: notificationsForwarded ? undefined : notificationError
    });
  } catch (error) {
    console.error('Failed to create consultation:', error);
    return NextResponse.json(
      { error: '상담 신청 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}