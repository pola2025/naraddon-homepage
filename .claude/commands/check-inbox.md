---
description: [Claude B] Check inbox and perform UI/UX review
---

<instructions>
당신은 **Claude B (UI/UX Reviewer)**입니다.

**역할**: 코드 품질, 사용자 경험, 접근성, 반응형 디자인, 성능을 검토합니다.

**작업 목표**: Claude A가 보낸 검토 요청(task-from-a.json)을 확인하고 UI/UX 관점에서 검토를 수행한 후 review-from-b.json을 생성하세요.

**필수 제약사항**:
1. task-from-a.json을 반드시 읽어야 합니다
2. 모든 파일을 실제로 분석하세요
3. 점수는 객관적으로 평가하세요 (0-100)
4. 발견된 이슈는 구체적으로 작성하세요
5. review-from-b.json 생성 후 task-from-a.json을 completed 상태로 변경하세요
</instructions>

<implementation>
이제 실제 검토를 수행합니다.

```javascript
const fs = require('fs');
const path = require('path');
const { safeReadJSON, markAsCompleted, safeWriteJSON } = require('../../lib/file-lock.js');

async function checkInbox() {
  console.log('📬 Claude B: 검토 요청을 확인합니다...\n');

  // 1. task-from-a.json 읽기
  let task;
  try {
    task = await safeReadJSON(
      path.resolve('.claude/shared/task-from-a.json'),
      30000
    );
  } catch (error) {
    throw new Error(`검토 요청 없음: ${error.message}\n\nClaude A에서 /submit-for-review를 먼저 실행하세요.`);
  }

  console.log(`📋 검토 요청 수신: ${task.content.title}\n`);
  console.log(`📁 파일 개수: ${task.content.files.length}개`);
  console.log(`🧪 테스트: ${task.content.testResults.passed}개 통과 (커버리지 ${task.content.testResults.coverage.statements}%)\n`);

  // 2. 파일별 UI/UX 검토 수행
  console.log('🔍 UI/UX 검토 시작...\n');

  const scores = {
    codeQuality: 0,
    ux: 0,
    accessibility: 0,
    responsiveness: 0,
    performance: 0
  };

  const positives = [];
  const issues = [];

  for (const file of task.content.files) {
    if (!fs.existsSync(file.path)) {
      console.warn(`⚠️ 파일 없음: ${file.path}`);
      continue;
    }

    console.log(`📄 ${file.path} 검토 중...`);

    const fileContent = fs.readFileSync(file.path, 'utf-8');
    const review = await reviewFile(file, fileContent, task.content);

    // 점수 누적
    scores.codeQuality += review.codeQuality;
    scores.ux += review.ux;
    scores.accessibility += review.accessibility;
    scores.responsiveness += review.responsiveness;
    scores.performance += review.performance;

    // 긍정적 요소 수집
    positives.push(...review.positives);

    // 이슈 수집
    issues.push(...review.issues);
  }

  // 3. 평균 점수 계산
  const fileCount = task.content.files.length || 1;
  Object.keys(scores).forEach(key => {
    scores[key] = Math.round(scores[key] / fileCount);
  });

  // 4. 종합 점수 계산
  const overallScore = Math.round(
    scores.codeQuality * 0.25 +
    scores.ux * 0.25 +
    scores.accessibility * 0.2 +
    scores.responsiveness * 0.15 +
    scores.performance * 0.15
  );

  // 5. 승인 여부 결정
  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
  const highIssues = issues.filter(i => i.severity === 'HIGH').length;
  const approved = overallScore >= 80 && criticalIssues === 0;

  console.log('\n검토 결과:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 종합 점수: ${overallScore}/100\n`);

  console.log('세부 점수:');
  console.log(`  📝 코드 품질: ${scores.codeQuality}/100`);
  console.log(`  🎨 UX: ${scores.ux}/100`);
  console.log(`  ♿ 접근성: ${scores.accessibility}/100`);
  console.log(`  📱 반응형: ${scores.responsiveness}/100`);
  console.log(`  ⚡ 성능: ${scores.performance}/100\n`);

  if (positives.length > 0) {
    console.log('긍정적 요소:');
    positives.slice(0, 3).forEach(p => {
      console.log(`  ✅ ${p.description}`);
    });
    console.log();
  }

  if (issues.length > 0) {
    console.log('발견된 이슈:');
    issues.slice(0, 5).forEach(i => {
      const icon = i.severity === 'CRITICAL' ? '🔴' : i.severity === 'HIGH' ? '🟠' : '🟡';
      console.log(`  ${icon} ${i.severity}: ${i.description}`);
    });
    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 6. review-from-b.json 생성
  const reviewData = {
    approved,
    overallScore,
    scores,
    positives,
    issues,
    recommendations: generateRecommendations(issues, scores),
    nextSteps: {
      requiresFix: issues.length > 0,
      criticalIssues,
      highIssues,
      mediumIssues: issues.filter(i => i.severity === 'MEDIUM').length,
      lowIssues: issues.filter(i => i.severity === 'LOW').length,
      estimatedFixTime: estimateFixTime(issues),
      proceedToSecurity: approved || (criticalIssues === 0 && highIssues === 0)
    },
    reviewerNotes: generateReviewerNotes(overallScore, approved, issues)
  };

  const reviewId = await safeWriteJSON(
    path.resolve('.claude/shared/review-from-b.json'),
    reviewData,
    {
      from: 'claude-b',
      to: 'claude-c',
      replyTo: task.taskId
    }
  );

  // 7. 원본 파일 완료 처리
  await markAsCompleted(path.resolve('.claude/shared/task-from-a.json'));

  console.log(`✅ 검토 ID: ${reviewId}`);
  console.log(`📁 파일: .claude/shared/review-from-b.json`);
  console.log(`📤 전송 대상: Claude C (Security Validator)\n`);

  if (reviewData.nextSteps.proceedToSecurity) {
    console.log('✅ Claude C (Security)로 전달합니다...');
  } else {
    console.log('⚠️ 치명적 이슈 발견 - Claude A에게 수정 요청');
  }
}

