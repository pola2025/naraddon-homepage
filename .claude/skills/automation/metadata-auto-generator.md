# Skill: Metadata Auto-Generator

## 🎯 목적
문서 작성 시 메타데이터를 자동으로 생성, 검증, 부여하는 실행 가능한 로직을 제공합니다.

## 📋 실행 시점
- `obsidian-auto-doc` Skill 실행 전 자동 호출
- 문서 저장 직전
- 사용자가 명시적으로 메타데이터 생성 요청 시

## 🔧 실행 워크플로우

### Phase 1: 컨텍스트 분석 (Context Analysis)
```javascript
/**
 * 현재 대화 컨텍스트에서 메타데이터 추출
 * @purpose 사용자가 수동 입력하지 않아도 자동으로 메타데이터 생성
 */
async function analyzeContext() {
  const context = {
    // 1. 프로젝트 식별
    project: detectProject(),

    // 2. 작업 유형 판단
    taskType: detectTaskType(),

    // 3. 관련 파일 분석
    relatedFiles: getModifiedFiles(),

    // 4. 대화 히스토리
    conversationHistory: getRecentMessages(),
  };

  return context;
}
```

**Claude 실행 단계:**
1. `.claude/obsidian-config.json`에서 프로젝트 매핑 정보 로드
2. 현재 작업 디렉토리와 비교하여 프로젝트 자동 감지
3. Git diff 또는 파일 변경 이력 확인
4. 대화 히스토리에서 키워드 추출 (에러, 기능명, 모듈명 등)

### Phase 2: 자동 추론 (Auto Inference)
```javascript
/**
 * 컨텍스트로부터 메타데이터 자동 생성
 * @decision 80% 이상 자동화, 20%만 사용자 입력
 */
function inferMetadata(context) {
  const metadata = {};

  // Level 1: 프로젝트 식별 (100% 자동)
  metadata.프로젝트 = context.project.name;
  metadata.프로젝트코드 = context.project.code;
  metadata.날짜 = new Date().toISOString().split('T')[0];

  // Level 2: 기능 모듈 추론 (70% 자동)
  metadata.기능모듈 = inferModuleFromFiles(context.relatedFiles);
  metadata.기능명칭 = inferFeatureFromConversation(context.conversationHistory);

  // Level 3: 문서 관계 추론 (50% 자동)
  metadata.선행작업 = findRelatedDocs('before', context);
  metadata.후속작업 = suggestNextSteps(context);
  metadata.영향범위 = inferImpactScope(context.relatedFiles);

  // Level 4: 상태 및 메트릭 (80% 자동)
  metadata.상태 = inferStatus(context.taskType);
  metadata.소요시간 = calculateDuration(context.conversationHistory);

  return metadata;
}
```

**Claude 실행 단계:**
1. **프로젝트 자동 감지:**
   - `cwd`가 `E:\Naraddon\homepage` → 프로젝트: "나라똔"
   - 프로젝트코드: "NRDN" (config에서 자동 매핑)

2. **기능 모듈 추론:**
   ```javascript
   // 파일 경로 → 모듈 매핑
   const MODULE_MAPPING = {
     'lib/auth/': '인증',
     'app/admin/': '관리자',
     'app/api/policy-news/': '정책뉴스',
     'components/ImageUploader': '파일관리',
   };

   // 수정된 파일들로부터 모듈 감지
   if (files.includes('lib/auth/authOptions.ts')) {
     기능모듈 = '관리자/인증';
   }
   ```

3. **작업 유형 감지:**
   ```javascript
   // 대화 키워드 → 카테고리 매핑
   const TYPE_KEYWORDS = {
     '트러블슈팅': ['에러', '오류', '버그', '403', '500', 'fix'],
     '기능개발': ['구현', '추가', '개발', 'feature', 'add'],
     '아키텍처': ['설계', '구조', '아키텍처', 'design'],
   };

   // 대화에서 가장 많이 나온 키워드로 판단
   카테고리 = detectMostFrequentKeywords(conversation, TYPE_KEYWORDS);
   ```

