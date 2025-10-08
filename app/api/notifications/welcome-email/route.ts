import { NextRequest, NextResponse } from 'next/server';

/**
 * 신규 회원 환영 이메일 발송 API
 *
 * POST /api/notifications/welcome-email
 * Body: { name: string, email: string, provider: string }
 */

interface WelcomeEmailRequest {
  name?: string;
  email: string;
  provider: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WelcomeEmailRequest = await request.json();
    const { name, email, provider } = body;

    console.log('📧 Welcome email request:', { name, email, provider });

    // Google Apps Script 웹훅 URL
    const webhookUrl = process.env.WELCOME_EMAIL_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('⚠️  WELCOME_EMAIL_WEBHOOK_URL not configured - email not sent');
      return NextResponse.json({
        success: false,
        error: 'Welcome email webhook not configured',
        skipped: true
      });
    }

    // 환영 이메일 페이로드
    const webhookPayload = {
      type: 'welcome_email',
      recipient: {
        name: name || '회원',
        email: email
      },
      data: {
        provider: provider,
        registeredAt: new Date().toISOString(),
        websiteUrl: process.env.NEXTAUTH_URL || 'https://naraddon.com',
        loginUrl: `${process.env.NEXTAUTH_URL || 'https://naraddon.com'}/auth/signin`,
        myPageUrl: `${process.env.NEXTAUTH_URL || 'https://naraddon.com'}/mypage`
      },
      emailContent: {
        subject: '[나라똔] 회원가입을 환영합니다! 🎉',
        // HTML 템플릿은 Google Apps Script에서 처리
        template: 'welcome',
        variables: {
          userName: name || '회원',
          provider: getProviderName(provider),
          year: new Date().getFullYear()
        }
      }
    };

    // Google Apps Script 웹훅 호출
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Welcome email webhook failed:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to send welcome email',
        details: errorText
      }, { status: 500 });
    }

    const result = await response.json();
    console.log('✅ Welcome email sent successfully to:', email);

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent',
      recipient: email,
      result
    });

  } catch (error: any) {
    console.error('❌ Welcome email error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Provider 이름 한글 변환
function getProviderName(provider: string): string {
  const providerNames: Record<string, string> = {
    'naver': '네이버',
    'kakao': '카카오',
    'google': '구글'
  };
  return providerNames[provider] || provider;
}

// GET 요청: 상태 확인용
export async function GET() {
  const configured = !!process.env.WELCOME_EMAIL_WEBHOOK_URL;

  return NextResponse.json({
    configured,
    webhookUrl: configured ? '설정됨' : '미설정 - 환영 이메일이 발송되지 않습니다',
    status: configured ? 'ready' : 'not_configured'
  });
}
