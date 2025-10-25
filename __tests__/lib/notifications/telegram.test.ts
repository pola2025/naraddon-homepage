/**
 * 텔레그램 알림 유틸리티 테스트
 *
 * @purpose 텔레그램 알림 전송 기능 검증
 * @context TDD - RED 단계: 실패하는 테스트 먼저 작성
 */

import { sendTelegramNotification } from '@/lib/notifications/telegram';

// Fetch 모킹
global.fetch = jest.fn();

describe('sendTelegramNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 환경변수 모킹
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
    process.env.TELEGRAM_CHAT_ID = 'test-chat-id';
  });

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it('신규 회원 가입 알림을 전송해야 함', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { message_id: 123 } }),
    });

    // Act
    const result = await sendTelegramNotification({
      type: 'new_user',
      data: {
        email: 'test@example.com',
        name: '테스트 사용자',
      },
    });

    // Assert
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-bot-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('심사관 글 작성 알림을 전송해야 함 - 또똔', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { message_id: 124 } }),
    });

    // Act
    const result = await sendTelegramNotification({
      type: 'examiner_post',
      data: {
        postType: 'ttontok',
        authorEmail: 'examiner@example.com',
        authorName: '심사관1',
        title: '새로운 또똔 글',
      },
    });

    // Assert
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('심사관 글 작성 알림을 전송해야 함 - 똔톡', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { message_id: 125 } }),
    });

    // Act
    const result = await sendTelegramNotification({
      type: 'examiner_post',
      data: {
        postType: 'ddontalk',
        authorEmail: 'examiner@example.com',
        authorName: '심사관1',
        title: '새로운 똔톡 글',
      },
    });

    // Assert
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('심사관 글 작성 알림을 전송해야 함 - 정책소식', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: { message_id: 126 } }),
    });

    // Act
    const result = await sendTelegramNotification({
      type: 'examiner_post',
      data: {
        postType: 'policy-news',
        authorEmail: 'examiner@example.com',
        authorName: '심사관1',
        title: '새로운 정책소식',
      },
    });

    // Assert
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('환경변수가 없으면 실패하고 스킵 플래그를 반환해야 함', async () => {
    // Arrange
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    // Act
    const result = await sendTelegramNotification({
      type: 'new_user',
      data: { email: 'test@example.com', name: '테스트' },
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Telegram API 오류 시 에러를 반환해야 함', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ description: 'Invalid chat_id' }),
    });

    // Act
    const result = await sendTelegramNotification({
      type: 'new_user',
      data: { email: 'test@example.com', name: '테스트' },
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid chat_id');
  });

  it('네트워크 오류 시 에러를 반환해야 함', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // Act
    const result = await sendTelegramNotification({
      type: 'new_user',
      data: { email: 'test@example.com', name: '테스트' },
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });
});
