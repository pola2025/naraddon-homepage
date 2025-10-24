#!/usr/bin/env node

/**
 * Work Logger - 자동 작업 기록
 * @purpose Claude가 작업 완료 시 자동으로 Obsidian + Notion에 기록
 */

const { addWorkLog, updateDailySummary } = require('../../../scripts/notion-daily-log');
const fs = require('fs');
const path = require('path');

/**
 * 작업 자동 기록
 * @param {Object} work - 작업 정보
 * @param {string} work.project - 프로젝트명 (나라똔, 디자인, Claude)
 * @param {string} work.type - feat/fix/docs/style/refactor/test
 * @param {string} work.scope - 작업 범위 (컴포넌트명 등)
 * @param {string} work.message - 작업 내용
 * @param {Array} work.files - 변경된 파일 목록 (선택)
 * @param {string} work.description - 상세 설명 (선택)
 */
async function logWork(work) {
  console.log(`\n📝 작업 기록 중: [${work.project}] ${work.type}(${work.scope}): ${work.message}\n`);

  try {
    // 1. Notion에 타임라인 추가
    const result = await addWorkLog(
      work.project,
      work.type,
      work.scope,
      work.message,
      {
        files: work.files,
        description: work.description
      }
    );

    // 2. Notion 페이지 요약 업데이트
    if (result && result.pageId) {
      await updateDailySummary(result.pageId);
    }

    // 3. Obsidian 기록 (선택적)
    if (work.obsidianDoc) {
      await createObsidianDoc(work);
    }

    console.log('✅ 작업 기록 완료!\n');

    return {
      success: true,
      notionPageId: result?.pageId,
      time: result?.time
    };

  } catch (error) {
    console.error('❌ 작업 기록 실패:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obsidian 문서 생성
 */
async function createObsidianDoc(work) {
  const obsidianBasePath = 'F:/obsidian/Pola/Projects';

  // 프로젝트 폴더 매핑
  const projectPaths = {
    '나라똔': '나라똔',
    '디자인': '디자인',
    'Claude': 'Claude'
  };

  const projectFolder = projectPaths[work.project];
  if (!projectFolder) {
    console.log(`⚠️  Obsidian 기록 건너뜀: 알 수 없는 프로젝트 "${work.project}"`);
    return;
  }

  // 문서 타입별 폴더
  const typeFolder = work.type === 'fix' ? '02-트러블슈팅' : '01-변경기록';

  const docPath = path.join(
    obsidianBasePath,
    projectFolder,
    typeFolder,
    `${new Date().toISOString().split('T')[0]}-${work.scope}.md`
  );

  // Obsidian 문서 템플릿
  const template = `---
날짜: ${new Date().toISOString().split('T')[0]}
프로젝트: ${work.project}
타입: ${work.type}
범위: ${work.scope}
---

# ${work.message}

## 작업 내용
${work.description || ''}

## 변경된 파일
${work.files ? work.files.map(f => `- \`${f}\``).join('\n') : '없음'}

## 관련 링크
- Notion: [일일 업무일지](https://notion.so)

---
*자동 생성됨 - Work Logger Skill*
`;

  try {
    fs.writeFileSync(docPath, template, 'utf-8');
    console.log(`📄 Obsidian 문서 생성: ${docPath}`);
  } catch (error) {
    console.error(`❌ Obsidian 문서 생성 실패: ${error.message}`);
  }
}

/**
 * 여러 작업 일괄 기록
 */
async function logMultipleWorks(works) {
  console.log(`\n📝 ${works.length}개 작업 일괄 기록 시작...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const work of works) {
    const result = await logWork(work);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // API 요청 간격
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ 완료: ${successCount}개 성공, ${failCount}개 실패\n`);

  return { successCount, failCount };
}

module.exports = {
  logWork,
  logMultipleWorks,
  createObsidianDoc
};

// CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log('사용법: node auto-logger.js <프로젝트> <타입> <범위> <메시지>');
    console.log('예시: node auto-logger.js 나라똔 feat Header "색상 변경"');
    process.exit(1);
  }

  const [project, type, scope, message] = args;

  logWork({
    project,
    type,
    scope,
    message
  });
}
