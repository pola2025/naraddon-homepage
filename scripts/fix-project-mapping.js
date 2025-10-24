#!/usr/bin/env node

/**
 * 프로젝트 매핑 수정
 */

const { autoLog } = require('../.claude/skills/work-logger/claude-auto-log');

const correctedWorks = [
  // Notion 관련은 나라똔 프로젝트
  {
    project: '나라똔',  // Claude → 나라똔으로 수정
    type: 'feat',
    scope: 'NotionAPI',
    message: 'Notion 일일 업무일지 시스템 구현',
    description: '나라똔 프로젝트의 작업 기록을 위한 Notion API 연동',
    implementation: `
- Notion API 클라이언트 설정
- 일일 페이지 자동 생성
- 타임라인 형식 작업 기록
- 캐시 시스템으로 같은 날짜 페이지 재사용
`,
    technicalDecisions: `
Notion을 타임라인용으로 선택:
- 데이터베이스 뷰로 날짜별 필터링 용이
- 웹에서 언제든 확인 가능
- 협업 시 공유 용이
`,
    considerations: '나라똔 프로젝트의 모든 작업을 시간순으로 추적',
    troubleshooting: '없음',
    testing: 'notion-daily-log.js test 명령으로 검증',
    references: 'Notion API 공식 문서',
    lessons: 'Notion 데이터베이스는 타임라인 뷰에 최적화',
    files: [
      'scripts/notion-daily-log.js',
      '.env.local'
    ]
  },

  {
    project: '나라똔',  // Claude → 나라똔으로 수정
    type: 'feat',
    scope: 'NotionDB',
    message: 'Notion 데이터베이스 속성 및 자동 요약',
    description: '테이블 뷰에서 작업 내용 확인을 위한 속성 및 요약 기능',
    implementation: `
- 데이터베이스 속성 3개 설정
  - 업무일시 (Title): YYYY-MM-DD 업무일지
  - 프로젝트명 (Rich Text): 작업한 프로젝트들
  - 진행내용 (Rich Text): N개 작업: type(count)
- updateDailySummary() 함수
  - 페이지 블록 파싱
  - 프로젝트/타입별 그룹핑
  - 자동 요약 생성
`,
    technicalDecisions: `
요약 정보 자동 업데이트:
- 작업 추가할 때마다 자동 갱신
- 한 눈에 그날 작업량 파악
- 프로젝트별 작업 분포 확인
`,
    considerations: '요약은 간결하게 - 상세 내용은 페이지 내부',
    troubleshooting: `
문제: 빈 데이터베이스에 Title 속성 없음
해결: Notion UI에서 수동으로 컬럼 이름 설정 필요
`,
    testing: '23개 작업 후 요약 자동 업데이트 확인',
    references: 'Notion API - Database Properties',
    lessons: 'Notion API로 속성 생성 불가, UI 초기 설정 필수',
    files: [
      'scripts/update-summary.js',
      'scripts/notion-daily-log.js'
    ]
  },

  {
    project: '나라똔',  // Claude → 나라똔으로 수정
    type: 'fix',
    scope: 'NotionAPI',
    message: 'Notion 페이지 필터링 버그 수정',
    description: 'UUID 하이픈 불일치 및 parent.type 문제 해결',
    implementation: `
두 가지 버그 수정:
1. UUID 하이픈 정규화
   - .env: 하이픈 없음
   - API: 하이픈 포함
   - 해결: replace(/-/g, '') 후 비교

2. parent.type 검증 제거
   - 예상: 'database_id'
   - 실제: 'data_source_id'
   - 해결: database_id 필드만 확인
`,
    technicalDecisions: `
방어적 코딩:
- API 응답 구조를 가정하지 않음
- 하이픈 유무 관계없이 UUID 비교
- type 대신 필드 존재 여부로 판단
`,
    considerations: 'Notion API 응답 구조가 변경될 수 있음',
    troubleshooting: `
문제: 18개 페이지 있는데 필터링 시 0개 반환
진단: debug-pages.js로 실제 응답 확인
해결: UUID 정규화 + type 검증 제거
`,
    testing: 'clean-notion-pages.js로 18개 페이지 삭제 성공',
    references: 'Notion API - Search endpoint',
    lessons: '디버그 스크립트로 실제 데이터 확인 필수',
    files: [
      'scripts/notion-daily-log.js',
      'scripts/clean-notion-pages.js',
      'scripts/debug-pages.js'
    ]
  },

  {
    project: '나라똔',  // Claude → 나라똔으로 수정
    type: 'fix',
    scope: 'NotionUI',
    message: 'Notion 페이지 가로선 제거 및 구조 개선',
    description: '불필요한 가로선 제거하여 깔끔한 타임라인 구성',
    implementation: `
- H1 제목 제거 (가로선 원인)
- H2만 사용: "📋 YYYY-MM-DD 작업 내역"
- 바로 작업 목록 시작
- 페이지 아이콘: 📝
`,
    technicalDecisions: `
최소 구조 사용:
- Notion H2 아래 자동 구분선
- H1+H2 조합이 복잡
- 이모지로 시각적 구분
`,
    considerations: 'Notion UI 자동 스타일링 특성 고려',
    troubleshooting: `
문제: 가로 스크롤바 발생
원인: UI 렌더링 버그
해결: 페이지 새로고침, 컬럼 너비 조정
`,
    testing: '페이지 재생성 후 확인',
    references: 'Notion 블록 구조 문서',
    lessons: 'Notion 자동 스타일링 이해하고 최소 구조 사용',
    files: [
      'scripts/notion-daily-log.js'
    ]
  }
];

async function logAll() {
  console.log(`📝 프로젝트 매핑 수정: ${correctedWorks.length}개 작업\n`);

  for (const work of correctedWorks) {
    console.log(`\n[${correctedWorks.indexOf(work) + 1}/${correctedWorks.length}] [${work.project}] ${work.message}`);
    await autoLog(work);
    console.log('---');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ 올바른 프로젝트로 재기록 완료!');
}

logAll();