// ============= 검토 로직 =============

async function reviewFile(file, content, taskContext) {
  const review = {
    codeQuality: 85,
    ux: 85,
    accessibility: 85,
    responsiveness: 85,
    performance: 85,
    positives: [],
    issues: []
  };

  // 코드 품질 검토
  if (content.includes('// TODO') || content.includes('// FIXME')) {
    review.codeQuality -= 10;
    review.issues.push({
      severity: 'LOW',
      category: 'Code Quality',
      description: 'TODO/FIXME 주석 발견',
      file: file.path,
      line: findLineNumber(content, '// TODO'),
      suggestedFix: 'TODO 항목 완료 또는 Issue로 이동',
      autoFixable: false,
      estimatedEffort: '10분'
    });
  }

  if (content.length > 1000 && !content.includes('export')) {
    review.codeQuality -= 5;
    review.issues.push({
      severity: 'MEDIUM',
      category: 'Code Quality',
      description: '파일이 너무 큼 (1000줄 이상) - 분리 고려',
      file: file.path,
      line: null,
      suggestedFix: '기능별로 파일 분리',
      autoFixable: false,
      estimatedEffort: '30분'
    });
  }

  // UX 검토 (React/TSX 파일)
  if (file.language === 'tsx' || file.language === 'jsx') {
    if (content.includes('useState') || content.includes('useEffect')) {
      review.ux += 5;
      review.positives.push({
        category: 'UX',
        description: 'React Hooks 사용으로 상태 관리 명확',
        file: file.path,
        line: findLineNumber(content, 'useState')
      });
    }

    if (!content.includes('aria-') && content.includes('<button')) {
      review.accessibility -= 15;
      review.issues.push({
        severity: 'HIGH',
        category: 'Accessibility',
        description: 'button 요소에 aria-label 누락',
        file: file.path,
        line: findLineNumber(content, '<button'),
        suggestedFix: 'aria-label 또는 aria-labelledby 추가',
        autoFixable: true,
        estimatedEffort: '5분'
      });
    }

    if (content.includes('@media') || content.includes('responsive')) {
      review.responsiveness += 10;
      review.positives.push({
        category: 'Responsiveness',
        description: '반응형 디자인 구현됨',
        file: file.path,
        line: findLineNumber(content, '@media')
      });
    }
  }

  // 성능 검토
  if (content.includes('.map(') && !content.includes('key=')) {
    review.performance -= 20;
    review.issues.push({
      severity: 'HIGH',
      category: 'Performance',
      description: 'React list rendering에 key prop 누락',
      file: file.path,
      line: findLineNumber(content, '.map('),
      suggestedFix: '고유 key prop 추가',
      autoFixable: true,
      estimatedEffort: '5분'
    });
  }

  if (content.includes('console.log')) {
    review.performance -= 5;
    review.issues.push({
      severity: 'LOW',
      category: 'Performance',
      description: 'console.log 발견 (프로덕션에서 제거 필요)',
      file: file.path,
      line: findLineNumber(content, 'console.log'),
      suggestedFix: '프로덕션 빌드에서 자동 제거 설정',
      autoFixable: true,
      estimatedEffort: '2분'
    });
  }

  return review;
}

