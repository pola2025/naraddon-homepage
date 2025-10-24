#!/usr/bin/env node

const { autoLog } = require('../.claude/skills/work-logger/claude-auto-log');

(async () => {
  await autoLog({
    project: 'Claude',
    type: 'docs',
    scope: 'WorkLogger',
    message: 'CLAUDE.md에 Work Logger 기본 설정 추가',
    description: `
- 모든 작업 완료 시 자동 기록 규칙 추가
- autoLog 함수 사용법 문서화
- Obsidian + Notion 연동 흐름 설명
- 환경변수 업데이트
`,
    files: ['CLAUDE.md', '.claude/skills/work-logger/']
  });
})();
