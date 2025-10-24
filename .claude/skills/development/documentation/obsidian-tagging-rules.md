# 옵시디언 해시태그 & 지식 연결 규칙

**카테고리**: Development - Documentation
**목적**: AI가 이해하기 쉬운 체계적인 태그 구조로 지식 그래프 구축

## 🏷️ 태그 체계 (3단계 분류)

### Level 1: 프로젝트 범주
```
#나라똔
#집첵
#공통라이브러리
```

### Level 2: 기능 범주 (도메인)
```
#인증        # 로그인, 회원가입, 권한 관리
#관리자      # Admin 기능 전반
#심사관      # 심사관 관리
#정책뉴스    # 정책 뉴스 기능
#사업자의소리  # 비즈니스 의견 기능
#커뮤니티    # 커뮤니티 기능
#파일관리    # 이미지/파일 업로드
#데이터베이스  # DB 관련
#보안        # 보안 기능
#성능        # 성능 최적화
#UI/UX       # 사용자 인터페이스
```

### Level 3: 섹션 범주 (기술/작업 유형)
```
#API
#프론트엔드
#백엔드
#스키마
#인덱스
#캐싱
#에러처리
#테스트
#배포
#리팩토링
#버그픽스
#신규기능
```

## 📊 태그 조합 규칙

### 기본 원칙
```markdown
모든 문서는 최소 3개 태그 포함:
1. 프로젝트 태그 (필수)
2. 기능 범주 태그 (필수)
3. 섹션 범주 태그 (필수)
4. 추가 상세 태그 (선택)
```

### 실전 예시

#### 예시 1: 관리자 인증 문제
```markdown
---
tags:
  - 나라똔          # Level 1: 프로젝트
  - 인증            # Level 2: 기능 범주
  - 관리자          # Level 2: 기능 범주
  - API             # Level 3: 섹션 범주
  - 버그픽스        # Level 3: 작업 유형
  - JWT             # 추가: 기술 스택
  - 403에러         # 추가: 에러 타입
---

#나라똔 #인증 #관리자 #API #버그픽스 #JWT #403에러
```

#### 예시 2: 이미지 업로드 기능
```markdown
---
tags:
  - 나라똔          # Level 1
  - 파일관리        # Level 2
  - 심사관          # Level 2
  - 프론트엔드      # Level 3
  - 신규기능        # Level 3
  - Cloudflare-R2   # 추가
  - UX개선          # 추가
---

#나라똔 #파일관리 #심사관 #프론트엔드 #신규기능 #Cloudflare-R2 #UX개선
```

#### 예시 3: MongoDB 스키마 변경
```markdown
---
tags:
  - 나라똔          # Level 1
  - 데이터베이스    # Level 2
  - 사용자          # Level 2
  - 스키마          # Level 3
  - 리팩토링        # Level 3
  - MongoDB         # 추가
  - Role필드        # 추가
---

#나라똔 #데이터베이스 #사용자 #스키마 #리팩토링 #MongoDB #Role필드
```

## 🔗 지식 연결 패턴

### 1. 양방향 링크 (Bidirectional Links)

#### 트러블슈팅 → 기능
```markdown
# 트러블슈팅 문서
관련 기능: [[2025-10-20-심사관관리기능]]
관련 API: [[2025-09-15-사용자인증API]]

→ 옵시디언이 자동으로 역링크 생성
→ 기능 문서에서 "이 문서를 참조한 문서" 섹션에 표시됨
```

#### 기능 → 아키텍처/스키마
```markdown
# 기능개발 문서
아키텍처: [[2025-09-10-RBAC아키텍처]]
스키마: [[2025-09-05-사용자스키마]]
보안: [[2025-10-25-환경변수보안]]
```

### 2. MOC (Map of Content) 패턴

