# Skill: Obsidian Direct Create (직접 문서 생성)

## 🎯 목적
Templater 없이 Claude가 REST API로 직접 Obsidian 문서를 생성합니다.

## 📋 실행 시점
- 트러블슈팅 해결 완료 시
- 기능 개발 완료 시
- 대화 기록 저장 시
- **obsidian-auto-doc Skill 대체**

## 🔧 실행 워크플로우

### Phase 1: 메타데이터 자동 생성
```javascript
/**
 * metadata-auto-generator Skill의 결과 사용
 */
const metadata = {
  title: "관리자인증-403에러-JWT콜백미조회",
  날짜: "2025-10-19",
  프로젝트: "나라똔",
  프로젝트코드: "NRDN",
  카테고리: "트러블슈팅",
  발생기능: "관리자인증",
  기능모듈: "관리자/인증/JWT",
  에러타입: "403에러",
  근본원인: "JWT콜백미조회",
  심각도: "High",
  해결여부: "해결완료",
  // ... (자동 생성된 모든 메타데이터)
};
```

### Phase 2: 문서 내용 생성
```javascript
/**
 * 카테고리별 문서 구조 생성
 */
function generateDocument(metadata, content) {
  let doc = '';

  // YAML Front Matter
  doc += '---\n';
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      doc += `${key}:\n`;
      value.forEach(item => {
        doc += `  - ${item}\n`;
      });
    } else {
      doc += `${key}: ${value}\n`;
    }
  }
  doc += '---\n\n';

  // 해시태그 라인
  const tags = generateHashtags(metadata.tags);
  doc += `${tags}\n\n`;

  // 제목
  doc += `# ${metadata.title}\n\n`;

  // 본문
  doc += content;

  // 인라인 메타데이터
  doc += '\n\n---\n\n';
  doc += generateInlineMetadata(metadata);

  return doc;
}
```

### Phase 3: REST API로 직접 저장
```javascript
/**
 * Obsidian REST API로 파일 생성
 */
async function createObsidianDocument(metadata, content) {
  const apiUrl = 'http://127.0.0.1:27123';
  const token = process.env.OBSIDIAN_API_TOKEN;

  // 파일 경로 생성
  const filePath = generateFilePath(metadata);
  // 예: Projects/나라똔/05-트러블슈팅/2025-10-19-관리자인증-403에러-JWT콜백미조회.md

  // 문서 생성
  const document = generateDocument(metadata, content);

  // API 호출
  const response = await fetch(`${apiUrl}/vault/${filePath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/markdown',
    },
    body: document,
  });

  if (response.ok) {
    console.log(`✅ Obsidian 문서 생성 완료: ${filePath}`);
    return filePath;
  } else {
    throw new Error(`문서 생성 실패: ${response.statusText}`);
  }
}
```

### Phase 4: 파일 경로 자동 생성
```javascript
/**
 * 카테고리별 네이밍 규칙
 */
function generateFilePath(metadata) {
  const { 프로젝트, 카테고리, 날짜 } = metadata;

  // 카테고리 → 폴더 매핑
  const folderMap = {
    '트러블슈팅': '05-트러블슈팅',
    '기능개발': '03-기능개발',
    '대화기록': '99-대화기록',
    '아키텍처': '01-아키텍처',
    '스키마': '02-스키마',
  };

  const folder = folderMap[카테고리];

  // 파일명 생성
  let filename = `${날짜}-`;

  if (카테고리 === '트러블슈팅') {
    filename += `${metadata.발생기능}-${metadata.에러타입}-${metadata.근본원인}`;
  } else if (카테고리 === '기능개발') {
    filename += `${metadata.기능명칭}`;
  } else if (카테고리 === '대화기록') {
    filename += `${metadata.대화유형}-${metadata.주요성과}`;
  }

  filename += '.md';

  return `Projects/${프로젝트}/${folder}/${filename}`;
}
```

## 🎬 Claude 실행 예시

### 예시 1: 트러블슈팅 완료 시

**사용자:** "JWT 403 에러 해결했어"

**Claude 내부 실행:**

```javascript
// 1. 메타데이터 자동 생성 (metadata-auto-generator)
const metadata = {
  title: "관리자인증-403에러-JWT콜백미조회",
  날짜: "2025-10-19",
  프로젝트: "나라똔",
  카테고리: "트러블슈팅",
  발생기능: "관리자인증",
  에러타입: "403에러",
  근본원인: "JWT콜백미조회",
  심각도: "High",
  tags: [
    "프로젝트/나라똔",
    "기능/관리자/인증/JWT",
    "작업유형/트러블슈팅/버그픽스",
    "상태/완료",
  ],
};

// 2. 본문 생성 (대화 내용 기반)
const content = `
## 📋 문제 요약
- **발생 위치**: 관리자 페이지 (/admin/*)
- **에러 타입**: 403 Forbidden
- **근본 원인**: JWT 콜백에서 user.role 미조회

## 🔍 상세 상황

### 어떤 문제가 발생했는가?
Google OAuth로 로그인한 사용자가 관리자 페이지 접근 시 403 에러 발생.

### 에러 메시지
\`\`\`
GET /admin/examiners 403 Forbidden
Session: { user: { email: 'admin@example.com', role: undefined } }
\`\`\`

## 💡 원인 분석
JWT 콜백에서 user.role을 그대로 사용. Google OAuth는 role 정보를 제공하지 않음.

## 🛠️ 해결 과정

### 최종 해결 방법
\`\`\`typescript
// lib/auth/authOptions.ts
async jwt({ token, user }) {
  if (user) {
    await connectMongoDB();
    const dbUser = await User.findOne({ email: user.email });
    token.role = dbUser?.role || 'user'; // ✨ DB에서 조회
  }
  return token;
}
\`\`\`

## 🔗 관련 문서
- [[RBAC아키텍처]]
- [[JWT인증구현]]
`;

// 3. REST API로 직접 생성
const filePath = await createObsidianDocument(metadata, content);
// → Projects/나라똔/05-트러블슈팅/2025-10-19-관리자인증-403에러-JWT콜백미조회.md
```

**Claude가 사용자에게:**
```markdown
✅ 트러블슈팅 문서 생성 완료!

📄 파일: Projects/나라똔/05-트러블슈팅/2025-10-19-관리자인증-403에러-JWT콜백미조회.md
📊 메타데이터 품질: 92/100
🏷️  태그: 13개 자동 생성

Obsidian에서 확인하세요!
```

## 🔗 연동 Skills

- **metadata-auto-generator**: 메타데이터 80% 자동 생성
- **request-result-validator**: 내용 검증
- **skill-orchestrator**: 작업 완료 후 자동 트리거

## ✅ 장점

**vs Templater:**
- ✅ 설정 불필요 (폴더 템플릿 등)
- ✅ 100% 자동화
- ✅ 사용자 입력 0% (프롬프트 창 없음)
- ✅ Claude가 모든 내용 자동 생성
- ✅ 메타데이터 품질 보장

**vs 기존 방식:**
- Before: 사용자가 프롬프트 5개 응답 → 수동 작성
- After: Claude가 대화 분석 → 자동 생성

## 🎯 성공 기준

- [ ] REST API로 문서 생성 100% 성공
- [ ] 메타데이터 품질 90점 이상
- [ ] 사용자 입력 0%
- [ ] 생성 시간 5초 이내

---

**이제 Templater 설정 필요 없습니다!**
**Claude가 모든 문서를 직접 생성합니다!**
