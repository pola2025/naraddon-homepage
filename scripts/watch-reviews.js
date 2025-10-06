/**
 * watch-reviews.js
 *
 * Claude C (Security Validator)용 - review-from-b.json 모니터링
 * chokidar 기반 파일 감시 + Telegram 알림
 *
 * @author Claude A (PM/Developer)
 * @date 2025-10-06
 */

const chokidar = require('chokidar');
const path = require('path');
const { getFileStatus, FILE_STATUS } = require('../lib/file-lock');

const REVIEW_FILE = path.resolve('.claude/shared/review-from-b.json');

// Telegram 알림 (환경변수 기반)
function sendTelegramNotification(message) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn('⚠️  Telegram 환경변수 미설정 - 알림 스킵');
    return;
  }

  try {
    const { execSync } = require('child_process');
    execSync(
      `curl -s -X POST "https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage" ` +
      `-d "chat_id=${process.env.TELEGRAM_CHAT_ID}" ` +
      `-d "text=${encodeURIComponent(message)}" ` +
      `-d "parse_mode=Markdown"`,
      { stdio: 'ignore' }
    );
  } catch (error) {
    console.error('❌ Telegram 전송 실패:', error.message);
  }
}

// 파일 변경 핸들러
function handleReviewFileChange(filePath) {
  console.log(`\n🔔 파일 변경 감지: ${path.basename(filePath)}`);

  // 500ms 대기 후 상태 확인 (쓰기 완료 보장)
  setTimeout(() => {
    const status = getFileStatus(filePath);

    if (!status) {
      console.log('⚠️  파일이 존재하지 않거나 읽을 수 없습니다.');
      return;
    }

    if (status.status === FILE_STATUS.READY) {
      console.log('\n🎨 ===== UI/UX 검토 완료 =====');
      console.log(`📋 검토 ID: ${status.taskId}`);
      console.log(`📤 발신: ${status.from}`);
      console.log(`📥 수신: ${status.to}`);
      console.log(`🔗 원본 작업: ${status.replyTo || 'N/A'}`);
      console.log(`⏰ 생성: ${status.timestamp}`);
      console.log(`✅ Checksum: ${status.hasChecksum ? '검증됨' : '없음'}`);
      console.log('================================\n');

      const telegramMsg =
        `🎨 *UI/UX 검토 완료*\n\n` +
        `📋 검토 ID: \`${status.taskId}\`\n` +
        `📤 ${status.from} → 📥 ${status.to}\n` +
        `⏰ ${new Date(status.timestamp).toLocaleString('ko-KR')}\n\n` +
        `👉 \`/check-review\` 실행으로 보안 검증 시작`;

      sendTelegramNotification(telegramMsg);

      console.log('👉 Claude C: /check-review 실행으로 보안 검증을 시작하세요.\n');

    } else if (status.status === FILE_STATUS.PROCESSING) {
      console.log('⚙️  처리 중: Claude C가 보안 검증을 진행 중입니다...\n');

    } else if (status.status === FILE_STATUS.COMPLETED) {
      console.log('✅ 완료: 보안 검증이 완료되었습니다.\n');
    }
  }, 500);
}

// Chokidar 감시 시작
console.log('👀 review-from-b.json 감시 시작...\n');
console.log(`📁 감시 경로: ${REVIEW_FILE}\n`);

const watcher = chokidar.watch(REVIEW_FILE, {
  persistent: true,
  ignoreInitial: false,  // 초기 파일도 감지
  awaitWriteFinish: {
    stabilityThreshold: 2000,  // 2초 안정성 대기
    pollInterval: 200
  }
});

watcher
  .on('add', filePath => {
    console.log(`✨ 파일 생성됨: ${path.basename(filePath)}`);
    handleReviewFileChange(filePath);
  })
  .on('change', filePath => {
    handleReviewFileChange(filePath);
  })
  .on('error', error => {
    console.error('❌ Watch 오류:', error.message);
  });

console.log('✅ 감시 활성화됨. Ctrl+C로 종료.\n');
