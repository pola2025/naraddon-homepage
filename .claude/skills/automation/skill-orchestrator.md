# Skill 오케스트레이터

**카테고리**: Automation
**목적**: 사용자 요청에 따라 적절한 Skill을 자동으로 선택하고 순차 실행

## 🎯 핵심 개념

### 오케스트레이터란?
```markdown
# 음악 지휘자(Orchestrator)처럼 여러 Skill을 조화롭게 지휘

사용자 요청 →
  ↓
오케스트레이터 (지휘자)
  ├→ Skill 1 실행 (바이올린)
  ├→ Skill 2 실행 (첼로)
  └→ Skill 3 실행 (피아노)
  ↓
통합된 결과 (아름다운 음악)
```

## 🏗️ 아키텍처

### 1. 요청 분석 (Request Analysis)

```javascript
/**
 * 사용자 요청 분석
 */
function analyzeRequest(userRequest) {
  const analysis = {
    type: null,          // 요청 유형
    complexity: null,    // 복잡도
    requiredSkills: [],  // 필요한 Skill 목록
    priority: null,      // 우선순위
  };

  // 키워드 기반 분류
  if (hasKeywords(userRequest, ['추가', '구현', '만들어', '개발'])) {
    analysis.type = 'feature-development';
  } else if (hasKeywords(userRequest, ['에러', '오류', '안돼', '문제'])) {
    analysis.type = 'troubleshooting';
  } else if (hasKeywords(userRequest, ['어떻게', '했었지', '찾아줘', '알려줘'])) {
    analysis.type = 'documentation-search';
  } else if (hasKeywords(userRequest, ['수정', '고쳐', '변경'])) {
    analysis.type = 'modification';
  }

  return analysis;
}
```

### 2. Skill 선택 (Skill Selection)

```javascript
/**
 * 요청 유형별 Skill 매핑
 */
const SKILL_WORKFLOWS = {
  'feature-development': {
    pre: [
      'security/prevent-leak',
      'development/backup/auto-backup',
    ],
    during: [
      // 사용자 작업
    ],
    post: [
      'development/code-review/request-result-validator',  // ✨ 추가: 요청-결과 검증
      'development/code-review/security-check',
      'automation/metadata-auto-generator',                // ✨ 추가: 메타데이터 자동 생성
      'development/documentation/obsidian-auto-doc',
    ],
    optional: [
      'development/optimization/context-optimizer',
    ],
  },

  'troubleshooting': {
    pre: [
      'development/debugging/error-analysis',
      'development/backup/auto-backup',
    ],
    during: [
      // 문제 해결
    ],
    post: [
      'development/code-review/request-result-validator',  // ✨ 추가: 요청-결과 검증
      'automation/metadata-auto-generator',                // ✨ 추가: 메타데이터 자동 생성
      'development/documentation/obsidian-auto-doc',
    ],
  },

  'documentation-search': {
    pre: [
      'development/optimization/token-efficient-architecture',
    ],
    during: [
      // 문서 검색
    ],
    post: [
      'development/documentation/super-memory-obsidian',
      'automation/metadata-auto-generator',                // ✨ 추가: 검색 결과도 문서화
    ],
  },

  'modification': {
    pre: [
      'security/prevent-leak',
      'development/backup/auto-backup',
    ],
    during: [
      // 수정 작업
    ],
    post: [
      'development/code-review/request-result-validator',  // ✨ 추가: 요청-결과 검증
      'development/code-review/security-check',
      'automation/metadata-auto-generator',                // ✨ 추가: 메타데이터 자동 생성
      'development/documentation/obsidian-auto-doc',
    ],
  },
};
```

### 3. 순차 실행 (Sequential Execution)

```javascript
/**
 * Skill 오케스트레이터 메인 로직
 */
class SkillOrchestrator {
  async execute(userRequest) {
    // 1. 요청 분석
    const analysis = analyzeRequest(userRequest);
    console.log(`📋 요청 유형: ${analysis.type}`);

    // 2. Skill 워크플로우 로드
    const workflow = SKILL_WORKFLOWS[analysis.type];
    if (!workflow) {
      console.log('⚠️  알 수 없는 요청 유형 - 기본 워크플로우 사용');
      return await this.executeBasicWorkflow(userRequest);
    }

    console.log(`🎯 워크플로우: ${analysis.type}`);

    // 3. Pre Skill 실행 (작업 전)
    await this.executeSkills(workflow.pre, 'PRE');

    // 4. 메인 작업 (사용자 요청 처리)
    const mainResult = await this.executeMainTask(userRequest);

    // 5. Post Skill 실행 (작업 후)
    await this.executeSkills(workflow.post, 'POST');

    // 6. 결과 통합
    return {
      request: userRequest,
      type: analysis.type,
      mainResult,
      skillsExecuted: [...workflow.pre, ...workflow.post],
    };
  }

  async executeSkills(skillList, phase) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`${phase} SKILLS 실행 중...`);
    console.log(`${'='.repeat(50)}\n`);

    for (const skillPath of skillList) {
      await this.executeSkill(skillPath);
    }
  }

  async executeSkill(skillPath) {
    const skillName = skillPath.split('/').pop();
    console.log(`🔧 실행: ${skillName}`);

    // Skill 파일 로드
    const skillContent = await readFile(`.claude/skills/${skillPath}.md`);

    // Skill 로직 실행
    // (실제로는 Skill 파일의 지침에 따라 작업 수행)

    console.log(`✅ 완료: ${skillName}\n`);
  }
}
```

