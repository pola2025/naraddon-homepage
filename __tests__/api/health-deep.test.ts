/**
 * @jest-environment node
 */

/**
 * 정밀 상태 확인 API(/api/health/deep) 테스트
 *
 * @purpose 맥미니 점검 도구가 5분마다 "서버가 실제로 실행되고 DB에 연결되는지"를 확인하는 주소를 검증한다
 * @context 기존 /api/health 는 빌드 때 고정된 정적 응답이라 서버·DB 장애를 잡지 못한다(2026-11-13 확인)
 * @decision 토큰 없는 요청은 DB에 가지 않고 401로 끝낸다(봇이 두드려도 DB 부하 없음).
 *           응답에는 상태 두 칸만 담고 내부 정보·오류 문구는 담지 않는다.
 */
import { NextRequest } from 'next/server';

const mockConnectDB = jest.fn();
const mockCommand = jest.fn();

// DB 연결 모듈이 lib/ 와 src/lib/ 양쪽에 있고, 테스트 환경과 빌드가 서로 다른 쪽을 불러오므로 둘 다 대체한다
jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockConnectDB(...args),
}));
jest.mock('../../src/lib/mongodb', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockConnectDB(...args),
}));

import * as route from '../../app/api/health/deep/route';

const TOKEN = 'test-health-token-0123456789abcdef';

const requestWith = (authorization?: string) =>
  new NextRequest('https://naraddon.com/api/health/deep', {
    headers: authorization ? { authorization } : {},
  });

const connectedDB = () => ({
  connection: { db: { command: (...args: unknown[]) => mockCommand(...args) } },
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.HEALTH_CHECK_TOKEN = TOKEN;
  mockConnectDB.mockResolvedValue(connectedDB());
  mockCommand.mockResolvedValue({ ok: 1 });
});

afterAll(() => {
  delete process.env.HEALTH_CHECK_TOKEN;
});

describe('GET /api/health/deep', () => {
  it('always runs on the server and is never cached', async () => {
    // Given / When
    const response = await route.GET(requestWith(`Bearer ${TOKEN}`));

    // Then
    expect(route.dynamic).toBe('force-dynamic');
    expect(route.runtime).toBe('nodejs');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('reports ok after a real database ping', async () => {
    // When
    const response = await route.GET(requestWith(`Bearer ${TOKEN}`));

    // Then
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', db: 'ok' });
    expect(mockConnectDB).toHaveBeenCalledTimes(1);
    expect(mockCommand).toHaveBeenCalledWith({ ping: 1 });
  });

  it.each([
    ['no header', undefined],
    ['wrong token', 'Bearer wrong-token'],
    ['token without Bearer', TOKEN],
  ])('rejects requests with %s before touching the database', async (_label, header) => {
    // When
    const response = await route.GET(requestWith(header));

    // Then
    expect(response.status).toBe(401);
    expect(mockConnectDB).not.toHaveBeenCalled();
  });

  it('fails closed with 500 when the token is not configured', async () => {
    // Given
    delete process.env.HEALTH_CHECK_TOKEN;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When
    const response = await route.GET(requestWith(`Bearer ${TOKEN}`));

    // Then
    expect(response.status).toBe(500);
    expect(mockConnectDB).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('returns 503 without internal details when the database connection fails', async () => {
    // Given
    mockConnectDB.mockRejectedValue(new Error('querySrv ENOTFOUND secret-cluster.mongodb.net'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When
    const response = await route.GET(requestWith(`Bearer ${TOKEN}`));
    const text = await response.text();

    // Then
    expect(response.status).toBe(503);
    expect(JSON.parse(text)).toEqual({ status: 'error', db: 'error' });
    expect(text).not.toContain('mongodb.net');
    expect(response.headers.get('cache-control')).toContain('no-store');
    errorSpy.mockRestore();
  });

  it('returns 503 when the ping fails', async () => {
    // Given
    mockCommand.mockRejectedValue(new Error('not authorized'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When
    const response = await route.GET(requestWith(`Bearer ${TOKEN}`));

    // Then
    expect(response.status).toBe(503);
    errorSpy.mockRestore();
  });

  it('returns 503 when the database does not answer within the time limit', async () => {
    // Given
    jest.useFakeTimers();
    mockCommand.mockReturnValue(new Promise(() => {}));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      // When
      const pending = route.GET(requestWith(`Bearer ${TOKEN}`));
      await jest.advanceTimersByTimeAsync(3_000);
      const response = await pending;

      // Then
      expect(response.status).toBe(503);
    } finally {
      jest.useRealTimers();
      errorSpy.mockRestore();
    }
  });
});
