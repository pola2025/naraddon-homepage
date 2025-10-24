#!/usr/bin/env node

/**
 * Git Hooks 자동 설치
 * @purpose Notion 자동 로깅을 위한 Git Hook 설치
 */

const fs = require('fs');
const path = require('path');

const HOOKS_DIR = '.git/hooks';

// Post-commit hook (커밋 후 자동 로그)
const POST_COMMIT_HOOK = `#!/bin/sh
# Notion 자동 로그 - 커밋 후 실행

# 커밋 메시지 가져오기
COMMIT_MSG=$(git log -1 --pretty=%B)

# 프로젝트명 자동 감지
PROJECT="나라똔"

# 변경된 파일 목록
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

# Notion에 로그 추가 (백그라운드 실행)
node scripts/notion-daily-log.js git "$PROJECT" "$COMMIT_MSG" &

# 에러 무시 (Notion 로그 실패해도 커밋은 성공)
exit 0
`;

// Pre-push hook (푸시 전 Obsidian 동기화)
const PRE_PUSH_HOOK = `#!/bin/sh
# Obsidian → Notion 동기화 - 푸시 전 실행

echo "🔄 Obsidian 작업 내역을 Notion에 동기화 중..."

# 오늘 날짜
TODAY=$(date +%Y-%m-%d)

# 동기화 실행 (백그라운드)
node scripts/sync-obsidian-to-notion.js "$TODAY" &

exit 0
`;

/**
 * Hook 설치
 */
function installHook(hookName, content) {
  const hookPath = path.join(HOOKS_DIR, hookName);

  try {
    // 기존 Hook 백업
    if (fs.existsSync(hookPath)) {
      const backupPath = `${hookPath}.backup`;
      fs.copyFileSync(hookPath, backupPath);
      console.log(`  📦 기존 Hook 백업: ${backupPath}`);
    }

    // Hook 파일 작성
    fs.writeFileSync(hookPath, content, { mode: 0o755 });

    console.log(`  ✅ ${hookName} 설치 완료`);
    return true;
  } catch (error) {
    console.error(`  ❌ ${hookName} 설치 실패: ${error.message}`);
    return false;
  }
}

/**
 * 메인 실행
 */
function main() {
  console.log('🔧 Git Hooks 설치 시작\n');

  // .git/hooks 디렉토리 확인
  if (!fs.existsSync(HOOKS_DIR)) {
    console.error('❌ .git/hooks 디렉토리가 없습니다.');
    console.log('💡 이 스크립트는 Git 저장소 루트에서 실행해야 합니다.');
    process.exit(1);
  }

  const hooks = [
    { name: 'post-commit', content: POST_COMMIT_HOOK },
    { name: 'pre-push', content: PRE_PUSH_HOOK }
  ];

  let successCount = 0;

  hooks.forEach(hook => {
    console.log(`\n설치 중: ${hook.name}`);
    if (installHook(hook.name, hook.content)) {
      successCount++;
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`✅ ${successCount}/${hooks.length}개 Hook 설치 완료`);
  console.log('='.repeat(50));

  console.log('\n📋 설치된 Hooks:');
  console.log('  - post-commit: 커밋 후 자동으로 Notion에 로그 추가');
  console.log('  - pre-push: 푸시 전 Obsidian 내역을 Notion에 동기화');

  console.log('\n⚙️ 동작 방식:');
  console.log('  1. git commit 실행 → Notion에 커밋 메시지 자동 기록');
  console.log('  2. git push 실행 → Obsidian 작업 내역 Notion 동기화');

  console.log('\n⚠️ 주의사항:');
  console.log('  - NOTION_API_KEY와 NOTION_DAILY_LOG_DB 환경변수 필요');
  console.log('  - .env.local 파일에 설정 필수');
  console.log('  - 로그 실패해도 Git 작업은 정상 진행됨');

  console.log('\n🔧 설정 확인:');
  console.log('  cat .env.local | grep NOTION');
}

main();
