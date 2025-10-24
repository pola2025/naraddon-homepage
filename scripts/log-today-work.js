#!/usr/bin/env node

/**
 * 오늘 작업 내역 Notion에 일괄 기록
 * @purpose 현재 세션의 모든 작업을 시간순으로 Notion에 기록
 */

const { addWorkLog, updateDailySummary } = require('./notion-daily-log');

/**
 * 오늘의 작업 내역 (시간순)
 */
const todayWork = [
  {
    time: '14:00',
    project: '디자인',
    type: 'docs',
    scope: 'research',
    message: 'AI 스타일 디자인 조사 시작',
    context: {
      description: 'Google, GitHub, Reddit에서 AI 디자인 패턴 조사',
      files: ['조사 결과: 블러리 그라디언트, 알록달록 색상, AI 이모지 클리셰']
    }
  },
  {
    time: '14:30',
    project: '디자인',
    type: 'docs',
    scope: 'definition',
    message: 'AI스러운 디자인 정의 완료',
    context: {
      description: '✨🚀🔥 등 AI 클리셰 이모지, 알록달록 다색 팔레트 정의'
    }
  },
  {
    time: '14:45',
    project: '디자인',
    type: 'docs',
    scope: 'policy',
    message: '디자인 정책 수립 - 이모지 SVG 우선',
    context: {
      description: '이모지 최소화, SVG 단색 아이콘 선호 정책 확정'
    }
  },
  {
    time: '15:00',
    project: '디자인',
    type: 'docs',
    scope: 'policy',
    message: '색상 정책 수정 - 보라색 제거, 네온 허용',
    context: {
      description: '알록달록 금지, 2-3가지 색상 권장, 네온 절제하면 허용'
    }
  },
  {
    time: '15:15',
    project: '디자인',
    type: 'feat',
    scope: 'obsidian',
    message: 'Obsidian 디자인 프로젝트 구조 생성',
    context: {
      description: 'F:/obsidian/Pola/Projects/디자인/ 폴더 구조 생성',
      files: ['00-가이드라인/', '01-변경기록/', '02-트러블슈팅/', '03-검토기록/', '99-리소스/'],
      obsidianLink: 'obsidian://open?vault=Pola&file=Projects%2F%EB%94%94%EC%9E%90%EC%9D%B8%2F00-%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%2FREADME.md'
    }
  },
  {
    time: '15:30',
    project: '디자인',
    type: 'docs',
    scope: 'guidelines',
    message: '가이드라인 문서 작성 완료',
    context: {
      description: '색상-시스템.md, 아이콘-규칙.md, AI-회피-패턴.md',
      files: ['총 10개 Obsidian 문서 생성']
    }
  },
  {
    time: '15:45',
    project: '디자인',
    type: 'feat',
    scope: 'templates',
    message: 'Obsidian 템플릿 파일 생성',
    context: {
      description: '변경기록, 트러블슈팅, 검토 템플릿',
      files: ['design-change-template.md', 'design-troubleshooting-template.md', 'design-review-template.md']
    }
  },
  {
    time: '16:00',
    project: 'Claude',
    type: 'feat',
    scope: 'skill',
    message: 'Design Guardian Skill 파일 구현',
    context: {
      description: 'AI 패턴 감지 및 자동 검사 Skill',
      files: ['.claude/skills/design-guardian/skill.md', 'patterns.json', 'README.md']
    }
  },
  {
    time: '16:15',
    project: '디자인',
    type: 'feat',
    scope: 'detector',
    message: '색상 감지기 구현',
    context: {
      description: 'AI 색상 패턴 자동 감지',
      files: ['.claude/skills/design-guardian/utils/color-detector.js']
    }
  },
  {
    time: '16:30',
    project: '디자인',
    type: 'feat',
    scope: 'detector',
    message: '이모지 감지기 구현',
    context: {
      description: 'AI 클리셰 이모지 자동 감지',
      files: ['.claude/skills/design-guardian/utils/emoji-detector.js']
    }
  },
  {
    time: '16:45',
    project: '디자인',
    type: 'feat',
    scope: 'checker',
    message: '디자인 패턴 검사 스크립트 완성',
    context: {
      description: 'CSS/TSX 파일 AI 패턴 자동 검사',
      files: ['scripts/check-design-patterns.js']
    }
  },
  {
    time: '17:00',
    project: '디자인',
    type: 'test',
    scope: 'checker',
    message: '검사 스크립트 테스트 성공',
    context: {
      description: 'AI 패턴 정확히 감지 (9가지 색상, 무지개 그라디언트, AI 조합)'
    }
  },
  {
    time: '17:15',
    project: 'Claude',
    type: 'feat',
    scope: 'notion',
    message: 'Notion 일일 업무일지 스크립트 개발 시작',
    context: {
      description: '시간순 타임라인 기록 시스템 기획'
    }
  },
  {
    time: '17:30',
    project: 'Claude',
    type: 'feat',
    scope: 'notion',
    message: 'Notion API 연동 스크립트 작성',
    context: {
      description: '커밋 메시지 형태로 작업 로그 추가 기능',
      files: ['scripts/notion-daily-log.js']
    }
  },
  {
    time: '17:45',
    project: 'Claude',
    type: 'feat',
    scope: 'sync',
    message: 'Obsidian-Notion 동기화 스크립트 작성',
    context: {
      description: 'Obsidian 문서를 Notion에 자동 동기화',
      files: ['scripts/sync-obsidian-to-notion.js']
    }
  },
  {
    time: '18:00',
    project: 'Claude',
    type: 'feat',
    scope: 'git-hooks',
    message: 'Git Hooks 자동 설치 스크립트 작성',
    context: {
      description: 'post-commit, pre-push 자동화',
      files: ['scripts/install-git-hooks.js']
    }
  },
  {
    time: '18:15',
    project: 'Claude',
    type: 'docs',
    scope: 'notion',
    message: 'Notion 설정 가이드 작성',
    context: {
      description: '상세 설정 가이드 및 빠른 시작 문서',
      files: ['docs/notion-daily-log-setup.md', 'docs/notion-quick-start.md']
    }
  }
];

