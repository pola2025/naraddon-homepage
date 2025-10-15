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
        webhookSecretExists: !!process.env.CONSULTATION_WEBHOOK_SECRET_AUDITOR,
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