4. **선행작업 자동 연결:**
   ```javascript
   // Obsidian 문서 검색 (최근 7일)
   const recentDocs = await obsidian.search({
     project: metadata.프로젝트,
     tags: [metadata.기능모듈],
     since: '7d',
   });

   // Git log에서 이전 작업 찾기
   const gitHistory = await git.log('--oneline', '-10');

   // 대화에서 언급된 문서 찾기
   const mentionedDocs = extractWikiLinks(conversation);

   선행작업 = [...recentDocs, ...mentionedDocs];
   ```

### Phase 3: 카테고리별 특화 메타데이터 (Category-Specific)
```javascript
/**
 * 트러블슈팅 전용 메타데이터 자동 생성
 */
function generateTroubleshootingMetadata(context) {
  return {
    발생기능: inferFunctionFromError(context),
    에러타입: extractErrorType(context.conversationHistory),
    근본원인: inferRootCause(context),
    심각도: calculateSeverity(context),
    해결여부: isResolved(context) ? '해결완료' : '진행중',
  };
}

/**
 * 기능개발 전용 메타데이터 자동 생성
 */
function generateFeatureMetadata(context) {
  return {
    기능범주: inferFeatureCategory(context.relatedFiles),
    구현파일: context.relatedFiles.filter(f => !f.includes('test')),
    관련API: extractAPIEndpoints(context.relatedFiles),
    테스트완료: hasTestFiles(context.relatedFiles),
  };
}
```

**Claude 실행 단계:**
1. **트러블슈팅 메타데이터 (에러 발생 시):**
   ```typescript
   // 에러 메시지 파싱
   if (conversation.includes('403') || conversation.includes('Forbidden')) {
     에러타입 = '403에러';
   }

   // 발생 기능 추론
   if (files.includes('app/admin/')) {
     발생기능 = '관리자인증';
   }

   // 심각도 계산
   if (conversation.includes('프로덕션') || conversation.includes('배포')) {
     심각도 = 'Critical';
   } else if (conversation.includes('관리자') || conversation.includes('로그인')) {
     심각도 = 'High';
   }
   ```

2. **기능개발 메타데이터 (신규 기능 시):**
   ```typescript
   // API 엔드포인트 자동 추출
   const apiFiles = files.filter(f => f.includes('app/api/'));
   관련API = apiFiles.map(f => {
     // app/api/upload-image/route.ts → POST /api/upload-image
     const path = f.replace('app/api/', '/api/').replace('/route.ts', '');
     return `POST ${path}`;
   });

   // 테스트 파일 존재 확인
   const testFiles = files.filter(f => f.includes('.test.') || f.includes('.spec.'));
   테스트완료 = testFiles.length > 0;
   ```

### Phase 4: 태그 자동 생성 (Auto Tagging)
```javascript
/**
 * 3-level 중첩 태그 자동 생성
 * @context 프로젝트 → 기능 → 작업유형 계층 구조
 */
function generateTags(metadata) {
  const tags = [];

  // Level 1: 프로젝트 (필수)
  tags.push(`프로젝트/${metadata.프로젝트}`);

  // Level 2: 기능 모듈 (자동 중첩)
  if (metadata.기능모듈) {
    const modules = metadata.기능모듈.split('/');
    modules.forEach((module, index) => {
      const path = modules.slice(0, index + 1).join('/');
      tags.push(`기능/${path}`);
    });
  }

  // Level 3: 작업 유형 (카테고리 기반)
  const typeMapping = {
    '트러블슈팅': '작업유형/트러블슈팅/버그픽스',
    '기능개발': '작업유형/신규기능',
    '아키텍처': '작업유형/시스템설계',
  };
  tags.push(typeMapping[metadata.카테고리] || '작업유형/기타');

  // 추가 태그 (상태, 심각도 등)
  if (metadata.상태) tags.push(`상태/${metadata.상태}`);
  if (metadata.심각도) tags.push(`심각도/${metadata.심각도}`);

  // 기술 스택 자동 추론
  const techTags = inferTechTags(metadata.구현파일 || []);
  tags.push(...techTags);

  return tags;
}

/**
 * 파일 경로로부터 기술 스택 태그 추론
 */
function inferTechTags(files) {
  const techMap = {
    'next-auth': /lib\/auth\//,
    'MongoDB': /models\/|lib\/db\//,
    'Cloudflare-R2': /upload|storage/i,
    'Next.js': /app\/|components\//,
    'TypeScript': /\.tsx?$/,
  };

  const tags = [];
  for (const [tech, pattern] of Object.entries(techMap)) {
    if (files.some(f => pattern.test(f))) {
      tags.push(`기술/${tech}`);
    }
  }
  return tags;
}
```