#### 프로젝트별 MOC
```markdown
# 나라똔 - 인덱스

## 📋 최근 작업
- [[2025-10-22-관리자Role-403오류]]
- [[2025-10-20-심사관이미지업로드]]
- [[2025-10-19-RBAC권한체계]]

## 🏗️ 아키텍처
- [[시스템아키텍처]]
- [[데이터베이스설계]]
- [[보안정책]]

## 🔍 주요 기능별
### 인증 & 권한
- [[RBAC아키텍처]]
- [[JWT인증흐름]]

### 관리자 기능
- [[심사관관리]]
- [[정책뉴스관리]]

## 🐛 트러블슈팅 모음
```dataview
TABLE 해결여부, 심각도
FROM "Projects/나라똔/05-트러블슈팅"
WHERE 프로젝트 = "나라똔"
SORT 날짜 DESC
```
```

### 3. 태그 기반 쿼리 (Dataview)

#### 미해결 트러블슈팅 조회
```markdown
# 미해결 문제 현황

```dataview
TABLE 발생기능, 에러타입, 날짜
FROM #나라똔 AND #트러블슈팅
WHERE 해결여부 = "진행중"
SORT 심각도 DESC, 날짜 ASC
```
```

#### 특정 기능 관련 모든 문서
```markdown
# 인증 기능 관련 문서

```dataview
LIST
FROM #나라똔 AND #인증
SORT 날짜 DESC
```
```

#### 최근 기능 개발 현황
```markdown
# 최근 개발 현황

```dataview
TABLE 제목, 상태, 날짜
FROM #나라똔 AND #신규기능
WHERE 날짜 >= date(today) - dur(30 days)
SORT 날짜 DESC
```
```

## 🎯 자동 태그 생성 규칙

### Claude가 문서 저장 시 자동 적용

```javascript
/**
 * 문서 타입별 자동 태그 매핑
 */
const autoTags = {
  '트러블슈팅': (params) => [
    params.project,           // #나라똔
    params.function,          // #인증
    '트러블슈팅',
    params.errorType,         // #403에러
    params.resolved ? '해결완료' : '진행중',
  ],

  '기능개발': (params) => [
    params.project,           // #나라똔
    params.domain,            // #심사관
    '신규기능',
    params.tech,              // #Next.js
  ],

  '아키텍처': (params) => [
    params.project,
    '아키텍처',
    params.pattern,           // #RBAC, #MVC
  ],

  '스키마': (params) => [
    params.project,
    '데이터베이스',
    '스키마',
    params.collection,        // #Users
  ],

  '보안': (params) => [
    params.project,
    '보안',
    params.securityType,      // #환경변수, #RBAC
    params.severity,          // #Critical
  ],
};
```

### 컨텍스트 기반 자동 태그 추론

```javascript
/**
 * 파일 경로, 에러 메시지, 코드에서 태그 자동 추론
 */
function inferTags(context) {
  const tags = new Set();

  // 파일 경로에서 추론
  if (context.files?.includes('lib/auth/')) {
    tags.add('인증');
  }
  if (context.files?.includes('app/admin/')) {
    tags.add('관리자');
  }

  // 에러 메시지에서 추론
  if (context.error?.includes('403')) {
    tags.add('403에러');
    tags.add('권한');
  }
  if (context.error?.includes('MongoDB')) {
    tags.add('데이터베이스');
    tags.add('MongoDB');
  }

  // 코드에서 추론
  if (context.code?.includes('JWT')) {
    tags.add('JWT');
  }
  if (context.code?.includes('getServerSession')) {
    tags.add('인증');
    tags.add('NextAuth');
  }

  return Array.from(tags);
}
```

## 📚 태그 네이밍 컨벤션

### 한글 vs 영어
```markdown
# ✅ 권장: 한글 (AI가 이해하기 쉬움)
#나라똔 #인증 #관리자 #신규기능

# ❌ 비권장: 영어
#naraddon #auth #admin #new-feature
```

### 복합 태그
```markdown
# ✅ 권장: 하이픈 없이 붙여쓰기
#Cloudflare-R2
#환경변수보안
#이미지업로드

# ❌ 비권장: 공백 또는 언더스코어
#Cloudflare R2      # 공백 인식 안 됨
#환경변수_보안       # 검색 불편
```

### 에러 타입 태그
```markdown
# 패턴: #{HTTP상태코드}에러
#403에러
#404에러
#500에러

# 패턴: #{기술명}에러
#JWT에러
#MongoDB에러
#CORS에러
```

## 🔍 검색 최적화

