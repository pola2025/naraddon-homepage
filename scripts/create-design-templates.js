/**
 * Design Guardian 템플릿 파일 생성
 * @purpose Obsidian Templater용 템플릿 파일 생성
 */

const http = require('http');
const config = require('../.claude/obsidian-config.json');

const API_URL = config.api.host;
const API_TOKEN = config.api.token;

/**
 * Obsidian API 호출
 */
async function callAPI(endpoint, method = 'GET', body = null) {
  const url = new URL(endpoint, API_URL);

  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`API Error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * 파일 생성
 */
async function createFile(filePath, content) {
  try {
    await callAPI(`/vault/${filePath}`, 'PUT', content);
    console.log(`✅ 생성: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ 실패: ${filePath} - ${error.message}`);
    return false;
  }
}

/**
 * 템플릿 정의
 */
const TEMPLATES = {
  'design-change-template.md': `---
title: <% tp.file.title %>
date: <% tp.date.now("YYYY-MM-DD") %>
datetime: <% tp.date.now("YYYY-MM-DD HH:mm") %>
project: <% tp.frontmatter.project %>
component: <% tp.frontmatter.component %>
type: <% tp.frontmatter.type %>
status: completed
---

# <% tp.file.title %>

## 변경 정보
- **일시**: <% tp.date.now("YYYY-MM-DD HH:mm") %>
- **컴포넌트**:
- **변경 타입**: [ ] 색상 / [ ] 아이콘 / [ ] 레이아웃 / [ ] 기타

## AI 패턴 검사 결과

### 검사 항목
- [ ] 금지 이모지 체크
- [ ] 색상 개수 체크 (3개 이하)
- [ ] 무지개 그라디언트 체크
- [ ] 보라색 과다 사용 체크 (컨셉 아닐 때)

### 감지된 문제
\`\`\`
없음 / 또는 문제 내용
\`\`\`

## 변경 내용

### Before
\`\`\`css

\`\`\`

### After
\`\`\`css

\`\`\`

## 색상 사용

사용된 색상:
- 색상 1:
- 색상 2:
- 색상 3:

총 색상 개수:

## 관련 파일
-

## 스크린샷
<!--
![[screenshot-before.png]]
![[screenshot-after.png]]
-->

## 노트


---
Tags: #디자인 #변경기록
`,

  'design-troubleshooting-template.md': `---
title: <% tp.file.title %>
date: <% tp.date.now("YYYY-MM-DD") %>
problem:
severity: [ ] low / [ ] medium / [ ] high
resolved: [ ] true / [ ] false
---

# <% tp.file.title %>

## 타임라인
- **발생일시**: <% tp.date.now("YYYY-MM-DD HH:mm") %>
- **해결일시**:
- **소요시간**:

## 문제 상황

### 증상


### 에러 메시지
\`\`\`

\`\`\`

### 발생 환경
- **브라우저**:
- **화면 크기**:
- **관련 파일**:

## 원인 분석

### 근본 원인


### AI 패턴 관련 여부
[ ] Yes / [ ] No

관련 패턴:
- [ ] 색상 과다
- [ ] 금지 이모지
- [ ] 블러리 그라디언트
- [ ] 기타:

## 해결 과정

### 시도한 방법들
1. **시도 1**:
   - 결과:

2. **시도 2**:
   - 결과:

3. **시도 3**:
   - 결과:

### 최종 해결 방법
\`\`\`css

\`\`\`

## 예방 조치


## 참고 자료
-

---
Tags: #디자인 #트러블슈팅
`,

  'design-review-template.md': `---
title: <% tp.file.title %>
date: <% tp.date.now("YYYY-MM-DD") %>
datetime: <% tp.date.now("YYYY-MM-DD HH:mm") %>
component:
reviewer: Claude Design Guardian
status: [ ] passed / [ ] warning / [ ] failed
---

# <% tp.file.title %>

## 검토 정보
- **검토 일시**: <% tp.date.now("YYYY-MM-DD HH:mm") %>
- **대상 컴포넌트**:
- **검토자**: Claude Design Guardian

## AI 패턴 검사

### 1. 색상 검사
- [ ] 색상 개수: ___개 (권장: 3개 이하)
- [ ] 무지개 그라디언트: [ ] 없음 / [ ] 발견
- [ ] AI 전형 조합: [ ] 없음 / [ ] 발견
- [ ] 보라색 과다: [ ] 없음 / [ ] 발견

**사용된 색상**:
\`\`\`css

\`\`\`

### 2. 이모지 검사
- [ ] 금지 이모지: [ ] 없음 / [ ] 발견

**발견된 이모지**:


### 3. 아이콘 검사
- [ ] SVG 아이콘 사용: [ ] Yes / [ ] No
- [ ] 일관된 스타일: [ ] Yes / [ ] No

### 4. 레이아웃 검사
- [ ] 획일적 패턴: [ ] 없음 / [ ] 발견
- [ ] 블러리 효과: [ ] 적절 / [ ] 과도

## 검토 결과

### 통과 항목
-

### 경고 항목
-

### 실패 항목
-

## 권장 수정사항


## 총평
**결과**: [ ] 통과 / [ ] 조건부 통과 / [ ] 재작업 필요

---
Tags: #디자인 #검토 #AI패턴
`
};

/**
 * 메인 실행
 */
async function main() {
  console.log('📝 Design Guardian 템플릿 생성 시작...\n');

  let successCount = 0;
  let failCount = 0;

  for (const [filename, content] of Object.entries(TEMPLATES)) {
    const filePath = `.claude/templates/${filename}`;
    const success = await createFile(filePath, content);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // API 요청 간격
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log('='.repeat(50));

  if (failCount === 0) {
    console.log('\n🎉 템플릿 파일 생성 완료!');
    console.log('📂 위치: .claude/templates/');
    console.log('\n생성된 템플릿:');
    Object.keys(TEMPLATES).forEach(name => {
      console.log(`  - ${name}`);
    });
  } else {
    console.log('\n⚠️  일부 템플릿 생성에 실패했습니다.');
  }
}

main().catch(error => {
  console.error('❌ 오류:', error.message);
  process.exit(1);
});
