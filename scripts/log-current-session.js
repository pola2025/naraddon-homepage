#!/usr/bin/env node

/**
 * 현재 세션 작업 기록
 */

const { autoLog } = require('../.claude/skills/work-logger/claude-auto-log');

const currentWorks = [
  {
    project: 'Claude',
    type: 'feat',
    scope: 'WorkLogger',
    message: 'Obsidian-Notion 자동 연동 시스템 구축',
    description: `
- Obsidian 파일 저장 시 Notion 자동 기록
- File Watcher 구현
- Git Hook 통합
- Claude 자동 기록 기능
`,
    files: [
      '.claude/skills/work-logger/skill.md',
      '.claude/skills/work-logger/claude-auto-log.js',
      '.claude/skills/work-logger/obsidian-watcher.js',
      '.claude/skills/work-logger/auto-logger.js',
      'scripts/notion-daily-log.js'
    ]
  },
  {
    project: 'Claude',
    type: 'feat',
    scope: 'NotionAPI',
    message: 'Notion 일일 업무일지 시스템 완성',
    description: `
- 데이터베이스 속성 설정 (업무일시, 프로젝트명, 진행내용)
- 페이지 요약 자동 업데이트 기능
- 타임라인 형식 작업 기록
`,
    files: [
      'scripts/notion-daily-log.js',
      'scripts/update-summary.js',
      'scripts/clean-notion-pages.js'
    ]
  },
  {
    project: '디자인',
    type: 'feat',
    scope: 'DesignGuardian',
    message: 'Design Guardian Skill 완성',
    description: `
- AI 스타일 디자인 패턴 감지
- 색상 감지기 (5+ 색상, 무지개 그라디언트)
- 이모지 감지기 (AI 클리셰 이모지)
- Obsidian 디자인 프로젝트 구조 생성
`,
    files: [
      '.claude/skills/design-guardian/',
      'scripts/check-design-patterns.js'
    ]
  }
];

async function logAll() {
  console.log(`📝 ${currentWorks.length}개 작업 기록 시작...\n`);

  for (const work of currentWorks) {
    await autoLog(work);
    console.log('---\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('✅ 모든 작업 기록 완료!');
}

logAll();
