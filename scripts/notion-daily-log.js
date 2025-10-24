#!/usr/bin/env node

/**
 * Notion 일일 업무일지 자동 기록
 * @purpose 시간순으로 커밋 메시지 형태의 작업 내역 기록
 * @usage node scripts/notion-daily-log.js [프로젝트명] [작업내용]
 */

const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

// 환경변수
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DAILY_LOG_DB = process.env.NOTION_DAILY_LOG_DB; // 일일 업무일지 DB ID

if (!NOTION_API_KEY) {
  console.error('❌ NOTION_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

if (!NOTION_DAILY_LOG_DB) {
  console.error('❌ NOTION_DAILY_LOG_DB 환경변수가 설정되지 않았습니다.');
  console.log('💡 .env.local 파일에 다음을 추가해주세요:');
  console.log('   NOTION_DAILY_LOG_DB=your_database_id_here');
  process.exit(1);
}

// Notion 클라이언트
const notion = new Client({ auth: NOTION_API_KEY });

// 캐시: 오늘 날짜 페이지 ID 저장 (같은 스크립트 실행 중 재사용)
let todayPageCache = null;

/**
 * 현재 날짜의 페이지 찾기 또는 생성
 */
async function findOrCreateDailyPage(date) {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  // 캐시된 페이지가 있고 같은 날짜면 재사용
  if (todayPageCache && todayPageCache.date === dateStr) {
    return todayPageCache.page;
  }

  try {
    // 데이터베이스의 모든 페이지 조회
    const searchResponse = await notion.search({
      filter: {
        property: 'object',
        value: 'page'
      }
    });

    // 이 데이터베이스에 속한 페이지들만 필터링
    // UUID는 하이픈 유무 관계없이 비교
    const normalizedDbId = NOTION_DAILY_LOG_DB.replace(/-/g, '');
    const dbPages = searchResponse.results.filter(page => {
      // parent.database_id만 확인 (type은 무시)
      if (!page.parent?.database_id) return false;
      const pageDbId = page.parent.database_id.replace(/-/g, '');
      return pageDbId === normalizedDbId;
    });

    // 오늘 날짜 페이지 찾기 (제목 또는 생성 날짜 기준)
    const existingPage = dbPages.find(page => {
      const createdDate = page.created_time.split('T')[0];
      return createdDate === dateStr;
    });

    // 이미 있으면 캐시하고 반환
    if (existingPage) {
      console.log(`📄 기존 페이지 사용: ${dateStr}`);
      todayPageCache = { date: dateStr, page: existingPage };
      return existingPage;
    }

    // 없으면 새로 생성 (아이콘 추가)
    const newPage = await notion.pages.create({
      parent: {
        database_id: NOTION_DAILY_LOG_DB
      },
      icon: {
        type: 'emoji',
        emoji: '📝'
      },
      properties: {
        '업무일시': {  // Title 속성
          title: [
            {
              text: {
                content: `${dateStr} 업무일지`
              }
            }
          ]
        },
        '프로젝트명': {
          rich_text: [
            {
              text: {
                content: '다중 프로젝트'  // 여러 프로젝트가 섞여있을 때
              }
            }
          ]
        },
        '진행내용': {
          rich_text: [
            {
              text: {
                content: '일일 업무 타임라인 기록'
              }
            }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `📋 ${dateStr} 작업 내역`
                },
                annotations: {
                  bold: true
                }
              }
            ]
          }
        }
      ]
    });

    console.log(`✅ 새 일일 페이지 생성: ${dateStr}`);

    // 캐시 저장
    todayPageCache = { date: dateStr, page: newPage };

    return newPage;
  } catch (error) {
    console.error('❌ Notion 페이지 생성/조회 실패:', error.message);
    throw error;
  }
}

/**
 * 커밋 메시지 형태로 로그 추가
 * @param {string} project - 프로젝트명
 * @param {string} type - feat/fix/docs/style/refactor/test 등
 * @param {string} scope - 작업 범위 (선택)
 * @param {string} message - 작업 내용
 * @param {Object} context - 추가 컨텍스트 (선택)
 */
