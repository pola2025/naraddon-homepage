#!/usr/bin/env node

/**
 * Obsidian File Watcher
 * @purpose Obsidian 파일 저장 감지 → Notion 자동 기록
 */

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { logWork } = require('./auto-logger');

// Obsidian 프로젝트 폴더들
const OBSIDIAN_PATHS = [
  'F:/obsidian/Pola/Projects/나라똔',
  'F:/obsidian/Pola/Projects/디자인',
  'F:/obsidian/Pola/Projects/Claude'
];

/**
 * Obsidian 파일에서 메타데이터 파싱
 */
function parseObsidianFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // YAML Front Matter 파싱
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!yamlMatch) {
      return null;
    }

    const yaml = yamlMatch[1];
    const metadata = {};

    yaml.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        metadata[key.trim()] = valueParts.join(':').trim();
      }
    });

    // 제목 추출 (첫 번째 # 헤딩)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');

    // 작업 내용 추출
    const contentMatch = content.match(/##\s+작업 내용\n([\s\S]*?)(?=\n##|$)/);
    const description = contentMatch ? contentMatch[1].trim() : '';

    // 변경된 파일 추출
    const filesMatch = content.match(/##\s+변경된 파일\n([\s\S]*?)(?=\n##|$)/);
    const files = filesMatch
      ? filesMatch[1]
          .split('\n')
          .filter(line => line.startsWith('- `'))
          .map(line => line.replace(/^- `(.+)`$/, '$1'))
      : [];

    return {
      project: metadata['프로젝트'] || '기타',
      type: metadata['타입'] || 'docs',
      scope: metadata['범위'] || path.basename(filePath, '.md'),
      message: title,
      description,
      files
    };

  } catch (error) {
    console.error(`파일 파싱 실패 (${filePath}):`, error.message);
    return null;
  }
}

/**
 * 프로젝트 폴더에서 프로젝트명 추출
 */
function getProjectFromPath(filePath) {
  if (filePath.includes('나라똔')) return '나라똔';
  if (filePath.includes('디자인')) return '디자인';
  if (filePath.includes('Claude')) return 'Claude';
  return '기타';
}

/**
 * Obsidian 파일 감시 시작
 */
function startWatcher() {
  console.log('👁️  Obsidian File Watcher 시작...\n');
  console.log('감시 중인 폴더:');
  OBSIDIAN_PATHS.forEach(p => console.log(`  - ${p}`));
  console.log('');

  const watcher = chokidar.watch(OBSIDIAN_PATHS, {
    ignored: /(^|[\/\\])\../, // 숨김 파일 무시
    persistent: true,
    ignoreInitial: true, // 초기 스캔 무시
    awaitWriteFinish: {
      stabilityThreshold: 2000, // 2초 동안 변경 없으면 저장 완료로 간주
      pollInterval: 100
    }
  });

  watcher
    .on('add', filePath => handleFileChange(filePath, 'add'))
    .on('change', filePath => handleFileChange(filePath, 'change'));

  console.log('✅ Watcher 준비 완료! Obsidian에 파일을 저장하면 자동으로 Notion에 기록됩니다.\n');
}

/**
 * 파일 변경 처리
 */
async function handleFileChange(filePath, event) {
  // .md 파일만 처리
  if (path.extname(filePath) !== '.md') {
    return;
  }

  // 템플릿 파일 무시
  if (filePath.includes('template')) {
    return;
  }

  console.log(`\n📄 ${event === 'add' ? '새 파일 감지' : '파일 수정 감지'}: ${path.basename(filePath)}`);

  // 파일 파싱
  const workData = parseObsidianFile(filePath);

  if (!workData) {
    console.log('⚠️  메타데이터 없음 - 건너뜀');
    return;
  }

  console.log(`📝 Notion에 기록: [${workData.project}] ${workData.type}(${workData.scope}): ${workData.message}`);

  // Notion에 기록
  await logWork(workData);
}

// 메인 실행
if (require.main === module) {
  // chokidar 패키지 확인
  try {
    require.resolve('chokidar');
  } catch (e) {
    console.error('❌ chokidar 패키지가 설치되지 않았습니다.');
    console.log('\n설치 방법:');
    console.log('  npm install chokidar');
    process.exit(1);
  }

  startWatcher();

  // Ctrl+C로 종료
  process.on('SIGINT', () => {
    console.log('\n\n👋 Watcher 종료');
    process.exit(0);
  });
}

module.exports = {
  startWatcher,
  parseObsidianFile
};
