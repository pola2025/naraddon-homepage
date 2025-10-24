# 메타태그 분류 및 부여 규칙 Skill

**카테고리**: Development - Documentation
**목적**: 모든 문서에 체계적인 메타데이터를 자동으로 부여하여 검색 성능 극대화

## 🎯 메타태그 = 검색의 핵심

### Before (태그만 사용)
```yaml
---
tags: [나라똔, 트러블슈팅]
---
```
→ 검색: 느림, 불명확, 관계 없음

### After (메타태그 시스템)
```yaml
---
프로젝트: 나라똔
기능모듈: 관리자/인증
선행작업: [RBAC아키텍처]
영향범위: [관리자전체]
우선순위: High
tags:
  - 프로젝트/나라똔
  - 기능모듈/관리자/인증
  - 상태/완료
---
```
→ 검색: 즉시, 명확, 자동 연결!

## 📋 필수 메타태그 체크리스트

### Level 1: 기본 식별 (100% 필수)
```yaml
제목:           # 구체적이고 검색 가능한 제목
날짜:           # YYYY-MM-DD 형식
프로젝트:       # 나라똔, 집첵 등
카테고리:       # 00-기획, 01-아키텍처 등
```

### Level 2: 기능 분류 (필수)
```yaml
기능모듈:       # 계층 구조 (관리자/인증)
기능명칭:       # 구체적 기능명
상태:           # 진행중, 완료, 보류
```

### Level 3: 관계 연결 (핵심!)
```yaml
선행작업:       # 이 작업의 기반이 되는 문서
후속작업:       # 이 작업으로 가능해진 문서
관련기능:       # 같은 목적의 다른 기능
영향범위:       # 영향받는 기능들
```

### Level 4: 우선순위 (권장)
```yaml
우선순위:       # Low, Medium, High, Critical
긴급도:         # Low, Medium, High, Critical
중요도:         # Low, Medium, High, Critical
```

## 🏷️ 카테고리별 메타태그 템플릿

### 대화기록
```yaml
---
# === 기본 (필수) ===
제목: {대화 주제}
날짜: {YYYY-MM-DD}
프로젝트: {프로젝트명}
카테고리: 99-대화기록

# === 분류 (필수) ===
대화유형: {시스템설계|기능개발|트러블슈팅|코드리뷰|기획회의}
주요주제: [{주제1}, {주제2}, ...]
참여자: [{이름1}, {이름2}]

# === 관계 (핵심!) ===
이전대화: [{대화 문서명}]
다음대화: [{대화 문서명}]
관련대화: [{관련 대화들}]
생성문서: [{이 대화로 생성된 문서들}]

# === 결과 (필수) ===
생성파일: [{파일 경로}]
주요결정: [{결정사항}]
액션아이템: [{TODO}]
주요성과: {한 줄 요약}

# === 통계 (권장) ===
소요시간: {Xh Ym}
참여인원: {숫자}
생성문서수: {숫자}
토큰사용량: {숫자}

# === 태그 (자동 생성) ===
tags:
  - 프로젝트/{프로젝트}
  - 대화유형/{유형}
  - 주제/{주제1}
  - 주제/{주제2}
---
```

### 트러블슈팅
```yaml
---
# === 기본 (필수) ===
제목: {기능}-{에러타입}-{근본원인}
날짜: {YYYY-MM-DD}
프로젝트: {프로젝트명}
카테고리: 05-트러블슈팅

# === 문제 분류 (필수) ===
발생기능: {기능명}
기능모듈: {모듈/서브모듈}
에러타입: {에러명}
근본원인: {원인}
심각도: {Low|Medium|High|Critical}

# === 해결 정보 (필수) ===
해결여부: {진행중|해결완료}
해결방법: {한 줄 요약}
소요시간: {Xh Ym}
해결자: {이름}

# === 관계 (핵심!) ===
관련기능: [{기능 문서}]
선행작업: [{아키텍처/스키마 문서}]
유사문제: [{비슷한 트러블슈팅}]
참조문서: [{외부 문서}]

# === 영향 (필수) ===
영향범위: [{영향받은 기능}]
영향사용자: {숫자 또는 백분율}
다운타임: {Xh Ym}

# === 재발 방지 (필수) ===
재발가능성: {Low|Medium|High}
예방조치: [{조치}]
모니터링: {모니터링 방법}
테스트추가: {true|false}

# === 파일 정보 (권장) ===
변경파일: [{파일 경로}]
추가파일: [{파일 경로}]
삭제파일: [{파일 경로}]

# === 태그 (자동 생성) ===
tags:
  - 프로젝트/{프로젝트}
  - 기능모듈/{모듈}
  - 에러타입/{에러}
  - 심각도/{심각도}
  - 상태/{해결여부}
---
```

