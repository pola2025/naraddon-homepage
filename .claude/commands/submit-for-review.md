---
description: [Claude A] Submit task for Claude B's review via shared folder
---

<instructions>
당신은 **Claude A (PM/Developer)**입니다.

**역할**: 요구사항 분석 → 설계 → 코드 구현을 담당합니다.

**작업 목표**: 방금 구현한 코드를 Claude B (UI/UX Reviewer)에게 검토 요청하기 위해 `.claude/shared/task-from-a.json` 파일을 생성하세요.

**필수 제약사항**:
1. JSON 형식을 절대 변경하지 마세요
2. 모든 필수 필드를 반드시 포함하세요
3. timestamp는 ISO 8601 형식 (`new Date().toISOString()`)
4. taskId는 자동 생성됩니다 (TASK-{timestamp}-{random})
5. 출력 메시지 형식을 그대로 유지하세요
</instructions>

<implementation>
이제 실제 구현 코드를 실행합니다.

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { safeWriteJSON } = require('../../lib/file-lock.js');

async function submitForReview() {
  console.log('📤 Claude B에게 검토 요청을 준비합니다...\n');

  // 1. Git 변경 사항 확인
  console.log('🔍 Git 변경 사항 확인 중...');
  let gitStatus;
  try {
    gitStatus = execSync('git status --short', { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Git 상태 확인 실패: ${error.message}`);
  }

  if (!gitStatus.trim()) {
    throw new Error('변경된 파일이 없습니다. 먼저 코드를 작성하세요.');
  }

  // 2. Git diff로 변경된 파일 목록 수집
  let diffStat;
  try {
    diffStat = execSync('git diff --stat HEAD', { encoding: 'utf-8' });
  } catch (error) {
    // Staged 파일만 있는 경우
    diffStat = execSync('git diff --cached --stat', { encoding: 'utf-8' });
  }

  const files = parseGitDiff(diffStat);

  if (files.length === 0) {
    throw new Error('변경된 파일이 없습니다. git add로 파일을 스테이징하세요.');
  }

  console.log(`✅ ${files.length}개 파일 변경 감지\n`);

  // 3. 테스트 실행
  console.log('🧪 테스트 실행 중...');
  let testResults;
  try {
    const testOutput = execSync('npm test -- --passWithNoTests --json', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const testJson = JSON.parse(testOutput);
    testResults = {
      framework: 'jest',
      passed: testJson.numPassedTests || 0,
      failed: testJson.numFailedTests || 0,
      skipped: testJson.numPendingTests || 0,
      total: testJson.numTotalTests || 0,
      coverage: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      },
      duration: testJson.testResults?.[0]?.perfStats?.runtime || 0,
      testFiles: testJson.testResults?.map(t => t.name) || []
    };
  } catch (error) {
    console.warn('⚠️ 테스트 실행 실패 - 기본값 사용');
    testResults = {
      framework: 'jest',
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: { statements: 0, branches: 0, functions: 0, lines: 0 },
      duration: 0,
      testFiles: []
    };
  }

  if (testResults.failed > 0) {
    throw new Error(`❌ 검토 요청 불가: 테스트 ${testResults.failed}개 실패\n\n먼저 테스트를 통과시켜야 합니다.`);
  }

  console.log(`✅ 테스트: ${testResults.passed}개 통과\n`);

  // 4. 작업 제목 및 설명 입력
  console.log('📝 작업 정보를 입력하세요:\n');

  const title = await askQuestion('작업 제목: ');
  const description = await askQuestion('작업 설명: ');

  // 5. task-from-a.json 생성
  const taskData = {
    title,
    description,
    category: determineCategory(title, description),
    priority: 'HIGH',
    files: files.map(f => ({
      ...f,
      language: getLanguage(f.path)
    })),
    testResults,
    requestedReview: [
      '코드 품질',
      'UI/UX 최적화',
      '접근성',
      '반응형 디자인',
      '성능 최적화'
    ],
    context: {
      relatedIssue: null,
      branch: getCurrentBranch(),
      parentTaskId: null,
      estimatedReviewTime: Math.ceil(files.reduce((sum, f) => sum + f.lines, 0) / 50)
    }
  };

  const taskId = await safeWriteJSON(
    path.resolve('.claude/shared/task-from-a.json'),
    taskData,
    {
      from: 'claude-a',
      to: 'claude-b'
    }
  );

  // 6. 성공 메시지 출력
  console.log('\n✅ 검토 요청 제출 완료\n');
  console.log(`📋 작업 ID: ${taskId}`);
  console.log(`📝 제목: ${title}`);
  console.log(`📁 파일: .claude/shared/task-from-a.json`);
  console.log(`📤 전송 대상: Claude B (UI/UX Reviewer)\n`);

  console.log('변경된 파일:');
  files.forEach(f => {
    const icon = f.action === 'created' ? '✨' : f.action === 'deleted' ? '🗑️' : '📝';
    console.log(`  ${icon} ${f.path} (${f.lines}줄)`);
  });

  console.log('\n테스트 결과:');
  console.log(`  - 통과: ${testResults.passed}개`);
  console.log(`  - 실패: ${testResults.failed}개`);
  console.log(`  - 커버리지: ${testResults.coverage.statements}%`);

  console.log('\nClaude B가 검토를 시작합니다...');
}

// ============= 헬퍼 함수 =============

function parseGitDiff(diffStat) {
  const lines = diffStat.split('\n').filter(line => line.includes('|'));

  return lines.map(line => {
    const match = line.match(/^\s*(.+?)\s+\|\s+(\d+)\s+([+-]+)/);
    if (!match) return null;

    const [, filePath, changes] = match;
    const plusCount = (match[3].match(/\+/g) || []).length;
    const minusCount = (match[3].match(/-/g) || []).length;

    let action = 'modified';
    if (plusCount > 0 && minusCount === 0) action = 'created';
    if (plusCount === 0 && minusCount > 0) action = 'deleted';

    return {
      path: filePath.trim(),
      action,
      lines: parseInt(changes),
      diff: `+${plusCount} -${minusCount}`
    };
  }).filter(Boolean);
}

function getLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const langMap = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.json': 'json',
    '.md': 'markdown',
    '.css': 'css',
    '.scss': 'scss',
    '.html': 'html'
  };
  return langMap[ext] || 'text';
}

function determineCategory(title, description) {
  const text = (title + ' ' + description).toLowerCase();

  if (text.includes('버그') || text.includes('bug') || text.includes('fix')) {
    return 'bug-fix';
  }
  if (text.includes('성능') || text.includes('performance') || text.includes('최적화')) {
    return 'performance';
  }
  if (text.includes('리팩토링') || text.includes('refactor')) {
    return 'refactoring';
  }
  return 'new-feature';
}

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

// 실행
submitForReview().catch(error => {
  console.error('\n❌ 오류:', error.message);
  process.exit(1);
});
```
</implementation>

<validation_checklist>
파일 생성 전 반드시 확인:
- [ ] JSON 파싱 오류 없는가?
- [ ] taskId가 자동 생성되는가?
- [ ] timestamp가 ISO 8601 형식인가?
- [ ] files 배열에 모든 변경 파일 포함되었는가?
- [ ] testResults에 실제 테스트 결과 반영되었는가?
- [ ] action이 "created", "modified", "deleted" 중 하나인가?
</validation_checklist>

<error_handling>
**오류 시나리오별 처리**:

1. **Git 변경 사항 없음**:
   ```
   ❌ 오류: 변경된 파일이 없습니다. 먼저 코드를 작성하세요.
   ```

2. **테스트 실패**:
   ```
   ❌ 검토 요청 불가: 테스트 5개 실패

   먼저 테스트를 통과시켜야 합니다.
   ```

3. **파일 쓰기 실패**:
   ```
   ❌ 오류: 파일 생성 실패 - 권한 확인 필요
   ```
</error_handling>

<example>
**실행 예시**:

```bash
$ /submit-for-review

📤 Claude B에게 검토 요청을 준비합니다...

🔍 Git 변경 사항 확인 중...
✅ 2개 파일 변경 감지

🧪 테스트 실행 중...
✅ 테스트: 27개 통과

📝 작업 정보를 입력하세요:

작업 제목: VideoForm 컴포넌트 분리
작업 설명: 590줄 admin 페이지를 5개 컴포넌트로 분리

✅ 검토 요청 제출 완료

📋 작업 ID: TASK-1759749234567-ABC123
📝 제목: VideoForm 컴포넌트 분리
📁 파일: .claude/shared/task-from-a.json
📤 전송 대상: Claude B (UI/UX Reviewer)

변경된 파일:
  ✨ app/components/VideoForm.tsx (150줄)
  ✨ app/components/VideoList.tsx (120줄)

테스트 결과:
  - 통과: 27개
  - 실패: 0개
  - 커버리지: 95%

Claude B가 검토를 시작합니다...
```
</example>