**Claude 실행 단계:**
1. **프로젝트 태그 (자동):**
   - `#프로젝트/나라똔`

2. **기능 모듈 중첩 태그 (자동):**
   - 기능모듈: "관리자/인증/JWT"
   - 생성 태그:
     - `#기능/관리자`
     - `#기능/관리자/인증`
     - `#기능/관리자/인증/JWT`

3. **작업 유형 태그 (자동):**
   - 카테고리: "트러블슈팅" → `#작업유형/트러블슈팅/버그픽스`

4. **기술 스택 태그 (파일 기반 자동 추론):**
   - `lib/auth/authOptions.ts` → `#기술/NextAuth`
   - `app/api/*/route.ts` → `#기술/Next.js`
   - MongoDB 쿼리 코드 발견 → `#기술/MongoDB`

### Phase 5: 검증 및 보완 (Validation)
```javascript
/**
 * 메타데이터 완성도 검증
 * @returns 누락 필드 목록
 */
function validateMetadata(metadata, category) {
  const requiredFields = {
    '공통': ['title', '날짜', '프로젝트', '카테고리', 'tags'],
    '트러블슈팅': ['발생기능', '에러타입', '근본원인', '심각도', '해결여부'],
    '기능개발': ['기능범주', '상태', '구현파일'],
    '대화기록': ['대화유형', '참여자', '주요성과'],
  };

  const required = [
    ...requiredFields['공통'],
    ...(requiredFields[category] || []),
  ];

  const missing = required.filter(field => !metadata[field]);

  return {
    isValid: missing.length === 0,
    missing,
    completeness: ((required.length - missing.length) / required.length) * 100,
  };
}

/**
 * 품질 점수 계산
 */
function calculateQualityScore(metadata) {
  let score = 0;

  // 필수 필드 (40점)
  score += metadata.title ? 10 : 0;
  score += metadata.프로젝트 ? 10 : 0;
  score += metadata.tags?.length >= 3 ? 20 : metadata.tags?.length * 5;

  // 관계 필드 (30점)
  score += metadata.선행작업?.length > 0 ? 15 : 0;
  score += metadata.영향범위?.length > 0 ? 15 : 0;

  // 메트릭 필드 (30점)
  score += metadata.소요시간 ? 10 : 0;
  score += metadata.상태 ? 10 : 0;
  score += metadata.기능모듈 ? 10 : 0;

  return score;
}
```

**Claude 실행 단계:**
1. **자동 검증:**
   ```typescript
   const validation = validateMetadata(metadata, '트러블슈팅');

   if (!validation.isValid) {
     console.log(`⚠️ 메타데이터 완성도: ${validation.completeness}%`);
     console.log(`누락 필드: ${validation.missing.join(', ')}`);
   }
   ```

2. **사용자에게 누락 필드 요청 (자동화 불가능한 경우만):**
   ```markdown
   💡 자동 생성된 메타데이터 확인

   **자동 추론 완료 (80%):**
   - 프로젝트: 나라똔
   - 기능모듈: 관리자/인증
   - 에러타입: 403에러
   - 태그: #프로젝트/나라똔 #기능/관리자/인증 #트러블슈팅

   **사용자 입력 필요 (20%):**
   - [ ] 근본원인: [자동 추론: "JWT 콜백 미조회"] - 맞나요? (Y/수정)
   - [ ] 심각도: [자동 추론: "High"] - 맞나요? (Y/수정)
   ```

3. **품질 점수 계산:**
   ```typescript
   const qualityScore = calculateQualityScore(metadata);

   if (qualityScore < 70) {
     // 추가 필드 제안
     suggestAdditionalFields(metadata);
   }
   ```

