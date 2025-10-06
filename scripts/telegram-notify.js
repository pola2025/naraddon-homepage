#!/usr/bin/env node

/**
 * 텔레그램 알림 스크립트
 *
 * 사용법:
 *   node scripts/telegram-notify.js "메시지 내용"
 *   node scripts/telegram-notify.js --commit "커밋 메시지"
 */

const https = require('https');
const { execSync } = require('child_process');

// 텔레그램 설정
const TELEGRAM_BOT_TOKEN = '7947112373:AAGXL3AO9D8jkWnFkuUmU_VQbNpvOWHZREI';
const TELEGRAM_CHAT_ID = -1002928725647;

/**
 * 텔레그램 메시지 전송
 */
function sendTelegramMessage(message) {
  return new Promise((resolve, reject) => {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    };

    const data = Buffer.from(JSON.stringify(payload), 'utf8');

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 텔레그램 전송 성공');
          resolve(JSON.parse(responseData));
        } else {
          console.error('❌ 텔레그램 전송 실패:', res.statusCode);
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 텔레그램 전송 오류:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Git 커밋 정보 가져오기
 */
function getGitCommitInfo() {
  try {
    const hash = execSync('git log -1 --format=%h').toString().trim();
    const message = execSync('git log -1 --format=%s').toString().trim();
    const author = execSync('git log -1 --format=%an').toString().trim();
    const date = execSync('git log -1 --format=%ad --date=short').toString().trim();

    return { hash, message, author, date };
  } catch (error) {
    return null;
  }
}

/**
 * 커밋 메시지 포맷팅
 */
function formatCommitMessage(commitInfo) {
  if (!commitInfo) {
    return '⚠️ Git 커밋 정보를 가져올 수 없습니다.';
  }

  return `🚀 *나라똔 홈페이지 - 프로젝트 업데이트*\n\n📝 커밋: \`${commitInfo.hash}\`\n💬 메시지: ${commitInfo.message}\n👤 작성자: ${commitInfo.author}\n📅 날짜: ${commitInfo.date}\n\n✅ 작업 완료`;
}

/**
 * 오류 메시지 포맷팅
 */
function formatErrorMessage(errorInfo) {
  return `❌ *나라똔 홈페이지 - 오류 발생*\n\n🔴 오류: ${errorInfo.error}\n📂 파일: ${errorInfo.file || '알 수 없음'}\n📍 위치: ${errorInfo.location || '알 수 없음'}\n\n⚠️ 확인 필요`;
}

/**
 * 일반 메시지 포맷팅
 */
function formatGeneralMessage(text) {
  const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return `📢 *나라똔 홈페이지 - 알림*\n\n${text}\n\n⏰ ${timestamp}`;
}

/**
 * 메인 실행
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('사용법: node telegram-notify.js [옵션] "메시지"');
    console.error('옵션:');
    console.error('  --commit         최신 커밋 정보 전송');
    console.error('  --error          오류 정보 전송');
    console.error('  (옵션 없음)      일반 메시지 전송');
    process.exit(1);
  }

  let message;

  if (args[0] === '--commit') {
    const commitInfo = getGitCommitInfo();
    message = formatCommitMessage(commitInfo);
  } else if (args[0] === '--error') {
    const errorText = args.slice(1).join(' ');
    message = formatErrorMessage({ error: errorText });
  } else {
    const text = args.join(' ');
    message = formatGeneralMessage(text);
  }

  try {
    await sendTelegramMessage(message);
    process.exit(0);
  } catch (error) {
    console.error('전송 실패:', error.message);
    process.exit(1);
  }
}

main();