### 태그 조합 검색
```markdown
# 나라똔 프로젝트의 인증 관련 미해결 트러블슈팅
tag:#나라똔 tag:#인증 tag:#트러블슈팅 tag:#진행중

# 최근 30일 이내 신규 기능
tag:#나라똔 tag:#신규기능 created:[now-30d TO now]

# Critical 보안 이슈
tag:#보안 tag:#Critical
```

### 전체 텍스트 + 태그 검색
```markdown
# JWT 관련 모든 문서 (태그 + 본문)
tag:#JWT OR content:"JWT"

# 403 에러 관련
tag:#403에러 OR "403 Forbidden"
```

## 🎨 태그 색상 코딩 (Obsidian CSS)

### .obsidian/snippets/tag-colors.css
```css
/* 프로젝트 태그 */
.tag[href="#나라똔"] { background-color: #ff6b6b; }
.tag[href="#집첵"] { background-color: #4ecdc4; }

/* 심각도 태그 */
.tag[href="#Critical"] { background-color: #ff0000; color: white; }
.tag[href="#High"] { background-color: #ff9800; }
.tag[href="#Medium"] { background-color: #ffeb3b; }
.tag[href="#Low"] { background-color: #4caf50; }

/* 상태 태그 */
.tag[href="#진행중"] { background-color: #2196f3; color: white; }
.tag[href="#해결완료"] { background-color: #8bc34a; }
.tag[href="#보류"] { background-color: #9e9e9e; }

/* 기능 범주 */
.tag[href="#인증"] { background-color: #9c27b0; color: white; }
.tag[href="#관리자"] { background-color: #673ab7; color: white; }
.tag[href="#보안"] { background-color: #f44336; color: white; }
```

## 📊 태그 통계 대시보드

### 프로젝트 대시보드
```markdown
# 나라똔 프로젝트 대시보드

## 📈 문서 통계
```dataview
TABLE length(rows) as "문서 수"
FROM #나라똔
GROUP BY 카테고리
```

## 🐛 트러블슈팅 현황
```dataview
TABLE 발생기능, 에러타입, 해결여부
FROM #나라똔 AND #트러블슈팅
WHERE 해결여부 = "진행중"
```

## 🚀 최근 기능 개발
```dataview
LIST
FROM #나라똔 AND #신규기능
SORT 날짜 DESC
LIMIT 10
```

## 🔒 보안 이슈
```dataview
TABLE 제목, 심각도, 상태
FROM #나라똔 AND #보안
SORT 심각도 DESC, 날짜 DESC
```
```

## 🎯 실전 예시

### 예시 1: 관리자 Role 403 에러 트러블슈팅
```markdown
---
title: 관리자Role-403오류-JWT콜백미조회
날짜: 2025-10-22
프로젝트: 나라똔
카테고리: 트러블슈팅
발생기능: 관리자인증
에러타입: 403에러
심각도: High
해결여부: 해결완료
tags:
  - 나라똔
  - 인증
  - 관리자
  - API
  - 버그픽스
  - JWT
  - 403에러
  - NextAuth
  - 해결완료
---

#나라똔 #인증 #관리자 #API #버그픽스 #JWT #403에러 #NextAuth #해결완료

# 관리자 인증 - 403 에러 - JWT 콜백 미조회

## 🔗 관련 문서
- 관련 기능: [[2025-09-15-관리자권한관리]]
- 관련 아키텍처: [[2025-09-10-RBAC아키텍처]]
- 관련 보안: [[2025-10-25-JWT환경변수보안]]
- 후속 작업: [[2025-10-23-관리자세션캐싱개선]]

...문서 내용...
```

이 문서를 저장하면:
1. 옵시디언 그래프에서 **관리자인증** 관련 문서들이 연결됨
2. `#인증` 태그로 모든 인증 관련 문서를 한 번에 검색
3. `#해결완료` 태그로 해결된 문제들을 필터링
4. 역링크를 통해 이 문서를 참조한 다른 문서 추적

---

**이 규칙으로 AI는 프로젝트 전체 맥락을 즉시 파악할 수 있습니다.**
**태그 조합만으로도 원하는 지식을 정확히 찾을 수 있습니다.**
