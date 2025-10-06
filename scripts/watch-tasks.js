/**
 * watch-tasks.js
 *
 * Claude B (UI/UX Reviewer)용 - task-from-a.json 모니터링
 * chokidar 기반 파일 감시 + Telegram 알림
 *
 * @author Claude A (PM/Developer)
 * @date 2025-10-06
 */

const chokidar = require('chokidar');
const path = require('path');
const { getFileStatus, FILE_STATUS } = require('../lib/file-lock');

const TASK_FILE = path.resolve('.claude/shared/task-from-a.json');

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
function handleTaskFileChange(filePath) {
  console.log(`\n🔔 파일 변경 감지: ${path.basename(filePath)}`);

  // 500ms 대기 후 상태 확인 (쓰기 완료 보장)
  setTimeout(() => {
    const status = getFileStatus(filePath);

    if (!status) {
      console.log('⚠️  파일이 존재하지 않거나 읽을 수 없습니다.');
      return;
    }

    if (status.status === FILE_STATUS.READY) {
      console.log('\n🔍 ===== 새로운 검토 요청 =====');
      console.log(`📋 작업 ID: ${status.taskId}`);
      console.log(`📤 발신: ${status.from}`);
      console.log(`📥 수신: ${status.to}`);
      console.log(`⏰ 생성: ${status.timestamp}`);
      console.log(`✅ Checksum: ${status.hasChecksum ? '검증됨' : '없음'}`);
      console.log('================================\n');

      const telegramMsg =
        `🔔 *새로운 검토 요청*\n\n` +
        `📋 작업 ID: \`${status.taskId}\`\n` +
        `📤 ${status.from} → 📥 ${status.to}\n` +
        `⏰ ${new Date(status.timestamp).toLocaleString('ko-KR')}\n\n` +
        `👉 \`/check-inbox\` 실행으로 검토 시작`;

      sendTelegramNotification(telegramMsg);

      console.log('👉 Claude B: /check-inbox 실행으로 검토를 시작하세요.\n');

    } else if (status.status === FILE_STATUS.PROCESSING) {
      console.log('⚙️  처리 중: Claude B가 검토를 진행 중입니다...\n');

    } else if (status.status === FILE_STATUS.COMPLETED) {
      console.log('✅ 완료: 검토가 완료되었습니다.\n');
    }
  }, 500);
}

// Chokidar 감시 시작
console.log('👀 task-from-a.json 감시 시작...\n');
console.log(`📁 감시 경로: ${TASK_FILE}\n`);

const watcher = chokidar.watch(TASK_FILE, {
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
    handleTaskFileChange(filePath);
  })
  .on('change', filePath => {
    handleTaskFileChange(filePath);
  })
  .on('error', error => {
    console.error('❌ Watch 오류:', error.message);
  });

console.log('✅ 감시 활성화됨. Ctrl+C로 종료.\n');