## 📊 실전 예시

### 예시 1: 기능 개발 요청

```markdown
사용자: "정책뉴스 검색 기능 추가해줘"

Claude (오케스트레이터):

📋 요청 분석 중...
   유형: feature-development
   복잡도: medium
   필요 Skill: 4개

==================================================
PRE SKILLS 실행 중...
==================================================

🔧 실행: prevent-leak
   ✅ 보안 체크 통과 - 민감 정보 없음

🔧 실행: auto-backup
   ✅ Git stash 생성: "Claude 백업: 검색 기능 - 20251019_1530"
   ✅ 백업 파일 생성: app/api/policy-news/search/route.ts.backup

==================================================
MAIN TASK: 기능 구현
==================================================

[검색 API 구현...]
[프론트엔드 컴포넌트 작성...]
[테스트 코드 작성...]

✅ 구현 완료!

==================================================
POST SKILLS 실행 중...
==================================================

🔧 실행: request-result-validator
   📊 요청-결과 검증 중...

   ✅ 요청사항 반영도: 95/100

   명시적 요청:
   ✅ 정책뉴스 검색 기능 추가 - 완료 (100%)

   암묵적 요청:
   ✅ API 엔드포인트 생성 - 완료
   ✅ 테스트 작성 - 완료
   ⚠️ 검색 결과 페이징 - 부분 완료 (80%)

   제약조건 검증:
   ✅ 보안 규칙 준수
   ✅ 테스트 존재
   ✅ 백업 완료

   품질 검증:
   ✅ TypeScript 에러 없음
   ✅ 주석 커버리지 85%

   📈 종합 점수: 95/100 ✅ 통과

🔧 실행: security-check
   ✅ 하드코딩 없음
   ✅ 환경변수 사용 확인
   ✅ SQL Injection 방지 확인

🔧 실행: metadata-auto-generator
   📊 메타데이터 자동 생성 완료

   자동 추론 (90%):
   ✅ 프로젝트: 나라똔
   ✅ 기능모듈: 정책뉴스/검색
   ✅ 태그: 12개 자동 생성

   품질 점수: 92/100 🎯

🔧 실행: obsidian-auto-doc
   📝 문서 생성 중...
   ✅ 저장: Projects/나라똔/03-기능개발/2025-10-19-정책뉴스검색기능.md
   ✅ 대화 기록: Projects/나라똔/99-대화기록/2025-10-19-검색기능-구현과정.md
   ✅ 태그: #나라똔 #정책뉴스 #신규기능 #검색

==================================================
✅ 전체 작업 완료!
==================================================

실행된 Skill: 6개
요청-결과 매칭: 95/100 ✅
메타데이터 품질: 92/100 ✅
소요 시간: 8분
저장된 문서: 2개
```

### 예시 2: 트러블슈팅 요청

```markdown
사용자: "관리자 페이지에서 403 에러가 나요"

Claude (오케스트레이터):

📋 요청 분석 중...
   유형: troubleshooting
   복잡도: high
   필요 Skill: 3개

==================================================
PRE SKILLS 실행 중...
==================================================

🔧 실행: error-analysis
   🔍 에러 분석 중...
   ✅ 에러 타입: 403 Forbidden
   ✅ 발생 위치: app/admin 경로
   ✅ 예상 원인: 권한 문제

🔧 실행: auto-backup
   ✅ Git stash 생성: "Claude 백업: 403 에러 수정 - 20251019_1430"

==================================================
MAIN TASK: 문제 해결
==================================================

[세션 확인...]
[JWT 콜백 분석...]
[DB role 조회 로직 추가...]

✅ 해결 완료!

==================================================
POST SKILLS 실행 중...
==================================================

🔧 실행: obsidian-auto-doc
   📝 트러블슈팅 문서 생성 중...
   ✅ 저장: Projects/나라똔/05-트러블슈팅/2025-10-19-관리자인증-403에러-JWT콜백미조회.md
   ✅ 메타데이터:
      - 발생기능: 관리자인증
      - 에러타입: 403에러
      - 근본원인: JWT콜백미조회
      - 해결여부: 해결완료
   ✅ 태그: #나라똔 #인증 #관리자 #트러블슈팅 #403에러 #해결완료

==================================================
✅ 전체 작업 완료!
==================================================

실행된 Skill: 3개
소요 시간: 2시간 15분
저장된 문서: 1개
```

