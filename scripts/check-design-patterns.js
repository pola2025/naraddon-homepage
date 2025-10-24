#!/usr/bin/env node

/**
 * Design Guardian - AI 패턴 검사
 * @purpose 디자인 파일의 AI 스타일 패턴 자동 감지
 * @usage node scripts/check-design-patterns.js [파일경로]
 */

const fs = require('fs');
const path = require('path');
const colorDetector = require('../.claude/skills/design-guardian/utils/color-detector');
const emojiDetector = require('../.claude/skills/design-guardian/utils/emoji-detector');

/**
 * 파일 읽기
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`❌ 파일 읽기 실패: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 검사 대상 파일 찾기
 */
function findDesignFiles(dir = 'src') {
  const extensions = ['.css', '.scss', '.module.css', '.tsx', '.jsx'];
  const files = [];

  function scan(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);

      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // node_modules, .next 등 제외
          if (!item.startsWith('.') && item !== 'node_modules') {
            scan(fullPath);
          }
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      // 권한 없는 폴더 등 무시
    }
  }

  scan(dir);
  return files;
}

/**
 * 단일 파일 검사
 */
function checkFile(filePath, options = {}) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 파일: ${filePath}`);
  console.log('='.repeat(60));

  const code = readFile(filePath);

  // 1. 색상 검사
  console.log('\n🎨 색상 검사...');
  const colorResults = colorDetector.checkColors(code, {
    maxColors: options.maxColors || 3,
    isConceptPurple: options.isConceptPurple || false
  });
  console.log(colorDetector.formatResults(colorResults));

  // 2. 이모지 검사
  console.log('\n😀 이모지 검사...');
  const emojiResults = emojiDetector.checkEmojis(code);
  console.log(emojiDetector.formatResults(emojiResults));

  // 종합 결과
  const passed = colorResults.passed && emojiResults.passed;
  const totalIssues = colorResults.issues.length + emojiResults.issues.length;
  const totalWarnings = colorResults.warnings.length + emojiResults.warnings.length;

  console.log('\n' + '='.repeat(60));

  if (passed && totalWarnings === 0) {
    console.log('✅ 모든 검사 통과!');
  } else if (passed) {
    console.log(`⚠️ 통과 (경고 ${totalWarnings}개)`);
  } else {
    console.log(`❌ 실패 (오류 ${totalIssues}개, 경고 ${totalWarnings}개)`);
  }

  console.log('='.repeat(60));

  return {
    filePath,
    passed,
    issues: totalIssues,
    warnings: totalWarnings,
    colorResults,
    emojiResults
  };
}

/**
 * 여러 파일 검사
 */
function checkMultipleFiles(files, options = {}) {
  console.log(`\n🔍 Design Guardian - ${files.length}개 파일 검사 시작\n`);

  const results = files.map(file => checkFile(file, options));

  // 전체 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 전체 요약');
  console.log('='.repeat(60));

  const totalFiles = results.length;
  const passedFiles = results.filter(r => r.passed).length;
  const failedFiles = totalFiles - passedFiles;
  const totalIssues = results.reduce((sum, r) => sum + r.issues, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);

  console.log(`\n총 파일: ${totalFiles}개`);
  console.log(`✅ 통과: ${passedFiles}개`);
  console.log(`❌ 실패: ${failedFiles}개`);
  console.log(`오류: ${totalIssues}개`);
  console.log(`경고: ${totalWarnings}개`);

  if (failedFiles > 0) {
    console.log(`\n❌ 실패한 파일:`);
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  - ${r.filePath} (오류 ${r.issues}개)`);
      });
  }

  console.log('\n' + '='.repeat(60));

  return {
    totalFiles,
    passedFiles,
    failedFiles,
    totalIssues,
    totalWarnings,
    passed: failedFiles === 0
  };
}

/**
 * CLI 메인
 */
function main() {
  const args = process.argv.slice(2);

  console.log('🎨 Design Guardian - AI 패턴 검사 도구\n');

  if (args.length === 0) {
    // 전체 프로젝트 검사
    console.log('📁 전체 프로젝트를 검사합니다...\n');

    const files = findDesignFiles('src');

    if (files.length === 0) {
      console.log('검사할 파일이 없습니다.');
      return;
    }

    const summary = checkMultipleFiles(files);

    process.exit(summary.passed ? 0 : 1);
  } else {
    // 지정된 파일 검사
    const filePath = args[0];

    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
      process.exit(1);
    }

    const result = checkFile(filePath);

    process.exit(result.passed ? 0 : 1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = {
  checkFile,
  checkMultipleFiles,
  findDesignFiles
};
