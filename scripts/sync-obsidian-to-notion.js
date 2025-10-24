#!/usr/bin/env node

/**
 * Obsidian → Notion 동기화
 * @purpose Obsidian 작업 기록을 Notion 일일 업무일지에 동기화
 * @usage node scripts/sync-obsidian-to-notion.js [날짜]
 */

const fs = require('fs');
const path = require('path');
const { addWorkLog } = require('./notion-daily-log');

/**
 * Obsidian 마크다운 파일 파싱
 */
function parseObsidianFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Frontmatter 추출
  let inFrontmatter = false;
  const frontmatter = {};
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
      } else {
        bodyStart = i + 1;
        break;
      }
    } else if (inFrontmatter) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        frontmatter[match[1]] = match[2];
      }
    }
  }

  const body = lines.slice(bodyStart).join('\n');

  return {
    frontmatter,
    body,
    filePath
  };
}

/**
 * Obsidian 파일에서 작업 정보 추출
 */
function extractWorkInfo(parsed) {
  const { frontmatter, body, filePath } = parsed;

  // 기본 정보
  const date = frontmatter.date || '';
  const title = frontmatter.title || '';
  const category = frontmatter.category || '';
  const project = frontmatter.project || '';

  // 파일명에서 프로젝트 추측
  let detectedProject = project;
  if (!detectedProject) {
    if (filePath.includes('나라똔')) detectedProject = '나라똔';
    else if (filePath.includes('디자인')) detectedProject = '디자인';
    else if (filePath.includes('Claude')) detectedProject = 'Claude';
  }

  // 타입 추측
  let type = 'chore';
  if (category === '기능개발') type = 'feat';
  else if (category === '트러블슈팅') type = 'fix';
  else if (category === '변경기록') type = 'style';
  else if (category === '가이드라인') type = 'docs';

  // 범위 추출 (컴포넌트명 등)
  const componentMatch = frontmatter.component || title.match(/([A-Z][a-z]+)/);
  const scope = componentMatch ? componentMatch[1] || componentMatch : '';

  // 메시지 (제목에서 추출)
  const message = title.replace(/^[^-]+-/, '').trim();

  // 상세 설명 (본문 요약)
  const descMatch = body.match(/## (변경 내용|해결 과정|개요)\n\n([^\n]+)/);
  const description = descMatch ? descMatch[2] : '';

  return {
    date,
    project: detectedProject,
    type,
    scope,
    message,
    description,
    filePath
  };
}

/**
 * 특정 날짜의 Obsidian 파일들 찾기
 */
function findObsidianFilesByDate(date, projectPath = 'Projects/디자인') {
  const vaultPath = 'F:\\obsidian\\Pola';
  const fullPath = path.join(vaultPath, projectPath);

  const files = [];

  function scanDir(dir) {
    try {
      const items = fs.readdirSync(dir);

      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          scanDir(itemPath);
        } else if (item.endsWith('.md') && item.includes(date)) {
          files.push(itemPath);
        }
      });
    } catch (error) {
      // 권한 없는 폴더 무시
    }
  }

  scanDir(fullPath);
  return files;
}

/**
 * Obsidian 링크 생성
 */
function createObsidianLink(filePath) {
  const vaultPath = 'F:\\obsidian\\Pola';
  const relativePath = path.relative(vaultPath, filePath);
  const encodedPath = encodeURIComponent(relativePath.replace(/\\/g, '/'));

  return `obsidian://open?vault=Pola&file=${encodedPath}`;
}

/**
 * 하루치 Obsidian 작업을 Notion에 동기화
 */
async function syncDayToNotion(date) {
  console.log(`📅 ${date} 작업 내역 동기화 시작...\n`);

  // 디자인 프로젝트 파일 찾기
  const designFiles = findObsidianFilesByDate(date, 'Projects/디자인');

  // 나라똔 프로젝트 파일 찾기
  const naraddonFiles = findObsidianFilesByDate(date, 'Projects/나라똔');

  // Claude 프로젝트 파일 찾기
  const claudeFiles = findObsidianFilesByDate(date, 'Projects/Claude');

  const allFiles = [...designFiles, ...naraddonFiles, ...claudeFiles];

  if (allFiles.length === 0) {
    console.log(`${date}에 작성된 Obsidian 파일이 없습니다.`);
    return;
  }

  console.log(`총 ${allFiles.length}개 파일 발견:\n`);

  let syncCount = 0;

  for (const file of allFiles) {
    try {
      console.log(`처리 중: ${path.basename(file)}`);

      // 파일 파싱
      const parsed = parseObsidianFile(file);

      // 작업 정보 추출
      const workInfo = extractWorkInfo(parsed);

      // Obsidian 링크 생성
      const obsidianLink = createObsidianLink(file);

      // Notion에 추가
      await addWorkLog(
        workInfo.project,
        workInfo.type,
        workInfo.scope,
        workInfo.message,
        {
          description: workInfo.description,
          obsidianLink
        }
      );

      syncCount++;
    } catch (error) {
      console.error(`  ❌ 실패: ${error.message}`);
    }
  }

  console.log(`\n✅ 동기화 완료: ${syncCount}/${allFiles.length}개`);
}

/**
 * CLI 메인
 */
async function main() {
  const args = process.argv.slice(2);
  const date = args[0] || new Date().toISOString().split('T')[0];

  console.log('🔄 Obsidian → Notion 동기화\n');

  try {
    await syncDayToNotion(date);
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = {
  syncDayToNotion,
  parseObsidianFile,
  extractWorkInfo,
  findObsidianFilesByDate
};
