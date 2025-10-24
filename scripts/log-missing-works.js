#!/usr/bin/env node

/**
 * 누락된 작업 내역 기록
 */

const { autoLog } = require('../.claude/skills/work-logger/claude-auto-log');

const missingWorks = [
  // 1. Obsidian 구조 변경
  {
    project: 'Claude',
    type: 'refactor',
    scope: 'WorkLogger',
    message: 'Obsidian 중심 구조로 변경',
    description: 'Work Logger를 Obsidian 중심으로 재구성 - Obsidian이 주 저장소, Notion은 타임라인 보조',
    implementation: `
- Obsidian 문서 템플릿을 상세하게 확장
  - 작업 개요, 구현 내용, 기술적 결정사항
  - 고려사항, 트러블슈팅, 테스트
  - 참고 자료, 배운 점/개선 방향
- Notion은 한 줄 요약만 기록
- CLAUDE.md에 상세 기록 방법 문서화
`,
    technicalDecisions: `
Obsidian을 주 저장소로 선택한 이유:
- 마크다운 기반으로 검색 및 편집 용이
- 로컬 파일로 영구 보관 가능
- Notion은 데이터베이스 타임라인 뷰에 최적화되어 있어 요약용으로 적합
`,
    considerations: `
- Notion에 너무 많은 정보를 넣으면 타임라인이 복잡해짐
- Obsidian에 상세 기록하고 Notion은 일별 요약만
- 검색은 Obsidian, 타임라인 확인은 Notion
`,
    troubleshooting: `
문제: 처음에는 Notion 중심으로 설계했으나 타임라인이 지저분해짐
해결: Obsidian을 주 저장소로 변경하고 Notion은 요약만
`,
    testing: 'test-full-logging.js로 상세 템플릿 검증 완료',
    references: `
- Obsidian 공식 문서
- Notion API 문서
`,
    lessons: '문서화 시스템은 용도에 맞게 분리하는 것이 중요. 상세 기록과 타임라인 뷰는 별도 도구가 적합',
    files: [
      '.claude/skills/work-logger/claude-auto-log.js',
      'CLAUDE.md'
    ]
  },

  // 2. BAS 홈페이지 프로젝트 추가
  {
    project: 'Claude',
    type: 'feat',
    scope: 'ProjectConfig',
    message: 'BAS홈페이지 프로젝트 추가 (솔트, 인스파트너스)',
    description: 'Obsidian 설정에 BAS홈페이지 프로젝트 추가',
    implementation: `
- obsidian-config.json에 bas_homepage 프로젝트 추가
- claude-auto-log.js에 프로젝트 매핑 추가
  - '솔트' → 'BAS홈페이지'
  - '인스파트너스' → 'BAS홈페이지'
  - 'BAS홈페이지' → 'BAS홈페이지'
`,
    technicalDecisions: `
솔트와 인스파트너스를 하나의 프로젝트로 통합:
- 같은 bas_homepage 저장소 사용
- Obsidian에서 하나의 프로젝트 폴더로 관리
- Notion에서는 프로젝트명으로 구분 가능
`,
    considerations: '향후 프로젝트가 늘어나면 같은 방식으로 추가 가능',
    troubleshooting: '없음',
    testing: '프로젝트 매핑 테스트 필요',
    references: '.claude/obsidian-config.json',
    lessons: '프로젝트 구조는 저장소 단위로 관리하는 것이 효율적',
    files: [
      '.claude/obsidian-config.json',
      '.claude/skills/work-logger/claude-auto-log.js'
    ]
  },

  // 3. Notion 페이지 구조 개선
  {
    project: 'Claude',
    type: 'fix',
    scope: 'NotionAPI',
    message: 'Notion 페이지 가로선 제거 및 구조 개선',
    description: 'Notion 페이지의 불필요한 가로선 제거 및 깔끔한 구조로 변경',
    implementation: `
- H1 제목 제거 (가로선 원인)
- H2 제목만 사용: "📋 YYYY-MM-DD 작업 내역"
- 바로 작업 목록 시작
- 페이지 아이콘 추가 (📝)
`,
    technicalDecisions: `
가로선이 생긴 이유:
- Notion은 H2 제목 아래 자동으로 구분선 추가
- H1 + H2 조합이 너무 복잡해 보임
해결: H2만 사용하고 이모지로 시각적 구분
`,
    considerations: 'Notion UI 특성상 제목 레벨에 따라 자동 스타일 적용됨',
    troubleshooting: `
문제: 페이지에 가로 스크롤바 생김
원인: 임베드된 데이터베이스나 넓은 컬럼
해결: 페이지 새로고침 및 컬럼 너비 조정
`,
    testing: '18개 페이지 삭제 후 재생성하여 검증',
    references: 'Notion 블록 구조 문서',
    lessons: 'Notion의 자동 스타일링을 이해하고 최소한의 구조 사용',
    files: [
      'scripts/notion-daily-log.js',
      'scripts/clean-notion-pages.js'
    ]
  },

  // 4. Notion 데이터베이스 속성 설정
  {
    project: 'Claude',
    type: 'feat',
    scope: 'NotionDB',
    message: 'Notion 데이터베이스 속성 및 자동 요약 기능',
    description: '테이블 뷰에서 작업 내용 확인 가능하도록 속성 추가 및 요약 자동 업데이트',
    implementation: `
- 데이터베이스 속성 3개 설정
  - 업무일시 (Title): 페이지 제목
  - 프로젝트명 (Rich Text): 작업한 프로젝트 목록
  - 진행내용 (Rich Text): 작업 개수 및 타입별 통계
- updateDailySummary() 함수 구현
  - 페이지의 모든 작업 파싱
  - 프로젝트별/타입별 그룹핑
  - 자동 요약 생성
`,
    technicalDecisions: `
테이블 뷰에 요약 표시 이유:
- 한 눈에 그날 작업량 파악
- 프로젝트별 작업 분포 확인
- 타입별 통계로 작업 패턴 분석
`,
    considerations: `
- 요약은 작업 추가 시마다 자동 업데이트
- 너무 많은 정보는 넣지 않고 핵심만
`,
    troubleshooting: `
문제: 빈 데이터베이스에 Title 속성이 없음
해결: Notion UI에서 수동으로 첫 번째 컬럼 이름 설정 필요
`,
    testing: '23개 작업 기록 후 요약 자동 업데이트 확인',
    references: 'Notion API - Pages and Database Properties',
    lessons: 'Notion API로는 데이터베이스 속성 추가 불가, UI에서 초기 설정 필요',
    files: [
      'scripts/notion-daily-log.js',
      'scripts/update-summary.js'
    ]
  },

  // 5. Notion 페이지 필터링 버그 수정
  {
    project: 'Claude',
    type: 'fix',
    scope: 'NotionAPI',
    message: 'Notion 페이지 필터링 버그 수정 (UUID, parent.type)',
    description: 'Notion 페이지 검색 시 필터링이 작동하지 않던 버그 수정',
    implementation: `
두 가지 버그 수정:
1. UUID 하이픈 불일치
   - .env: 292d286a32098071870dd03585d03db9
   - API: 292d286a-3209-8071-870d-d03585d03db9
   - 해결: 하이픈 제거 후 비교

2. parent.type 불일치
   - 예상: 'database_id'
   - 실제: 'data_source_id'
   - 해결: parent.database_id 존재 여부만 확인
`,
    technicalDecisions: `
UUID 정규화:
- 하이픈 유무 관계없이 비교하도록 정규화
- replace(/-/g, '')로 하이픈 제거

parent.type 무시:
- Notion API의 parent.type이 일관성 없음
- database_id 필드 존재만 확인
`,
    considerations: 'Notion API의 응답 구조가 변경될 수 있으므로 방어적 코딩',
    troubleshooting: `
문제: 18개 페이지가 있는데 필터링하면 0개 반환
원인1: UUID 하이픈 불일치
원인2: parent.type이 'data_source_id'
해결: 두 가지 모두 수정
`,
    testing: 'clean-notion-pages.js와 debug-pages.js로 검증',
    references: 'Notion API 문서 - Search',
    lessons: 'API 응답 구조를 가정하지 말고 실제 데이터 확인 필요',
    files: [
      'scripts/notion-daily-log.js',
      'scripts/clean-notion-pages.js',
      'scripts/debug-pages.js'
    ]
  }
];

async function logAll() {
  console.log(`📝 누락된 ${missingWorks.length}개 작업 기록 시작...\n`);

  for (const work of missingWorks) {
    console.log(`\n[${ missingWorks.indexOf(work) + 1}/${missingWorks.length}] ${work.message}`);
    await autoLog(work);
    console.log('---');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ 모든 누락된 작업 기록 완료!');
}

logAll();
