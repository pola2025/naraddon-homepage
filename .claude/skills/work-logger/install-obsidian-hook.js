#!/usr/bin/env node

/**
 * Obsidian Git Hook 설치
 * @purpose Obsidian vault 커밋 시 자동으로 Notion 업데이트
 */

const fs = require('fs');
const path = require('path');

const OBSIDIAN_VAULT_PATH = 'F:/obsidian/Pola';
const GIT_HOOKS_DIR = path.join(OBSIDIAN_VAULT_PATH, '.git', 'hooks');

// post-commit hook 스크립트
const POST_COMMIT_HOOK = `#!/bin/sh
# Obsidian → Notion 자동 동기화

echo "📝 변경된 파일을 Notion에 기록 중..."

# 마지막 커밋에서 변경된 .md 파일 찾기
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD | grep '\.md$' | grep -E 'Projects/(나라똔|디자인|Claude)/')

if [ -z "$CHANGED_FILES" ]; then
  echo "✅ 프로젝트 관련 변경 없음"
  exit 0
fi

# 각 변경된 파일 처리
echo "$CHANGED_FILES" | while read file; do
  echo "  처리: $file"

  # Work Logger 실행
  node "E:/Naraddon/homepage/.claude/skills/work-logger/sync-from-commit.js" "$OBSIDIAN_VAULT_PATH/$file"
done

echo "✅ Notion 동기화 완료"
`;

function installHook() {
  console.log('🔧 Obsidian Git Hook 설치 중...\n');

  // .git 폴더 확인
  if (!fs.existsSync(GIT_HOOKS_DIR)) {
    console.error('❌ Obsidian vault가 Git 저장소가 아닙니다.');
    console.log('\n💡 해결 방법:');
    console.log('1. Obsidian vault 폴더로 이동:');
    console.log(`   cd "${OBSIDIAN_VAULT_PATH}"`);
    console.log('2. Git 초기화:');
    console.log('   git init');
    console.log('3. 이 스크립트 다시 실행');
    process.exit(1);
  }

  // post-commit hook 파일 경로
  const hookPath = path.join(GIT_HOOKS_DIR, 'post-commit');

  // Hook 파일 작성
  fs.writeFileSync(hookPath, POST_COMMIT_HOOK, 'utf-8');

  // 실행 권한 부여 (Windows에서는 불필요하지만 호환성 위해)
  if (process.platform !== 'win32') {
    fs.chmodSync(hookPath, '755');
  }

  console.log('✅ post-commit hook 설치 완료!');
  console.log(`   위치: ${hookPath}\n`);

  console.log('📝 사용 방법:');
  console.log('1. Obsidian에서 문서 작성');
  console.log('2. Git 커밋:');
  console.log('   cd F:/obsidian/Pola');
  console.log('   git add .');
  console.log('   git commit -m "작업 내용"');
  console.log('3. 자동으로 Notion에 기록됨!\n');

  console.log('💡 Obsidian Git Plugin 사용 시:');
  console.log('   - 자동 커밋 설정하면 저장 시 자동 기록');
}

// 실행
if (require.main === module) {
  installHook();
}

module.exports = { installHook };