### 기능개발
```yaml
---
# === 기본 (필수) ===
제목: {기능명}
날짜: {YYYY-MM-DD}
프로젝트: {프로젝트명}
카테고리: 03-기능개발

# === 기능 분류 (필수) ===
기능모듈: {모듈/서브모듈}
기능명칭: {구체적 기능명}
기능범주: [{범주1}, {범주2}]
기능타입: {신규|개선|리팩토링}
상태: {개발중|완료|테스트중}

# === 관계 (핵심!) ===
선행작업: [{아키텍처/스키마}]
후속작업: [{다음 기능}]
관련기능: [{관련 기능}]
의존기능: [{필수 기능}]
영향범위: [{영향받는 기능}]

# === 구현 정보 (필수) ===
구현파일: [{파일 경로}]
관련API: [{API 엔드포인트}]
의존라이브러리: [{라이브러리@버전}]
DB변경: {true|false}
스키마변경: {true|false}

# === 테스트 (필수) ===
테스트완료: {true|false}
테스트커버리지: {숫자%}
테스트파일: [{파일 경로}]
E2E테스트: {true|false}

# === 품질 (권장) ===
코드리뷰: {완료|대기|불필요}
보안검토: {완료|대기|불필요}
성능테스트: {완료|대기|불필요}
품질점수: {0-100}

# === 배포 (권장) ===
배포일: {YYYY-MM-DD}
배포버전: {v1.2.3}
배포환경: {dev|staging|production}
롤백가능: {true|false}

# === 성능 (선택) ===
성능목표: {목표값}
성능실측: {측정값}
성능개선: {%}

# === 태그 (자동 생성) ===
tags:
  - 프로젝트/{프로젝트}
  - 기능모듈/{모듈}
  - 기능타입/{타입}
  - 상태/{상태}
  - 기술/{기술스택}
---
```

## 🔄 메타태그 자동 생성 규칙

### 1. 프로젝트 자동 감지
```javascript
function detectProject() {
  const cwd = process.cwd();
  const folderName = path.basename(cwd);

  const projectMap = {
    'homepage': '나라똔',
    'zipcheck': '집첵',
  };

  return projectMap[folderName] || folderName;
}
```

### 2. 기능모듈 자동 추론
```javascript
function inferFunctionModule(content, files) {
  // 파일 경로에서 추론
  if (files.includes('app/admin/')) return '관리자';
  if (files.includes('lib/auth/')) return '관리자/인증';
  if (files.includes('app/admin/examiners/')) return '관리자/심사관관리';

  // 내용에서 키워드 추출
  if (content.includes('JWT')) return '관리자/인증';
  if (content.includes('이미지 업로드')) return '파일관리';

  return '미분류';
}
```

### 3. 관련 문서 자동 연결
```javascript
function findRelatedDocs(currentDoc) {
  const related = {
    선행작업: [],
    관련기능: [],
    유사문제: [],
  };

  // 현재 세션에서 언급된 문서
  const mentioned = extractMentionedDocs(conversationHistory);
  related.선행작업 = mentioned.filter(doc => doc.date < currentDoc.date);

  // 같은 기능모듈의 문서
  const sameModule = searchByMetadata({
    기능모듈: currentDoc.기능모듈
  });
  related.관련기능 = sameModule;

  // 같은 에러타입의 문서 (트러블슈팅의 경우)
  if (currentDoc.카테고리 === '05-트러블슈팅') {
    related.유사문제 = searchByMetadata({
      에러타입: currentDoc.에러타입
    });
  }

  return related;
}
```

### 4. 태그 자동 생성
```javascript
function generateTags(metadata) {
  const tags = new Set();

  // Level 1: 프로젝트
  tags.add(`프로젝트/${metadata.프로젝트}`);

  // Level 2: 기능모듈 (계층)
  const modules = metadata.기능모듈.split('/');
  modules.forEach((module, index) => {
    const path = modules.slice(0, index + 1).join('/');
    tags.add(`기능모듈/${path}`);
  });

  // Level 3: 카테고리/타입
  if (metadata.카테고리) {
    tags.add(`카테고리/${metadata.카테고리}`);
  }
  if (metadata.기능타입) {
    tags.add(`타입/${metadata.기능타입}`);
  }

  // Level 4: 상태/우선순위
  if (metadata.상태) {
    tags.add(`상태/${metadata.상태}`);
  }
  if (metadata.우선순위) {
    tags.add(`우선순위/${metadata.우선순위}`);
  }

  // Level 5: 기술스택
  if (metadata.의존라이브러리) {
    metadata.의존라이브러리.forEach(lib => {
      const name = lib.split('@')[0];
      tags.add(`기술/${name}`);
    });
  }

  return Array.from(tags);
}
```

## 📊 메타태그 검증