/**
 * 시간을 현재 날짜의 시간으로 변환
 */
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date;
}

/**
 * 모든 작업 Notion에 기록
 */
async function logAllWork() {
  console.log('📝 오늘 작업 내역을 Notion에 기록합니다...\n');

  let successCount = 0;
  let failCount = 0;
  let pageId = null;

  for (const work of todayWork) {
    try {
      // 시간 정보 추가 (실제 시간이 아닌 예상 시간)
      console.log(`[${work.time}] [${work.project}] ${work.type}(${work.scope}): ${work.message}`);

      const result = await addWorkLog(
        work.project,
        work.type,
        work.scope,
        work.message,
        work.context
      );

      // 페이지 ID 저장 (요약 업데이트용)
      if (result && result.pageId) {
        pageId = result.pageId;
      }

      successCount++;

      // API 요청 간격
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ❌ 실패: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ 성공: ${successCount}/${todayWork.length}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log('='.repeat(60));

  // 페이지 요약 업데이트
  if (pageId && successCount > 0) {
    console.log('\n📊 페이지 요약 업데이트 중...\n');
    await updateDailySummary(pageId);
  }

  console.log('\n📊 작업 요약:');
  console.log(`  총 작업 시간: 약 4시간 15분`);
  console.log(`  프로젝트: 디자인 (${todayWork.filter(w => w.project === '디자인').length}개), Claude (${todayWork.filter(w => w.project === 'Claude').length}개)`);
  console.log(`  타입: feat (${todayWork.filter(w => w.type === 'feat').length}개), docs (${todayWork.filter(w => w.type === 'docs').length}개), test (${todayWork.filter(w => w.type === 'test').length}개)`);

  console.log('\n🎯 주요 산출물:');
  console.log('  1. Design Guardian Skill 완성');
  console.log('  2. Obsidian 디자인 프로젝트 구조 (10개 문서)');
  console.log('  3. AI 패턴 자동 검사 시스템');
  console.log('  4. Notion 일일 업무일지 시스템');
  console.log('  5. Obsidian-Notion 동기화');

  console.log('\n🔗 Notion에서 확인하세요!');
}

// 실행
if (require.main === module) {
  logAllWork().catch(error => {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  });
}

module.exports = { todayWork, logAllWork };
