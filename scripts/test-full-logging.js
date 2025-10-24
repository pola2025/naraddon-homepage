#!/usr/bin/env node

const { autoLog } = require('../.claude/skills/work-logger/claude-auto-log');

(async () => {
  await autoLog({
    project: 'Claude',
    type: 'refactor',
    scope: 'WorkLogger',
    message: 'Obsidian 중심 구조로 변경',

    // Obsidian 상세 내용
    description: 'Work Logger를 Obsidian 중심으로 재구성',
    implementation: `
- Obsidian 문서 템플릿을 상세하게 확장
- 모든 작업 내용을 Obsidian에 저장
- Notion은 타임라인 요약만 기록
- 구현 내용, 기술적 결정, 트러블슈팅 등 섹션 추가
    `,
    technicalDecisions: `
- Obsidian을 주 저장소로 선택한 이유:
  - 마크다운 기반으로 검색 용이
  - 로컬 파일로 영구 보관
  - Notion은 타임라인 뷰에 최적화
    `,
    considerations: `
- 너무 많은 정보를 Notion에 넣으면 타임라인이 지저분해짐
- Obsidian에 상세 기록 → Notion은 한 눈에 보는 요약
    `,
    troubleshooting: `
문제: 처음에는 Notion 중심으로 설계
해결: Obsidian을 주로 하고 Notion은 보조로 변경
    `,
    testing: 'test-full-logging.js 스크립트로 검증',
    references: `
- Obsidian 공식 문서
- Notion API 문서
    `,
    lessons: '문서화 시스템은 검색과 열람이 주 목적. Notion의 강점은 타임라인 뷰',

    files: [
      '.claude/skills/work-logger/claude-auto-log.js',
      'CLAUDE.md'
    ]
  });
})();