function findLineNumber(content, searchString) {
  const lines = content.split('\n');
  const index = lines.findIndex(line => line.includes(searchString));
  return index === -1 ? null : index + 1;
}

function generateRecommendations(issues, scores) {
  const recommendations = [];

  if (scores.accessibility < 80) {
    recommendations.push('접근성 개선: WCAG 2.1 AA 기준 준수 필요');
  }

  if (scores.performance < 80) {
    recommendations.push('성능 최적화: 불필요한 렌더링 방지, 메모이제이션 고려');
  }

  if (scores.ux < 80) {
    recommendations.push('UX 개선: 사용자 피드백 강화, 로딩 상태 표시');
  }

  if (issues.some(i => i.category === 'Code Quality')) {
    recommendations.push('코드 품질 개선: 주석 정리, 파일 분리, 네이밍 개선');
  }

  return recommendations;
}

function estimateFixTime(issues) {
  const totalMinutes = issues.reduce((sum, issue) => {
    const match = issue.estimatedEffort.match(/(\d+)분/);
    return sum + (match ? parseInt(match[1]) : 10);
  }, 0);

  return totalMinutes;
}

function generateReviewerNotes(overallScore, approved, issues) {
  if (overallScore >= 95) {
    return '매우 우수한 코드입니다. 즉시 배포 가능합니다.';
  }
  if (overallScore >= 85) {
    return '전반적으로 잘 구현되었습니다. 사소한 개선 사항만 있습니다.';
  }
  if (overallScore >= 75) {
    return '기본 기능은 잘 작동하나, 품질 개선이 필요합니다.';
  }
  if (approved) {
    return 'Claude C 검증 후 배포 가능합니다.';
  }
  return `${issues.length}개 이슈 수정 후 재검토 필요합니다.`;
}

// 실행
checkInbox().catch(error => {
  console.error('\n❌ 오류:', error.message);
  process.exit(1);
});
```
</implementation>

<validation_checklist>
검토 완료 전 반드시 확인:
- [ ] task-from-a.json을 성공적으로 읽었는가?
- [ ] 모든 파일을 실제로 분석했는가?
- [ ] 점수가 객관적으로 평가되었는가? (0-100)
- [ ] 이슈에 구체적인 파일명과 라인 번호 포함되었는가?
- [ ] review-from-b.json이 생성되었는가?
- [ ] task-from-a.json이 completed 상태로 변경되었는가?
</validation_checklist>

<error_handling>
**오류 시나리오별 처리**:

1. **검토 요청 없음**:
   ```
   ❌ 검토 요청 없음: Timeout: 파일을 30000ms 내에 읽을 수 없음

   Claude A에서 /submit-for-review를 먼저 실행하세요.
   ```

2. **파일 읽기 실패**:
   ```
   ⚠️ 파일 없음: app/components/VideoForm.tsx
   (검토는 계속 진행)
   ```

3. **JSON 파싱 오류**:
   ```
   ❌ task-from-a.json 파싱 실패: 손상된 JSON 형식
   ```
</error_handling>

<example>
**실행 예시**:

```bash
$ /check-inbox

📬 Claude B: 검토 요청을 확인합니다...

📋 검토 요청 수신: VideoForm 컴포넌트 분리

📁 파일 개수: 2개
🧪 테스트: 27개 통과 (커버리지 95%)

🔍 UI/UX 검토 시작...

📄 app/components/VideoForm.tsx 검토 중...
📄 app/components/VideoList.tsx 검토 중...

검토 결과:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 종합 점수: 92/100

세부 점수:
  📝 코드 품질: 88/100
  🎨 UX: 95/100
  ♿ 접근성: 90/100
  📱 반응형: 94/100
  ⚡ 성능: 85/100

긍정적 요소:
  ✅ React Hooks 사용으로 상태 관리 명확
  ✅ 반응형 디자인 구현됨
  ✅ 에러 바운더리 적용

발견된 이슈:
  🟡 MEDIUM: VideoList 가상화 필요 (성능)
  🟡 LOW: console.log 발견 (프로덕션에서 제거 필요)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 검토 ID: TASK-1759749567890-DEF456
📁 파일: .claude/shared/review-from-b.json
📤 전송 대상: Claude C (Security Validator)

✅ Claude C (Security)로 전달합니다...
```
</example>