async function addWorkLog(project, type, scope, message, context = {}) {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

  try {
    // 오늘 날짜 페이지 찾기/생성
    const dailyPage = await findOrCreateDailyPage(now);

    // 커밋 메시지 형식으로 작성
    let commitMsg = `${type}`;
    if (scope) {
      commitMsg += `(${scope})`;
    }
    commitMsg += `: ${message}`;

    // 로그 블록 생성
    const logBlocks = [
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `[${timeStr}] `
              },
              annotations: {
                color: 'gray'
              }
            },
            {
              type: 'text',
              text: {
                content: `[${project}] `
              },
              annotations: {
                bold: true,
                color: 'blue'
              }
            },
            {
              type: 'text',
              text: {
                content: commitMsg
              }
            }
          ]
        }
      }
    ];

    // 컨텍스트가 있으면 하위 항목으로 추가
    if (Object.keys(context).length > 0) {
      const contextItems = [];

      if (context.files) {
        contextItems.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `파일: ${context.files.join(', ')}`
                },
                annotations: {
                  code: true
                }
              }
            ]
          }
        });
      }

      if (context.obsidianLink) {
        contextItems.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Obsidian: '
                }
              },
              {
                type: 'text',
                text: {
                  content: context.obsidianLink,
                  link: {
                    url: context.obsidianLink
                  }
                },
                annotations: {
                  color: 'purple'
                }
              }
            ]
          }
        });
      }

      if (context.description) {
        contextItems.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: context.description
                }
              }
            ]
          }
        });
      }

      if (contextItems.length > 0) {
        // 첫 번째 항목에 하위 항목 추가
        logBlocks[0].bulleted_list_item.children = contextItems;
      }
    }

    // 페이지에 로그 추가
    await notion.blocks.children.append({
      block_id: dailyPage.id,
      children: logBlocks
    });

    console.log(`✅ 로그 추가 성공: [${project}] ${commitMsg}`);

    return {
      success: true,
      pageId: dailyPage.id,
      time: timeStr,
      project,
      message: commitMsg
    };
  } catch (error) {
    console.error('❌ 로그 추가 실패:', error.message);
    throw error;
  }
}

/**
 * Git 커밋 기반 로그 추가
 */
async function addGitCommitLog(project, commitMessage, files = []) {
  // 커밋 메시지 파싱 (Conventional Commits 형식)
  const commitPattern = /^(feat|fix|docs|style|refactor|test|chore|perf)(\(([^)]+)\))?: (.+)$/;
  const match = commitMessage.match(commitPattern);

  let type, scope, message;

  if (match) {
    type = match[1];
    scope = match[3] || '';
    message = match[4];
  } else {
    // 패턴 매칭 안되면 기본값
    type = 'chore';
    scope = '';
    message = commitMessage;
  }

  return addWorkLog(project, type, scope, message, {
    files: files.length > 0 ? files : undefined
  });
}

/**
 * Design Guardian 작업 로그 추가
 */
async function addDesignLog(component, changeType, description, obsidianLink) {
  return addWorkLog('디자인', 'style', component, description, {
    description: `변경 타입: ${changeType}`,
    obsidianLink
  });
}

