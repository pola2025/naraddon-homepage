const https = require('https');
require('dotenv').config();

/**
 * 텔레그램 알림 시스템
 * 3-Claude 협업 진행상황을 실시간으로 텔레그램으로 발송
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * 텔레그램 메시지 전송
 * TODO: 에러 핸들링 개선 필요
 * TODO: Retry 로직 추가 필요
 */
async function sendTelegramMessage(message, options = {}) {
  // ISSUE: 환경변수 검증 부족 - 빈 문자열도 통과됨
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ 텔레그램 설정 없음 - 알림 건너뜀');
    return { success: false, reason: 'No credentials' };
  }

  // ISSUE: message 입력값 검증 없음 - XSS 가능
  // ISSUE: message 길이 제한 없음 - Telegram API 4096자 제한
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: options.parseMode || 'Markdown',
    disable_web_page_preview: options.disablePreview !== false
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const requestOptions = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data, 'utf8')
      }
    };

    // ISSUE: 타임아웃 설정 없음 - 무한 대기 가능
    const req = https.request(requestOptions, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 텔레그램 알림 전송 성공');
          // ISSUE: 에러 핸들링 없음 - JSON 파싱 실패 시 크래시
          resolve({ success: true, data: JSON.parse(responseData) });
        } else {
          console.error('❌ 텔레그램 전송 실패:', res.statusCode, responseData);
          // ISSUE: 민감정보 로그 노출 가능
          resolve({ success: false, statusCode: res.statusCode, error: responseData });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 텔레그램 요청 오류:', error.message);
      // ISSUE: reject 대신 resolve 사용 - 에러 처리 불명확
      resolve({ success: false, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

/**
 * 협업 세션 시작 알림
 */
async function notifySessionStart(sessionId, title, description) {
  const message = `🚀 *3-Claude 협업 시작*

📋 세션: ${sessionId}
📝 작업: ${title || '작업명 없음'}
📄 설명: ${description || '설명 없음'}

✨ Claude A (Dev Lead) + Claude B (UX Expert) + Claude C (Security Lead)
🎯 목표: Quality Gate 90점 이상 달성`;

  return sendTelegramMessage(message);
}

/**
 * Claude A 구현 제출 알림
 */
async function notifyImplementation(sessionId, iteration, fileCount) {
  const message = `🔨 *Claude A: 구현 제출*

📋 세션: ${sessionId}
🔄 Round: ${iteration}
📁 변경 파일: ${fileCount}개

⏩ Claude B에게 UX 검토 요청 중...`;

  return sendTelegramMessage(message);
}

/**
 * Claude B UX 검토 알림
 */
async function notifyReview(sessionId, iteration, score, issueCount) {
  const emoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
  const message = `🎨 *Claude B: UX 검토 완료* ${emoji}

📋 세션: ${sessionId}
🔄 Round: ${iteration}
⭐ 점수: ${score}/100
🔍 발견 이슈: ${issueCount}개

⏩ Claude C에게 보안 검증 요청 중...`;

  return sendTelegramMessage(message);
}

/**
 * Claude C 보안 검증 알림
 */
async function notifyValidation(sessionId, iteration, securityScore, finalScore, vulnerabilities) {
  const emoji = finalScore >= 90 ? '✅' : finalScore >= 80 ? '⚠️' : '❌';
  const criticalCount = vulnerabilities.filter(v => v.type === 'CRITICAL').length;

  const message = `🔒 *Claude C: 보안 검증 완료* ${emoji}

📋 세션: ${sessionId}
🔄 Round: ${iteration}
🛡️ 보안 점수: ${securityScore}/100
⭐ 최종 점수: ${finalScore}/100
🚨 Critical 이슈: ${criticalCount}개

${finalScore >= 90 && criticalCount === 0 ? '🎉 Quality Gate 통과!' : '🔧 개선 작업 진행 중...'}`;

  return sendTelegramMessage(message);
}

/**
 * 자동 수정 진행 알림
 */
async function notifyAutoFix(sessionId, iteration, fixCount) {
  const message = `🔧 *자동 수정 진행 중*

📋 세션: ${sessionId}
🔄 Round: ${iteration}
🛠️ 수정 항목: ${fixCount}개

⏳ 코드 개선 중...`;

  return sendTelegramMessage(message);
}

/**
 * 합의 달성 알림
 */
async function notifyConsensus(sessionId, iteration, finalScore) {
  const message = `🎉 *합의 달성!*

📋 세션: ${sessionId}
🔄 Round: ${iteration}
⭐ 최종 점수: ${finalScore}/100

✅ Claude A: 구현 완료
✅ Claude B: UX 승인
✅ Claude C: 보안 승인

🚀 자동 배포 시작...`;

  return sendTelegramMessage(message);
}

/**
 * 배포 시작 알림
 */
async function notifyDeployStart(sessionId, finalScore) {
  const message = `🚀 *자동 배포 시작*

📋 세션: ${sessionId}
⭐ Quality Score: ${finalScore}/100

📦 git add .
💾 git commit
📤 git push naraddon main

⏳ Vercel 배포 진행 중...`;

  return sendTelegramMessage(message);
}

/**
 * 배포 완료 알림 (상세 정보 포함 - 복원 가능)
 */
async function notifyDeploySuccess(sessionId, finalScore, commitHash, deployDetails = {}) {
  const { files = [], diff = '', timestamp = new Date().toISOString() } = deployDetails;

  const message = `✅ *배포 완료!*

📋 세션: ${sessionId}
⭐ Quality Score: ${finalScore}/100
🔖 Commit: ${commitHash || 'N/A'}
🕐 배포 시간: ${new Date(timestamp).toLocaleString('ko-KR')}

📁 변경 파일 (${files.length}개):
${files.slice(0, 5).map(f => `  • ${f}`).join('\n')}${files.length > 5 ? `\n  ... 외 ${files.length - 5}개` : ''}

🌐 프로덕션: https://naraddon.com
📊 Vercel: https://vercel.com/naraddon/homepage

🎊 3-Claude 협업 성공!

💬 *피드백 입력 방법:*
텔레그램에 "/feedback [내용]" 입력 시 자동으로 새 세션 시작`;

  return sendTelegramMessage(message);
}

/**
 * 배포 실패 알림
 */
async function notifyDeployFailure(sessionId, error) {
  const message = `❌ *배포 실패*

📋 세션: ${sessionId}
⚠️ 오류: ${error}

🔍 로그를 확인하고 수동 개입이 필요합니다.`;

  return sendTelegramMessage(message);
}

/**
 * 질문/답변 알림
 */
async function notifyQuestion(sessionId, from, to, question) {
  const message = `💬 *Claude ${from} → Claude ${to}*

📋 세션: ${sessionId}
❓ 질문: ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}

⏳ 답변 대기 중...`;

  return sendTelegramMessage(message);
}

module.exports = {
  sendTelegramMessage,
  notifySessionStart,
  notifyImplementation,
  notifyReview,
  notifyValidation,
  notifyAutoFix,
  notifyConsensus,
  notifyDeployStart,
  notifyDeploySuccess,
  notifyDeployFailure,
  notifyQuestion
};