### Phase 6: YAML 및 해시태그 생성 (Output Generation)
```javascript
/**
 * YAML Front Matter 생성
 */
function generateYAML(metadata) {
  const yaml = ['---'];

  // 필수 필드 (순서 유지)
  yaml.push(`title: ${metadata.title}`);
  yaml.push(`날짜: ${metadata.날짜}`);
  yaml.push(`프로젝트: ${metadata.프로젝트}`);
  yaml.push(`카테고리: ${metadata.카테고리}`);

  // 카테고리별 특수 필드
  if (metadata.발생기능) yaml.push(`발생기능: ${metadata.발생기능}`);
  if (metadata.에러타입) yaml.push(`에러타입: ${metadata.에러타입}`);
  if (metadata.기능범주) yaml.push(`기능범주: ${metadata.기능범주}`);

  // 관계 필드 (배열)
  if (metadata.선행작업?.length > 0) {
    yaml.push('선행작업:');
    metadata.선행작업.forEach(task => yaml.push(`  - ${task}`));
  }

  // 태그 (배열)
  yaml.push('tags:');
  metadata.tags.forEach(tag => yaml.push(`  - ${tag}`));

  yaml.push('---');
  return yaml.join('\n');
}

/**
 * 해시태그 라인 생성
 */
function generateHashtagLine(tags) {
  // 중첩 태그에서 해시태그 추출
  const hashtags = tags.map(tag => {
    // "프로젝트/나라똔" → "#나라똔"
    const parts = tag.split('/');
    return '#' + parts[parts.length - 1];
  });

  return hashtags.join(' ');
}
```

**Claude 실행 단계:**
1. **YAML 생성:**
   ```yaml
   ---
   title: 관리자 인증 403 에러 해결
   날짜: 2025-10-19
   프로젝트: 나라똔
   카테고리: 트러블슈팅
   발생기능: 관리자인증
   에러타입: 403에러
   근본원인: JWT콜백미조회
   심각도: High
   해결여부: 해결완료
   선행작업:
     - RBAC아키텍처
     - 사용자스키마
   영향범위:
     - 관리자전체
   tags:
     - 프로젝트/나라똔
     - 기능/관리자/인증
     - 작업유형/트러블슈팅/버그픽스
     - 상태/완료
     - 심각도/High
     - 기술/NextAuth
   ---
   ```

2. **해시태그 라인 생성:**
   ```markdown
   #나라똔 #관리자 #인증 #트러블슈팅 #버그픽스 #완료 #High #NextAuth
   ```

### Phase 7: Obsidian 저장 (Save to Obsidian)
```javascript
/**
 * Obsidian 문서로 저장
 */
async function saveToObsidian(metadata, content) {
  const config = loadObsidianConfig();
  const project = config.projects[metadata.프로젝트];

  // 파일명 생성
  const filename = generateFilename(metadata);

  // 전체 경로
  const filePath = `${config.vaultPath}/${project.path}/${metadata.카테고리}/${filename}`;

  // YAML + 해시태그 + 본문 결합
  const fullContent = [
    generateYAML(metadata),
    '',
    generateHashtagLine(metadata.tags),
    '',
    content,
    '',
    generateInlineMetadata(metadata),
  ].join('\n');

  // Obsidian API 호출
  await obsidian.api.createFile(filePath, fullContent);

  // 인덱스 업데이트
  await updateObsidianIndex(metadata, filePath);
}
```

**Claude 실행 단계:**
1. **파일명 생성:**
   ```typescript
   // 카테고리별 네이밍 규칙
   const namingPatterns = {
     '트러블슈팅': '{날짜}-{발생기능}-{에러타입}-{근본원인}.md',
     '기능개발': '{날짜}-{기능명칭}-{세부설명}.md',
     '대화기록': '{날짜}-{대화유형}-{주제}.md',
   };

   filename = namingPatterns[metadata.카테고리]
     .replace('{날짜}', metadata.날짜)
     .replace('{발생기능}', metadata.발생기능)
     // ...
   ```

2. **인덱스 업데이트:**
   ```javascript
   // .claude/obsidian-index.json 업데이트
   const index = loadIndex();

   // 키워드 추출
   const keywords = extractKeywords(metadata);
   keywords.forEach(keyword => {
     if (!index.keywords[keyword]) {
       index.keywords[keyword] = [];
     }
     index.keywords[keyword].push(filePath);
   });

   saveIndex(index);
   ```

## 🎬 Claude 실행 예시

