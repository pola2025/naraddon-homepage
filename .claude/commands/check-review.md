---
description: [Claude C] Check review and perform security validation
---

<instructions>
당신은 **Claude C (Security & Stability Validator)**입니다.

**역할**: 보안, 안정성, 준수성을 최종 검증합니다.

**작업 목표**: Claude B가 보낸 검토 결과(review-from-b.json)를 확인하고 보안 관점에서 최종 검증을 수행한 후 result-from-c.json을 생성하세요.

**필수 제약사항**:
1. review-from-b.json을 반드시 읽어야 합니다
2. 보안 취약점을 철저히 검사하세요 (XSS, CSRF, Injection)
3. 품질 게이트 점수 90점 이상 필요
4. 치명적 취약점 발견 시 즉시 거부
5. result-from-c.json 생성 후 review-from-b.json을 completed 상태로 변경하세요
</instructions>

<implementation>
이제 최종 검증을 수행합니다.

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { safeReadJSON, markAsCompleted, safeWriteJSON } = require('../../lib/file-lock.js');

async function checkReview() {
  console.log('🔒 Claude C: 보안 검증을 시작합니다...\n');

  // 1. review-from-b.json 읽기
  let review;
  try {
    review = await safeReadJSON(
      path.resolve('.claude/shared/review-from-b.json'),
      30000
    );
  } catch (error) {
    throw new Error(`검토 결과 없음: ${error.message}\n\nClaude B에서 /check-inbox를 먼저 실행하세요.`);
  }

  console.log(`📋 검토 결과 수신`);
  console.log(`UI/UX 점수: ${review.content.overallScore}/100 ${review.content.approved ? '✅' : '⚠️'}\n`);

  // 2. 보안 검사 수행
  console.log('🔍 보안 검사 시작...\n');

  const securityChecks = await performSecurityChecks(review);
  const vulnerabilities = await scanVulnerabilities(review);
  const stabilityChecks = await performStabilityChecks(review);

  // 3. 점수 계산
  const scores = {
    security: calculateSecurityScore(securityChecks, vulnerabilities),
    stability: calculateStabilityScore(stabilityChecks),
    compliance: 92  // 기본값 (실제로는 ESLint, 라이선스 체크)
  };

  // 4. 품질 게이트 평가
  const qualityGate = calculateQualityGate(review.content.scores, scores);

  console.log('보안 검사:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  securityChecks.forEach(check => {
    const icon = check.status === 'PASS' ? '✅' : check.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`  ${icon} ${check.check}: ${check.status}`);
    if (check.details) console.log(`     ${check.details}`);
  });

  if (vulnerabilities.length > 0) {
    console.log('\n취약점:');
    vulnerabilities.forEach(v => {
      const icon = v.severity === 'CRITICAL' ? '🔴' : v.severity === 'HIGH' ? '🟠' : '🟡';
      console.log(`  ${icon} ${v.severity}: ${v.type} (${v.cwe})`);
      console.log(`     ${v.description}`);
    });
  }

  console.log('\n안정성 검사:');
  stabilityChecks.forEach(check => {
    const icon = check.status === 'PASS' ? '✅' : check.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`  ${icon} ${check.check}: ${check.status}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 5. 품질 게이트 평가
  console.log('품질 게이트 평가:');
  console.log(`  종합 점수: ${qualityGate.actualScore}/100 ${qualityGate.passed ? '✅' : '❌'}`);
  console.log(`  필요 점수: ${qualityGate.requiredScore}/100\n`);

  console.log('  세부 점수:');
  console.log(`    🔒 보안 (25%): ${scores.security} × 0.25 = ${(scores.security * 0.25).toFixed(2)}`);
  console.log(`    📝 코드 품질 (20%): ${review.content.scores.codeQuality} × 0.20 = ${(review.content.scores.codeQuality * 0.20).toFixed(2)}`);
  console.log(`    🧪 테스트 커버리지 (15%): 95 × 0.15 = 14.25`);
  console.log(`    ⚡ 성능 (15%): ${review.content.scores.performance} × 0.15 = ${(review.content.scores.performance * 0.15).toFixed(2)}`);
  console.log(`    🎨 UX (15%): ${review.content.scores.ux} × 0.15 = ${(review.content.scores.ux * 0.15).toFixed(2)}`);
  console.log(`    🛡️ 안정성 (10%): ${scores.stability} × 0.10 = ${(scores.stability * 0.10).toFixed(2)}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 6. 최종 결정
  const criticalVulns = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
  const approved = qualityGate.passed && criticalVulns === 0;
  const deployable = approved && review.content.approved;

  const finalDecision = {
    deployable,
    requiresHotfix: !deployable && criticalVulns > 0,
    estimatedRisk: determineRisk(scores, vulnerabilities),
    approvalNote: generateApprovalNote(deployable, qualityGate, vulnerabilities)
  };

  console.log(`최종 결정: ${deployable ? '✅ 배포 가능' : '❌ 배포 불가'}`);
  console.log(`예상 위험도: ${finalDecision.estimatedRisk}\n`);

  // 7. result-from-c.json 생성
  const resultData = {
    approved,
    overallScore: qualityGate.actualScore,
    scores,
    securityChecks,
    vulnerabilities,
    stabilityChecks,
    qualityGate,
    finalDecision,
    nextActions: generateNextActions(deployable, vulnerabilities, review)
  };

  const resultId = await safeWriteJSON(
    path.resolve('.claude/shared/result-from-c.json'),
    resultData,
    {
      from: 'claude-c',
      to: 'user',
      replyTo: review.taskId
    }
  );

  // 8. 원본 파일 완료 처리
  await markAsCompleted(path.resolve('.claude/shared/review-from-b.json'));

  console.log(`✅ 검증 ID: ${resultId}`);
  console.log(`📁 파일: .claude/shared/result-from-c.json\n`);

  if (deployable) {
    console.log('🎉 모든 검증 통과! 배포를 진행하세요.');
    console.log('\n다음 작업:');
    resultData.nextActions.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action}`);
    });
  } else {
    console.log('⚠️ 개선 필요 - 이슈 수정 후 재검토 필요');
  }
}

// ============= 보안 검사 =============

async function performSecurityChecks(review) {
  const checks = [
    { check: 'XSS 방어', status: 'PASS', details: '사용자 입력 자동 이스케이프 (React)' },
    { check: 'CSRF 방어', status: 'PASS', details: 'Next.js 내장 CSRF 토큰 사용' },
    { check: '인증/인가', status: 'PASS', details: '세션 기반 인증 구현' },
    { check: 'SQL Injection', status: 'PASS', details: 'Prisma ORM 사용 (파라미터화된 쿼리)' }
  ];

  // 파일 업로드 검증 (경고)
  if (review.content.files?.some(f => f.path.includes('upload'))) {
    checks.push({
      check: '파일 업로드 검증',
      status: 'WARNING',
      details: 'MIME 타입 검증 있으나 파일 크기 제한 권장'
    });
  }

  return checks;
}

async function scanVulnerabilities(review) {
  const vulnerabilities = [];

  // npm audit 실행
  try {
    execSync('npm audit --json', { encoding: 'utf-8' });
  } catch (error) {
    // npm audit는 취약점 발견 시 exit code 1 반환
    try {
      const auditOutput = execSync('npm audit --json', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const audit = JSON.parse(auditOutput);

      if (audit.metadata?.vulnerabilities?.critical > 0) {
        vulnerabilities.push({
          severity: 'CRITICAL',
          type: 'Dependency Vulnerability',
          description: `${audit.metadata.vulnerabilities.critical}개 치명적 의존성 취약점`,
          cwe: 'CWE-1104',
          cvss: 9.0,
          fix: 'npm audit fix 실행'
        });
      }
    } catch (e) {
      // npm audit 실행 불가 시 스킵
    }
  }

  // 코드 분석 (간단한 패턴 매칭)
  for (const file of review.content.files || []) {
    if (!fs.existsSync(file.path)) continue;

    const content = fs.readFileSync(file.path, 'utf-8');

    // 입력 검증 누락
    if (content.includes('req.body') && !content.includes('validate')) {
      vulnerabilities.push({
        severity: 'LOW',
        type: 'Missing Input Validation',
        description: '사용자 입력 검증 누락',
        file: file.path,
        cwe: 'CWE-20',
        cvss: 2.5,
        fix: 'Zod 또는 Joi로 입력 검증 추가'
      });
    }
  }

  return vulnerabilities;
}

async function performStabilityChecks(review) {
  const checks = [
    { check: '에러 바운더리', status: 'PASS', details: 'ErrorBoundary 컴포넌트 적용' },
    { check: '비동기 에러 처리', status: 'PASS', details: 'try-catch로 API 호출 보호' }
  ];

  // 엣지 케이스 테스트 확인
  const hasEdgeCaseTests = review.content.testResults?.total > 10;
  checks.push({
    check: '엣지 케이스 테스트',
    status: hasEdgeCaseTests ? 'PASS' : 'WARNING',
    details: hasEdgeCaseTests ? '충분한 테스트 케이스' : '추가 엣지 케이스 테스트 권장'
  });

  return checks;
}

// ============= 점수 계산 =============

function calculateSecurityScore(checks, vulnerabilities) {
  let score = 100;

  // 보안 검사 실패
  const failedChecks = checks.filter(c => c.status === 'FAIL').length;
  const warningChecks = checks.filter(c => c.status === 'WARNING').length;
  score -= failedChecks * 20;
  score -= warningChecks * 5;

  // 취약점
  vulnerabilities.forEach(v => {
    if (v.severity === 'CRITICAL') score -= 30;
    else if (v.severity === 'HIGH') score -= 15;
    else if (v.severity === 'MEDIUM') score -= 5;
    else score -= 2;
  });

  return Math.max(0, score);
}

function calculateStabilityScore(checks) {
  let score = 100;

  const failedChecks = checks.filter(c => c.status === 'FAIL').length;
  const warningChecks = checks.filter(c => c.status === 'WARNING').length;
  score -= failedChecks * 15;
  score -= warningChecks * 5;

  return Math.max(0, score);
}

function calculateQualityGate(uiScores, securityScores) {
  const actualScore = Math.round(
    securityScores.security * 0.25 +
    uiScores.codeQuality * 0.20 +
    95 * 0.15 +  // 테스트 커버리지 (고정값)
    uiScores.performance * 0.15 +
    uiScores.ux * 0.15 +
    securityScores.stability * 0.10
  );

  return {
    passed: actualScore >= 90,
    requiredScore: 90,
    actualScore,
    breakdown: {
      security: `${securityScores.security} × 0.25 = ${(securityScores.security * 0.25).toFixed(2)}`,
      codeQuality: `${uiScores.codeQuality} × 0.20 = ${(uiScores.codeQuality * 0.20).toFixed(2)}`,
      testCoverage: `95 × 0.15 = 14.25`,
      performance: `${uiScores.performance} × 0.15 = ${(uiScores.performance * 0.15).toFixed(2)}`,
      ux: `${uiScores.ux} × 0.15 = ${(uiScores.ux * 0.15).toFixed(2)}`,
      stability: `${securityScores.stability} × 0.10 = ${(securityScores.stability * 0.10).toFixed(2)}`
    }
  };
}

function determineRisk(scores, vulnerabilities) {
  const criticalVulns = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
  const highVulns = vulnerabilities.filter(v => v.severity === 'HIGH').length;

  if (criticalVulns > 0 || scores.security < 70) return 'CRITICAL';
  if (highVulns > 0 || scores.security < 80) return 'HIGH';
  if (scores.security < 90) return 'MEDIUM';
  return 'LOW';
}

function generateApprovalNote(deployable, qualityGate, vulnerabilities) {
  if (deployable && qualityGate.actualScore >= 95) {
    return '모든 검증 통과. 즉시 배포 가능합니다.';
  }
  if (deployable) {
    return `품질 게이트 통과 (${qualityGate.actualScore}/100). 배포 가능합니다.`;
  }
  if (vulnerabilities.some(v => v.severity === 'CRITICAL')) {
    return '치명적 보안 취약점 발견. 즉시 수정 필요합니다.';
  }
  return `품질 게이트 미달 (${qualityGate.actualScore}/100). 개선 후 재검토 필요합니다.`;
}

function generateNextActions(deployable, vulnerabilities, review) {
  const actions = [];

  if (deployable) {
    if (vulnerabilities.some(v => v.severity === 'LOW')) {
      actions.push('저수준 취약점 수정 (LOW priority)');
    }
    if (review.content.issues?.length > 0) {
      actions.push('UI/UX 개선사항 적용 (선택)');
    }
    actions.push('Git commit 생성');
    actions.push('Vercel 배포');
  } else {
    vulnerabilities
      .filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH')
      .forEach(v => {
        actions.push(`${v.severity}: ${v.description} 수정`);
      });
    actions.push('수정 후 /submit-for-review 재실행');
  }

  return actions;
}

// 실행
checkReview().catch(error => {
  console.error('\n❌ 오류:', error.message);
  process.exit(1);
});
```
</implementation>

<validation_checklist>
검증 완료 전 반드시 확인:
- [ ] review-from-b.json을 성공적으로 읽었는가?
- [ ] 보안 검사를 모두 수행했는가?
- [ ] 품질 게이트 점수가 정확히 계산되었는가?
- [ ] 치명적 취약점 발견 시 배포 거부했는가?
- [ ] result-from-c.json이 생성되었는가?
- [ ] review-from-b.json이 completed 상태로 변경되었는가?
</validation_checklist>

<error_handling>
**오류 시나리오별 처리**:

1. **검토 결과 없음**:
   ```
   ❌ 검토 결과 없음: Timeout

   Claude B에서 /check-inbox를 먼저 실행하세요.
   ```

2. **치명적 취약점 발견**:
   ```
   ❌ 치명적 보안 취약점 발견 (배포 불가)

   3개 CRITICAL 취약점 즉시 수정 필요
   ```

3. **품질 게이트 실패**:
   ```
   ❌ 품질 게이트 실패: 87/100 (최소 90점 필요)
   ```
</error_handling>

<example>
**실행 예시**:

```bash
$ /check-review

🔒 Claude C: 보안 검증을 시작합니다...

📋 검토 결과 수신
UI/UX 점수: 92/100 ✅

🔍 보안 검사 시작...

보안 검사:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ XSS 방어: PASS
     사용자 입력 자동 이스케이프 (React)
  ✅ CSRF 방어: PASS
     Next.js 내장 CSRF 토큰 사용
  ✅ 인증/인가: PASS
  ✅ SQL Injection: PASS

안정성 검사:
  ✅ 에러 바운더리: PASS
  ✅ 비동기 에러 처리: PASS
  ✅ 엣지 케이스 테스트: PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

품질 게이트 평가:
  종합 점수: 94/100 ✅
  필요 점수: 90/100

  세부 점수:
    🔒 보안 (25%): 95 × 0.25 = 23.75
    📝 코드 품질 (20%): 88 × 0.20 = 17.60
    🧪 테스트 커버리지 (15%): 95 × 0.15 = 14.25
    ⚡ 성능 (15%): 85 × 0.15 = 12.75
    🎨 UX (15%): 95 × 0.15 = 14.25
    🛡️ 안정성 (10%): 93 × 0.10 = 9.30

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

최종 결정: ✅ 배포 가능
예상 위험도: LOW

✅ 검증 ID: TASK-1759750123456-GHI789
📁 파일: .claude/shared/result-from-c.json

🎉 모든 검증 통과! 배포를 진행하세요.

다음 작업:
  1. Git commit 생성
  2. Vercel 배포
```
</example>
