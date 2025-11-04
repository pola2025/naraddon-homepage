/**
 * Upstash Redis Keepalive 스크립트
 *
 * @purpose 무료 티어 Redis 데이터베이스 비활성 방지
 * @context GitHub Actions에서 주기적으로 실행
 * @interval 6시간마다 PING 요청 전송
 * @security 환경변수만 사용, 토큰 하드코딩 금지
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const REDIS_URL = process.env.REDIS_URL;
const REDIS_TOKEN = process.env.REDIS_TOKEN;

/**
 * Redis 서버에 PING 요청 전송
 * @returns {Promise<void>}
 */
async function pingRedis() {
  // 환경변수 검증
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('❌ [Redis Keepalive] REDIS_URL 또는 REDIS_TOKEN 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  try {
    console.log('🔄 [Redis Keepalive] Upstash Redis에 연결 중...');
    console.log(`📍 [Redis Keepalive] URL: ${REDIS_URL}`);

    // Upstash REST API로 PING 요청
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['PING']),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ [Redis Keepalive] PING 성공:', result);
    console.log(`⏰ [Redis Keepalive] 실행 시각: ${new Date().toISOString()}`);

    // 추가 정보: 간단한 SET/GET 테스트
    await testSetGet();

  } catch (error) {
    console.error('❌ [Redis Keepalive] PING 실패:', error.message);
    process.exit(1);
  }
}

/**
 * SET/GET 테스트로 실제 동작 확인
 * @returns {Promise<void>}
 */
async function testSetGet() {
  try {
    const key = 'keepalive:last_ping';
    const value = new Date().toISOString();

    // SET 요청
    const setResponse = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', key, value, 'EX', '86400']), // 24시간 TTL
    });

    if (!setResponse.ok) {
      throw new Error('SET 실패');
    }

    console.log(`📝 [Redis Keepalive] SET ${key} = ${value}`);

    // GET 요청
    const getResponse = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
    });

    const getResult = await getResponse.json();
    console.log(`📖 [Redis Keepalive] GET ${key} = ${getResult.result}`);

  } catch (error) {
    console.warn('⚠️ [Redis Keepalive] SET/GET 테스트 실패:', error.message);
  }
}

// 실행
pingRedis();
