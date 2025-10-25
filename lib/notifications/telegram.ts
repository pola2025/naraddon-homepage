/**
 * 텔레그램 알림 유틸리티
 *
 * @purpose 텔레그램 봇을 통한 알림 전송 기능 제공
 * @context 신규 회원 가입, 심사관 활동 등 중요 이벤트 발생 시 관리자에게 알림
 * @decision 기존 /api/telegram-notify API를 활용하되, 서버 사이드에서 직접 호출
 */

interface NewUserData {
  email: string;
  name: string;
}

interface ExaminerPostData {
  postType: 'ttontok' | 'ddontalk' | 'policy-news';
  authorEmail: string;
  authorName: string;
  title: string;
}

type NotificationData =
  | { type: 'new_user'; data: NewUserData }
  | { type: 'examiner_post'; data: ExaminerPostData };

interface NotificationResult {
  success: boolean;
  messageId?: number;
  skipped?: boolean;
  error?: string;
}

/**
 * 텔레그램 알림 전송
 *
 * @purpose 주요 이벤트 발생 시 텔레그램으로 알림 메시지 전송
 * @param notification 알림 타입과 데이터
 * @returns 전송 결과 (성공/실패/스킵)
 *
 * @example
 * // 신규 회원 가입 알림
 * await sendTelegramNotification({
 *   type: 'new_user',
 *   data: { email: 'user@example.com', name: '홍길동' }
 * });
 *
 * @example
 * // 심사관 글 작성 알림
 * await sendTelegramNotification({
 *   type: 'examiner_post',
 *   data: {
 *     postType: 'ttontok',
 *     authorEmail: 'examiner@example.com',
 *     authorName: '심사관',
 *     title: '새로운 글 제목'
 *   }
 * });
 */
export async function sendTelegramNotification(
  notification: NotificationData
): Promise<NotificationResult> {
  try {
    // 환경변수 확인
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn('⚠️  Telegram 설정 없음 - 메시지 전송 스킵');
      return {
        success: false,
        skipped: true,
        error: 'TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 미설정',
      };
    }

    // 알림 메시지 생성
    const message = formatNotificationMessage(notification);

    // Telegram API 호출
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API 오류: ${error.description || response.statusText}`);
    }

    const result = await response.json();

    console.log(`✅ Telegram 알림 전송 성공: ${notification.type}`);

    return {
      success: true,
      messageId: result.result.message_id,
    };
  } catch (error: any) {
    console.error('❌ Telegram 알림 실패:', error);

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 알림 메시지 포맷팅
 *
 * @purpose 알림 타입에 따라 적절한 메시지 생성
 * @context Markdown 형식으로 가독성 높은 메시지 작성
 */
function formatNotificationMessage(notification: NotificationData): string {
  const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  switch (notification.type) {
    case 'new_user': {
      const { email, name } = notification.data;
      return `🎉 *신규 회원 가입*

👤 이름: ${name}
📧 이메일: ${email}

⏰ ${timestamp}`;
    }

    case 'examiner_post': {
      const { postType, authorEmail, authorName, title } = notification.data;

      // 게시글 타입별 아이콘 및 이름
      const postTypeInfo = {
        ttontok: { icon: '💬', name: '또똔' },
        ddontalk: { icon: '📝', name: '똔톡' },
        'policy-news': { icon: '📰', name: '정책소식' },
      };

      const { icon, name: typeName } = postTypeInfo[postType];

      return `${icon} *심사관 글 작성 - ${typeName}*

✍️ 작성자: ${authorName} (${authorEmail})
📌 제목: ${title}

⏰ ${timestamp}`;
    }

    default:
      // TypeScript exhaustive check
      const _exhaustiveCheck: never = notification;
      throw new Error(`알 수 없는 알림 타입: ${JSON.stringify(_exhaustiveCheck)}`);
  }
}
