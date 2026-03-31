import { NextRequest, NextResponse } from 'next/server';

/**
 * 신규 회원 가입 이메일 알림 API
 *
 * POST /api/notifications/new-user
 * Body: { name: string, email: string, provider: string, registeredAt: string }
 */

interface NewUserNotificationRequest {
  name?: string;
  email: string;
  provider: string;
  registeredAt: string;
}

export async function POST(request: NextRequest) {
  // 내부 API 키 검증
  const apiKey = request.headers.get('x-api-key');
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey || apiKey !== internalKey) {
    console.warn('[나라똔:신규회원알림] 인증 실패 — 유효하지 않은 API 키');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: NewUserNotificationRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }
    const { name, email, provider, registeredAt } = body;

    // 관리자 이메일 목록
    const adminEmails = process.env.CONSULTATION_NOTIFICATION_EMAILS?.split(',') || [
      'jjk_naraddon@naver.com',
    ];

    console.log('📧 New user email notification:', {
      user: { name, email, provider },
      notifyTo: adminEmails,
      registeredAt,
    });

    // TODO: 실제 이메일 발송 구현
    // 현재는 로깅만 수행하고, 나중에 이메일 서비스 (SendGrid, SES 등) 연동

    // Google Apps Script 웹훅 사용 (상담 신청과 유사한 방식)
    const webhookUrl = process.env.NEW_USER_NOTIFICATION_WEBHOOK_URL;

    if (webhookUrl) {
      const webhookPayload = {
        type: 'new_user_registration',
        user: {
          name: name || '미제공',
          email,
          provider,
          registeredAt,
        },
        notification: {
          emails: adminEmails,
          subject: '[나라똔] 신규 회원 가입 알림',
          message: `
신규 회원이 가입했습니다.

👤 이름: ${name || '미제공'}
📧 이메일: ${email}
🔑 가입 경로: ${provider}
⏰ 가입 시각: ${new Date(registeredAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

관리자 페이지에서 회원 정보를 확인하세요.
${process.env.NEXTAUTH_URL}/admin/users
          `.trim(),
        },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      console.log('✅ Email webhook notification sent');
    } else {
      console.log('⚠️  Email webhook not configured - notification logged only');
    }

    return NextResponse.json({
      success: true,
      message: 'New user notification processed',
      notifiedEmails: adminEmails,
    });
  } catch (error: any) {
    console.error('[나라똔:신규회원알림] 실패:', error);

    return NextResponse.json(
      { success: false, error: '알림 처리에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// GET 요청: 상태 확인용
export async function GET() {
  const webhookConfigured = !!process.env.NEW_USER_NOTIFICATION_WEBHOOK_URL;
  const adminEmails = process.env.CONSULTATION_NOTIFICATION_EMAILS?.split(',') || [
    'jjk_naraddon@naver.com',
  ];

  return NextResponse.json({
    configured: webhookConfigured,
    webhookUrl: webhookConfigured ? '설정됨' : '미설정',
    adminEmails,
    status: 'ready',
  });
}