### 필수 필드 체크
```javascript
function validateMetadata(metadata, category) {
  const required = {
    'all': ['제목', '날짜', '프로젝트', '카테고리'],
    '05-트러블슈팅': ['발생기능', '에러타입', '근본원인', '심각도'],
    '03-기능개발': ['기능모듈', '기능명칭', '상태'],
    '99-대화기록': ['대화유형', '주요주제', '참여자'],
  };

  const missing = [];

  // 공통 필수 필드
  required.all.forEach(field => {
    if (!metadata[field]) missing.push(field);
  });

  // 카테고리별 필수 필드
  if (required[category]) {
    required[category].forEach(field => {
      if (!metadata[field]) missing.push(field);
    });
  }

  return {
    valid: missing.length === 0,
    missing
  };
}
```

### 품질 점수 계산
```javascript
function calculateQualityScore(metadata) {
  let score = 0;

  // 필수 필드 (50점)
  if (metadata.제목) score += 10;
  if (metadata.날짜) score += 10;
  if (metadata.프로젝트) score += 10;
  if (metadata.기능모듈) score += 10;
  if (metadata.카테고리) score += 10;

  // 관계 연결 (30점)
  if (metadata.선행작업?.length) score += 10;
  if (metadata.관련기능?.length) score += 10;
  if (metadata.영향범위?.length) score += 10;

  // 상세 정보 (20점)
  if (metadata.구현파일?.length) score += 5;
  if (metadata.테스트완료 === true) score += 5;
  if (metadata.코드리뷰 === '완료') score += 5;
  if (metadata.참조문서?.length) score += 5;

  return score;
}
```

## 🎯 Claude 자동 실행 규칙

### 문서 저장 시 자동으로:
```markdown
1. ✅ 프로젝트 자동 감지
2. ✅ 기능모듈 자동 추론
3. ✅ 관련 문서 자동 검색
4. ✅ 태그 자동 생성
5. ✅ 필수 필드 검증
6. ✅ 품질 점수 계산
7. ⚠️  누락 필드 알림
```

### 사용자에게 확인 요청:
```markdown
⚠️  메타데이터 확인 필요

자동 생성:
- 프로젝트: 나라똔 ✅
- 기능모듈: 관리자/인증 ✅
- 관련기능: [OAuth로그인, 세션관리] ✅

확인 필요:
- 우선순위: ? (High로 설정할까요?)
- 긴급도: ? (Medium로 설정할까요?)

계속 진행? (Y/n)
```

## 📈 검색 성능 최적화

### 인덱싱 전략
```markdown
# 빠른 검색을 위한 메타데이터 인덱스

.claude/metadata-index.json:
{
  "프로젝트": {
    "나라똔": ["{파일 목록}"]
  },
  "기능모듈": {
    "관리자/인증": ["{파일 목록}"]
  },
  "상태": {
    "완료": ["{파일 목록}"],
    "진행중": ["{파일 목록}"]
  }
}

→ 검색 시: 인덱스만 스캔 (0.1초)
vs 전체 파일 스캔 (10초)
```

## 🚀 실행 예시

### Claude가 자동으로 생성하는 메타데이터
```yaml
---
# Claude 자동 생성
제목: 관리자인증-403에러-JWT콜백미조회
날짜: 2025-10-19
프로젝트: 나라똔                      # ✅ 폴더명에서 자동 감지
카테고리: 05-트러블슈팅                # ✅ 작업 유형에서 자동 판단

기능모듈: 관리자/인증                  # ✅ 파일 경로에서 추론
발생기능: JWT 토큰 검증                # ✅ 에러 메시지에서 추출
에러타입: 403에러                      # ✅ 에러 메시지에서 추출
근본원인: JWT콜백미조회                # ✅ 분석 결과에서 추출

선행작업: [RBAC아키텍처, JWT인증구현]  # ✅ 대화에서 언급된 문서
관련기능: [OAuth로그인, 세션관리]      # ✅ 같은 모듈 문서 검색
영향범위: [관리자전체]                 # ✅ 변경 파일에서 추론

변경파일: [lib/auth/authOptions.ts]   # ✅ Git diff에서 추출

tags:                                  # ✅ 위 메타데이터에서 자동 생성
  - 프로젝트/나라똔
  - 기능모듈/관리자
  - 기능모듈/관리자/인증
  - 에러타입/403에러
  - 상태/해결완료
  - 기술/NextAuth
---

# 사용자 확인 필요
우선순위: High                         # ❓ 사용자에게 질문
긴급도: High                           # ❓ 사용자에게 질문
```

---

**이 Skill로 모든 문서에 완벽한 메타데이터가 자동으로 부여됩니다.**
**검색 성능이 100배 향상되고, 관련 문서가 자동으로 연결됩니다.**
