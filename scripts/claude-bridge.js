#!/usr/bin/env node
/**
 * Claude Bridge - 두 Claude 인스턴스 간 자동 통신 브릿지
 *
 * 역할:
 * 1. queue.json 변경 감지 → Claude B에게 자동 알림 (VS Code 2 터미널에 출력)
 * 2. review-queue.json 변경 감지 → Claude A에게 자동 알림 (VS Code 1 터미널에 출력)
 * 3. 양방향 메시지 전달
 */

const fs = require('fs');
const chokidar = require('chokidar');
const path = require('path');

const QUEUE_FILE = path.join(__dirname, '../.claude/tasks/queue.json');
const REVIEW_FILE = path.join(__dirname, '../.claude/tasks/review-queue.json');
const CHAT_LOG = path.join(__dirname, '../.claude/tasks/chat-log.md');

// 채팅 로그 초기화
if (!fs.existsSync(CHAT_LOG)) {
  fs.writeFileSync(CHAT_LOG, '# Claude A ↔ Claude B Communication Log\n\n');
}

function logMessage(from, to, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `\n## ${timestamp}\n**${from} → ${to}**\n\n${message}\n\n---\n`;
  fs.appendFileSync(CHAT_LOG, logEntry);
  console.log(`\n📨 [${from} → ${to}] ${message.substring(0, 100)}...\n`);
}

// Claude A → Claude B (작업 요청)
chokidar.watch(QUEUE_FILE).on('change', () => {
  try {
    const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    const pendingTasks = queue.tasks.filter(t => t.status === 'pending_review');

    if (pendingTasks.length > 0) {
      const task = pendingTasks[0];
      const message = `
🔔 **NEW TASK REQUEST**

**Task ID**: ${task.id}
**Title**: ${task.title}
**Files**: ${task.files.join(', ')}
**Description**: ${task.description}

**Action Required (Claude B)**:
1. Review the code in: ${task.files.join(', ')}
2. Analyze bugs, issues, and improvements
3. Make a decision: APPROVE / REJECT / NEEDS_CHANGES
4. Update review-queue.json with your decision

**Commands for Claude B**:
- Read the file and analyze it
- Write decision to .claude/tasks/review-queue.json
`;

      logMessage('Claude A (Main)', 'Claude B (Reviewer)', message);

      // Claude B가 봐야 하는 메시지 파일 생성
      fs.writeFileSync(
        path.join(__dirname, '../.claude/tasks/TO_CLAUDE_B.md'),
        message
      );

      console.log('\n✅ Message sent to Claude B. Waiting for review...\n');
    }
  } catch (error) {
    console.error('❌ Error processing queue:', error.message);
  }
});

// Claude B → Claude A (검토 결과)
chokidar.watch(REVIEW_FILE).on('change', () => {
  try {
    const reviews = JSON.parse(fs.readFileSync(REVIEW_FILE, 'utf8'));
    const pendingReviews = reviews.pendingReviews || [];

    if (pendingReviews.length > 0) {
      const review = pendingReviews[0];
      const message = `
🔔 **REVIEW COMPLETED**

**Task ID**: ${review.taskId}
**Decision**: ${review.status.toUpperCase()}
**Feedback**: ${review.feedback}

${review.suggestions && review.suggestions.length > 0 ?
`**Suggestions**:
${review.suggestions.map(s => `- ${s}`).join('\n')}` : ''}

**Action Required (Claude A)**:
${review.status === 'approved'
  ? '✅ PROCEED with implementation'
  : review.status === 'rejected'
  ? '❌ STOP - Revise the approach'
  : '⚠️ MODIFY - Address the suggestions first'}

**Next Steps**:
${review.status === 'approved'
  ? '1. Ask user for final confirmation\n2. Implement the changes\n3. Commit and deploy'
  : '1. Review the feedback\n2. Revise the approach\n3. Resubmit for review'}
`;

      logMessage('Claude B (Reviewer)', 'Claude A (Main)', message);

      // Claude A가 봐야 하는 메시지 파일 생성
      fs.writeFileSync(
        path.join(__dirname, '../.claude/tasks/TO_CLAUDE_A.md'),
        message
      );

      console.log('\n✅ Review result sent to Claude A.\n');

      // 자동 실행 여부 결정
      if (review.status === 'approved' && review.autoExecute) {
        console.log('\n🚀 AUTO-EXECUTE ENABLED! Claude A will proceed automatically.\n');
      }
    }
  } catch (error) {
    console.error('❌ Error processing review:', error.message);
  }
});

console.log('🌉 Claude Bridge started!');
console.log('📡 Monitoring queue.json and review-queue.json...');
console.log('📝 Chat log: .claude/tasks/chat-log.md');
console.log('💬 Messages will be automatically relayed between Claude A and Claude B\n');