### 예시 1: 트러블슈팅 완료 시
```markdown
**사용자**: "관리자 페이지 403 에러 해결했어. JWT 콜백에서 role 조회 추가했어."

**Claude 내부 실행:**
1. analyzeContext() 호출
   - 프로젝트: "나라똔" (cwd 기반)
   - 작업 유형: "트러블슈팅" (키워드 "에러", "해결")
   - 관련 파일: ["lib/auth/authOptions.ts"]

2. inferMetadata() 호출
   - 발생기능: "관리자인증" (파일 경로에서 "admin" 감지)
   - 에러타입: "403에러" (대화에서 추출)
   - 근본원인: "JWT콜백미조회" (대화 + 파일 diff 분석)
   - 심각도: "High" (관리자 기능 + 인증)

3. generateTags() 호출
   - #프로젝트/나라똔
   - #기능/관리자/인증
   - #작업유형/트러블슈팅/버그픽스
   - #상태/완료
   - #심각도/High
   - #기술/NextAuth

4. validateMetadata() 호출
   - 완성도: 95%
   - 누락: ["소요시간"]

5. 사용자에게 확인 요청:
   "💡 자동 생성된 메타데이터:
   - 발생기능: 관리자인증
   - 에러타입: 403에러
   - 근본원인: JWT콜백미조회
   - 심각도: High

   소요시간을 입력해주세요 (예: 2h30m) 또는 엔터로 건너뛰기:"

6. saveToObsidian() 호출
   - 파일: F:\obsidian\Pola\Projects\나라똔\05-트러블슈팅\2025-10-19-관리자인증-403에러-JWT콜백미조회.md
```

### 예시 2: 기능 개발 완료 시
```markdown
**사용자**: "이미지 업로드 기능 구현 완료. Cloudflare R2 연동했어."

**Claude 내부 실행:**
1. analyzeContext()
   - 프로젝트: "나라똔"
   - 작업 유형: "기능개발" (키워드 "구현", "완료")
   - 관련 파일: [
       "components/ImageUploader.tsx",
       "app/api/upload-image/route.ts"
     ]

2. inferMetadata()
   - 기능범주: "심사관관리" (파일 경로에서 추론)
   - 기능명칭: "이미지 업로드 UX 개선"
   - 구현파일: (관련 파일 목록)
   - 관련API: ["POST /api/upload-image"]
   - 테스트완료: false (테스트 파일 없음)

3. generateTags()
   - #프로젝트/나라똔
   - #기능/심사관/이미지업로드
   - #기능/파일관리
   - #작업유형/신규기능
   - #상태/완료
   - #기술/Cloudflare-R2
   - #기술/Next.js

4. 품질 점수: 75/100
   - 제안: "테스트 파일 추가하면 점수가 90점으로 올라갑니다."
```

## ✅ 사용자 인터페이스

Claude가 사용자에게 보여주는 메시지 형식:

```markdown
📊 **메타데이터 자동 생성 완료**

**자동 추론 (90%):**
✅ 프로젝트: 나라똔
✅ 기능모듈: 관리자/인증
✅ 에러타입: 403에러
✅ 심각도: High
✅ 태그: 8개 자동 생성

**확인 필요 (10%):**
❓ 근본원인: "JWT 콜백 미조회" (맞나요? Y/수정)
❓ 소요시간: (예: 2h30m 또는 엔터)

**품질 점수: 85/100** 🎯
💡 선행작업 추가 시 95점

계속 진행하시겠습니까? (Y/n)
```

## 🔗 연동 Skills
- `obsidian-auto-doc.md`: 본 Skill 실행 후 문서 저장
- `token-efficient-architecture.md`: 생성된 메타데이터를 인덱스에 추가
- `super-memory-obsidian.md`: 메타데이터 기반 컨텍스트 로딩

## 📝 설정
`.claude/obsidian-config.json`에서 프로젝트 매핑, 모듈 매핑 정의 필요

## 🎯 성공 기준
- [ ] 필수 메타데이터 80% 이상 자동 생성
- [ ] 태그 100% 자동 생성
- [ ] 품질 점수 70점 이상
- [ ] 사용자 입력 20% 이하
- [ ] 검증 통과율 95% 이상