### 예시 3: 문서 검색 요청

```markdown
사용자: "JWT 인증 어떻게 구현했었지?"

Claude (오케스트레이터):

📋 요청 분석 중...
   유형: documentation-search
   복잡도: low
   필요 Skill: 2개

==================================================
PRE SKILLS 실행 중...
==================================================

🔧 실행: token-efficient-architecture
   📊 토큰 최적화 전략 적용
   ✅ 인덱스 로드: 500 토큰
   ✅ 키워드 추출: ["JWT", "인증", "구현"]

==================================================
MAIN TASK: 문서 검색
==================================================

📖 인덱스 검색 중...
   ✅ 관련 문서 3개 발견

📝 검색 결과 (요약만):

1. [[2025-09-15-JWT인증구현]]
   날짜: 2025-09-15
   요약: NextAuth + JWT로 인증 구현. lib/auth/authOptions.ts에서 JWT 콜백 정의.
   태그: #인증 #JWT #NextAuth

2. [[2025-10-19-관리자Role-403에러]]
   날짜: 2025-10-19
   요약: JWT 콜백에서 role 미조회 문제. DB에서 직접 role 조회로 해결.
   태그: #인증 #JWT #트러블슈팅

3. [[2025-10-10-세션만료-자동갱신]]
   날짜: 2025-10-10
   요약: JWT 만료 시간 1시간. 자동 갱신 로직 추가.
   태그: #인증 #JWT #세션

💬 더 자세한 내용이 필요하신가요?
[1-3 번호] 또는 [전체]

==================================================
토큰 사용량
==================================================
인덱스 로드: 500 토큰
검색: 100 토큰
요약 생성: 300 토큰
총: 900 토큰 (vs 전체 로드 시 155,000 토큰)
절약: 99.4%
```

## 🔄 적응형 실행 (Adaptive Execution)

### 조건부 Skill 실행

```javascript
/**
 * 상황에 따라 Skill 추가/제외
 */
class AdaptiveOrchestrator extends SkillOrchestrator {
  async adaptWorkflow(workflow, context) {
    // 1. 보안 수준에 따라 추가 Skill 실행
    if (context.securityLevel === 'high') {
      workflow.post.push('security/advanced-audit');
    }

    // 2. 복잡도에 따라 백업 전략 변경
    if (context.complexity === 'high') {
      workflow.pre.push('development/backup/database-backup');
    }

    // 3. 토큰 사용량에 따라 최적화 전략 조정
    if (context.tokenUsage > 10000) {
      workflow.pre.unshift('development/optimization/aggressive-caching');
    }

    // 4. 에러 발생 시 자동 복구 Skill 추가
    if (context.hasError) {
      workflow.post.push('development/backup/auto-restore');
    }

    return workflow;
  }
}
```

## 📊 Skill 실행 통계

### 실행 로그 (.claude/skill-execution-log.json)
```json
{
  "sessions": [
    {
      "sessionId": "20251019-1530",
      "request": "정책뉴스 검색 기능 추가",
      "type": "feature-development",
      "skillsExecuted": [
        {
          "name": "prevent-leak",
          "duration": "0.5s",
          "result": "success"
        },
        {
          "name": "auto-backup",
          "duration": "1.2s",
          "result": "success"
        },
        {
          "name": "security-check",
          "duration": "2.1s",
          "result": "success"
        },
        {
          "name": "obsidian-auto-doc",
          "duration": "3.5s",
          "result": "success"
        }
      ],
      "totalDuration": "8m 15s",
      "tokenUsage": 2500,
      "documentsCreated": 2
    }
  ],
  "statistics": {
    "totalSessions": 45,
    "averageTokenUsage": 3200,
    "tokenSavings": "95%",
    "mostUsedSkill": "obsidian-auto-doc",
    "successRate": "98%"
  }
}
```

## 🎯 사용자 맞춤형 워크플로우

### 개인 설정 (.claude/user-preferences.json)
```json
{
  "workflowPreferences": {
    "alwaysBackup": true,
    "autoDocument": true,
    "aggressiveTokenOptimization": false,
    "skipOptionalSkills": false
  },
  "customWorkflows": {
    "quick-fix": {
      "pre": ["development/backup/auto-backup"],
      "post": []
    },
    "production-deploy": {
      "pre": [
        "security/prevent-leak",
        "development/backup/auto-backup",
        "development/code-review/security-check"
      ],
      "post": [
        "development/documentation/obsidian-auto-doc",
        "admin/dashboard-workflow"
      ]
    }
  }
}
```

---

**이 오케스트레이터로 모든 작업이 자동화됩니다.**
**Skill을 수동으로 선택할 필요가 없습니다.**