/**
 * CLI 메인
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('📝 Notion 일일 업무일지 자동 기록\n');

  try {
    switch (command) {
      case 'add':
        // node scripts/notion-daily-log.js add [project] [type] [scope] [message]
        {
          const project = args[1];
          const type = args[2];
          const scope = args[3];
          const message = args[4];

          if (!project || !type || !message) {
            console.error('사용법: node scripts/notion-daily-log.js add <프로젝트> <타입> <범위> <메시지>');
            console.log('\n예시:');
            console.log('  node scripts/notion-daily-log.js add 나라똔 feat Header "색상 변경"');
            console.log('  node scripts/notion-daily-log.js add 디자인 style Button "SVG 아이콘 적용"');
            process.exit(1);
          }

          await addWorkLog(project, type, scope, message);
        }
        break;

      case 'git':
        // node scripts/notion-daily-log.js git [project] [commit-message]
        {
          const project = args[1];
          const commitMsg = args.slice(2).join(' ');

          if (!project || !commitMsg) {
            console.error('사용법: node scripts/notion-daily-log.js git <프로젝트> <커밋메시지>');
            process.exit(1);
          }

          await addGitCommitLog(project, commitMsg);
        }
        break;

      case 'design':
        // node scripts/notion-daily-log.js design [component] [type] [description]
        {
          const component = args[1];
          const changeType = args[2];
          const description = args[3];

          if (!component || !changeType || !description) {
            console.error('사용법: node scripts/notion-daily-log.js design <컴포넌트> <변경타입> <설명>');
            process.exit(1);
          }

          await addDesignLog(component, changeType, description);
        }
        break;

      case 'test':
        // 테스트 로그 추가
        {
          console.log('테스트 로그 추가 중...\n');

          await addWorkLog('나라똔', 'feat', 'design-guardian', 'Design Guardian Skill 구현 완료', {
            files: ['scripts/check-design-patterns.js', '.claude/skills/design-guardian/'],
            description: 'AI 패턴 감지 및 Obsidian 자동 기록 시스템',
            obsidianLink: 'obsidian://open?vault=Pola&file=Projects%2F%EB%94%94%EC%9E%90%EC%9D%B8%2F00-%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8%2FREADME.md'
          });

          console.log('\n테스트 완료!');
        }
        break;

      default:
        console.log('사용법:');
        console.log('  add [project] [type] [scope] [message]  - 작업 로그 추가');
        console.log('  git [project] [commit-message]         - Git 커밋 기반 로그');
        console.log('  design [component] [type] [desc]       - Design Guardian 로그');
        console.log('  test                                   - 테스트 로그 추가');
        console.log('\n예시:');
        console.log('  node scripts/notion-daily-log.js add 나라똔 feat Header "색상 변경"');
        console.log('  node scripts/notion-daily-log.js git 나라똔 "feat(design): Design Guardian 구현"');
        console.log('  node scripts/notion-daily-log.js design Button color "네온 그린으로 변경"');
        console.log('  node scripts/notion-daily-log.js test');
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

/**
 * 오늘 페이지의 작업 내역을 분석해서 요약 업데이트
 */
async function updateDailySummary(pageId) {
  try {
    // 페이지의 모든 블록 가져오기
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100
    });

    // 작업 로그만 추출 (bulleted_list_item)
    const workLogs = blocks.results.filter(b => b.type === 'bulleted_list_item');

    if (workLogs.length === 0) {
      return;
    }

    // 프로젝트별로 그룹핑
    const projectCounts = {};
    const typeCounts = {};

    workLogs.forEach(log => {
      const text = log.bulleted_list_item.rich_text.map(t => t.plain_text).join('');

      // [시간] [프로젝트] type(scope): message 형식 파싱
      const match = text.match(/\[[\d:]+\] \[(.+?)\] (\w+)/);
      if (match) {
        const project = match[1];
        const type = match[2];

        projectCounts[project] = (projectCounts[project] || 0) + 1;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    });

    // 요약 텍스트 생성
    const projects = Object.keys(projectCounts);
    const projectSummary = projects.join(', ');

    const types = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type}(${count})`)
      .join(', ');

    const summary = `${workLogs.length}개 작업: ${types}`;

    // 페이지 속성 업데이트
    await notion.pages.update({
      page_id: pageId,
      properties: {
        '프로젝트명': {
          rich_text: [
            {
              text: {
                content: projectSummary
              }
            }
          ]
        },
        '진행내용': {
          rich_text: [
            {
              text: {
                content: summary
              }
            }
          ]
        }
      }
    });

    console.log(`📊 요약 업데이트: ${projectSummary} | ${summary}`);

    return {
      projects: projectCounts,
      types: typeCounts,
      totalWorks: workLogs.length
    };

  } catch (error) {
    console.error('❌ 요약 업데이트 실패:', error.message);
  }
}

module.exports = {
  addWorkLog,
  addGitCommitLog,
  addDesignLog,
  findOrCreateDailyPage,
  updateDailySummary
};
