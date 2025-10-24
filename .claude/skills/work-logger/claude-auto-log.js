#!/usr/bin/env node

/**
 * Claude 작업 자동 기록
 * @purpose Claude가 작업 완료 시 호출 → Obsidian + Notion 자동 기록
 */

const fs = require('fs');
const path = require('path');
const { logWork } = require('./auto-logger');

/**
 * Claude 작업 자동 기록
 * @param {Object} work
 * @param {string} work.project - 나라똔/디자인/Claude
 * @param {string} work.type - feat/fix/docs/style/refactor/test
 * @param {string} work.scope - 컴포넌트/기능명
 * @param {string} work.message - 작업 내용 한 줄 요약
 * @param {string} work.description - 상세 설명
 * @param {Array} work.files - 변경된 파일 목록
 */
async function autoLog(work) {
  console.log('\n🤖 Claude 작업 자동 기록 시작...\n');

  try {
    // 1. Obsidian 문서 생성
    const obsidianPath = await createObsidianDoc(work);
    console.log(`📄 Obsidian: ${obsidianPath}`);

    // 2. Notion 타임라인 추가
    const result = await logWork(work);
    console.log(`📝 Notion: ${result.success ? '✅ 성공' : '❌ 실패'}`);

    console.log('\n✅ 작업 기록 완료!\n');

    return {
      success: true,
      obsidianPath,
      notionPageId: result.notionPageId
    };

  } catch (error) {
    console.error('❌ 자동 기록 실패:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obsidian 문서 생성
 */
async function createObsidianDoc(work) {
  const obsidianBasePath = 'F:/obsidian/Pola/Projects';

  // 프로젝트 폴더 매핑
  const projectMap = {
    '나라똔': '나라똔',
    '디자인': '디자인',
    'Claude': 'Claude',
    'BAS홈페이지': 'BAS홈페이지',
    '솔트': 'BAS홈페이지',
    '인스파트너스': 'BAS홈페이지'
  };

  const projectFolder = projectMap[work.project];
  if (!projectFolder) {
    throw new Error(`알 수 없는 프로젝트: ${work.project}`);
  }

  // 타입별 폴더
  const typeMap = {
    'fix': '02-트러블슈팅',
    'test': '03-검토기록',
    'default': '01-변경기록'
  };
  const typeFolder = typeMap[work.type] || typeMap.default;

  // 파일명: YYYY-MM-DD-scope.md
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${date}-${work.scope}.md`;

  const fullPath = path.join(obsidianBasePath, projectFolder, typeFolder, fileName);

  // 폴더 생성 (없으면)
  const dirPath = path.dirname(fullPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // 문서 템플릿 - 모든 상세 내용 포함
  const template = `---
날짜: ${date}
프로젝트: ${work.project}
타입: ${work.type}
범위: ${work.scope}
---

# ${work.message}

## 📋 작업 개요
${work.description || ''}

## 🔧 작업 상세

### 구현 내용
${work.implementation || '구현한 기능과 방법을 상세히 작성'}

### 기술적 결정사항
${work.technicalDecisions || '주요 기술적 결정과 그 이유'}

### 고려사항
${work.considerations || '작업하면서 고려한 사항들'}

## 📝 변경된 파일
${work.files && work.files.length > 0
  ? work.files.map(f => `- \`${f}\``).join('\n')
  : '- 변경된 파일 없음'}

## 🐛 트러블슈팅
${work.troubleshooting || '발생한 문제와 해결 방법 (없으면 "없음")'}

## ✅ 테스트
${work.testing || '테스트 방법 및 결과'}

## 📚 참고 자료
${work.references || '참고한 문서, 링크 등'}

## 💡 배운 점 / 개선 방향
${work.lessons || '이번 작업을 통해 배운 점이나 향후 개선할 부분'}

---
*🤖 자동 생성: ${new Date().toLocaleString('ko-KR')}*
*Notion: [일일 업무일지](https://notion.so/${process.env.NOTION_DAILY_LOG_DB || ''})*
`;

  // 파일 작성
  fs.writeFileSync(fullPath, template, 'utf-8');

  return fullPath;
}

// CLI 테스트
if (require.main === module) {
  // 테스트 데이터
  const testWork = {
    project: '나라똔',
    type: 'feat',
    scope: 'NotionSync',
    message: 'Obsidian-Notion 자동 동기화 구현',
    description: `
- Obsidian 파일 저장 시 자동으로 Notion에 기록
- Git Hook 통합
- Claude 자동 기록 기능
`,
    files: [
      '.claude/skills/work-logger/claude-auto-log.js',
      '.claude/skills/work-logger/obsidian-watcher.js'
    ]
  };

  autoLog(testWork);
}

module.exports = { autoLog, createObsidianDoc };
