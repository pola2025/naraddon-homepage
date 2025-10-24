/**
 * Design Guardian 프로젝트 초기 설정
 * @purpose Obsidian에 디자인 프로젝트 폴더 구조 생성
 */

const http = require('http');
const config = require('../.claude/obsidian-config.json');

const API_URL = config.api.host;
const API_TOKEN = config.api.token;
const BASE_PATH = 'Projects/디자인';

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
 * 프로젝트 구조
 */
const PROJECT_STRUCTURE = {
  '00-가이드라인': [
    {
      name: 'README.md',
      content: `---
title: Design Guardian 가이드라인
date: ${new Date().toISOString().split('T')[0]}
category: 가이드라인
---

# Design Guardian 가이드라인

## 개요
AI 스타일을 회피하고 일관된 디자인을 유지하기 위한 가이드라인입니다.

## 핵심 원칙
1. **색상 절제**: 2-3가지 색상만 사용
2. **SVG 아이콘 우선**: 이모지 사용 최소화
3. **AI 클리셰 금지**: ✨🚀🔥 등 사용 금지

## 문서 구조
- [[색상-시스템]] - 색상 사용 규칙
- [[아이콘-규칙]] - SVG 아이콘 가이드
- [[AI-회피-패턴]] - AI 스타일 감지 및 회피

---
Tags: #가이드라인 #디자인
`
    },
    {
      name: '색상-시스템.md',
      content: `---
title: 색상 시스템
date: ${new Date().toISOString().split('T')[0]}
category: 가이드라인
---

# 색상 시스템

## 기본 원칙

### ❌ AI 스타일의 문제
- **알록달록 다색 팔레트**: 5가지 이상 원색 사용
- **무지개 그라디언트**: 의미 없는 4색 이상 조합
- **보라색 과다 사용**: AI 디자인의 클리셰 (컨셉 아닐 때)

### ✅ 권장 스타일
- **절제된 색상**: 2-3가지 메인 색상
- **단색 또는 2색 그라디언트**
- **의미 있는 색상 사용**
- **네온 허용**: 절제만 하면 사용 가능

## 색상 개수 가이드

| 개수 | 평가 | 설명 |
|------|------|------|
| 1-2색 | ✅ 이상적 | 미니멀, 강렬한 인상 |
| 3색 | ✅ 적절 | 균형잡힌 디자인 |
| 4색 | ⚠️ 주의 | 많지만 가능 |
| 5색+ | ❌ 금지 | AI 스타일! |

## 권장 색상 조합 예시

### 1. 네온 미니멀
\`\`\`css
--primary: #00FF00;     /* 네온 그린 */
--bg: #0A0A0A;          /* 거의 검정 */
--text: #FFFFFF;        /* 흰색 */
\`\`\`

### 2. 비비드 듀오톤
\`\`\`css
--primary: #FF1744;     /* 비비드 레드 */
--secondary: #2196F3;   /* 비비드 블루 */
\`\`\`

### 3. 다크 + 포인트
\`\`\`css
--bg: #1A1A1A;          /* 다크 */
--text: #E0E0E0;        /* 연한 그레이 */
--accent: #FF00FF;      /* 네온 마젠타 */
\`\`\`

## 금지 색상 조합

### ❌ 파스텔 레인보우
\`\`\`css
/* AI 생성 이미지 특유 */
#FFB3BA, #FFDFBA, #FFFFBA, #BAFFC9, #BAE1FF
\`\`\`

### ❌ 네온 멀티컬러
\`\`\`css
/* 4가지 이상 네온 = 과도함 */
#00FF00, #FF00FF, #00FFFF, #FFFF00
\`\`\`

### ❌ 핑크+노랑+보라
\`\`\`css
/* AI 클리셰 조합 */
#FF6B9D, #FEC84B, #8B5CF6
\`\`\`

## 보라색 사용 규칙

### 기본 정책
- **보라색 권장하지 않음** (AI 클리셰)
- **예외**: 컨셉 색상이 보라색인 경우만 허용

### 허용 사례
\`\`\`css
/* 브랜드/컨셉이 보라색인 경우 */
--brand: #8B5CF6;
\`\`\`

### 금지 사례
\`\`\`css
/* 이유 없이 보라색 사용 */
--random-purple: #A855F7;  /* ❌ */
\`\`\`

## 체크리스트

변경 전 확인:
- [ ] 사용 색상 3가지 이하인가?
- [ ] 무지개 그라디언트 없는가?
- [ ] 보라색 사용이 정당한가? (컨셉 색상인가?)
- [ ] AI 전형 조합 피했는가?

---
Tags: #가이드라인 #색상 #절제
`
    },
    {
      name: '아이콘-규칙.md',
      content: `---
title: 아이콘 사용 규칙
date: ${new Date().toISOString().split('T')[0]}
category: 가이드라인
---

# 아이콘 사용 규칙

## 기본 원칙

### 1순위: SVG 단색 아이콘
- Lucide Icons 사용
- 일관된 스트로크 (2px)
- 단색 또는 듀오톤

### 2순위: 최소한의 이모지
- 문서 내부만
- 의미 전달 명확한 경우만
- AI 클리셰 절대 금지

### 3순위: 텍스트
- 명확한 레이블
- 불필요한 장식 배제

## 금지 이모지 목록

| 이모지 | 이유 | 대체 방안 |
|-------|------|----------|
| ✨ | AI 공식 상징 | \`<Sparkles />\` SVG |
| 🚀 | 스타트업 클리셰 | \`<Rocket />\` SVG 또는 "출시" |
| 🔥 | 과도한 사용 | \`<Flame />\` SVG 또는 "인기" |
| 💡 | 혁신 클리셰 | \`<Lightbulb />\` SVG 또는 "아이디어" |
| 🤖 | AI 직접 표현 | \`<Bot />\` SVG 또는 "자동화" |
| ⚡ | 속도 클리셰 | \`<Zap />\` SVG 또는 "빠른" |
| 🎯 | 목표 클리셰 | \`<Target />\` SVG 또는 "목표" |
| 💻 | 테크 클리셰 | \`<Monitor />\` SVG 또는 "개발" |

## Lucide 아이콘 예시

\`\`\`tsx
import { Circle, Palette } from 'lucide-react';

// 단색 아이콘
<Circle className="w-6 h-6 text-gray-900" />

// 디자인 팔레트
<Palette className="w-6 h-6 text-blue-600" />
\`\`\`

## 허용되는 이모지 (최소한만)

| 이모지 | 용도 |
|-------|------|
| ✅ | 완료 상태 |
| ❌ | 실패 상태 |
| ⚠️ | 경고 |
| 📋 | 리스트 (문서 내부) |
| 📁 | 폴더 (문서 내부) |

---
Tags: #가이드라인 #아이콘 #SVG
`
    },
    {
      name: 'AI-회피-패턴.md',
      content: `---
title: AI 회피 패턴
date: ${new Date().toISOString().split('T')[0]}
category: 가이드라인
---

# AI 회피 패턴

## AI 스타일의 특징

### 시각적 특징
1. **블러리 메시 그라디언트**: 불규칙한 다색 그라디언트
2. **알록달록 색상**: 5가지 이상 원색
3. **과도한 이모지**: ✨🚀🔥 클리셰
4. **획일적 레이아웃**: 반복적인 패턴

### 색상 패턴
- 무지개 그라디언트 (4색+)
- 파스텔 레인보우
- 핑크+노랑+보라 조합

### 이모지 패턴
- Sparkles (✨) - AI 상징
- Rocket (🚀) - 스타트업
- Fire (🔥) - 인기

## 감지 방법

### 색상 체크
\`\`\`javascript
// 색상 개수 체크
const colors = extractColors(css);
if (colors.length > 4) {
  warn('색상이 너무 많습니다!');
}

// 무지개 그라디언트 체크
if (hasRainbowGradient(css)) {
  warn('AI 스타일 감지!');
}
\`\`\`

### 이모지 체크
\`\`\`javascript
const bannedEmojis = ['✨', '🚀', '🔥', '💡'];
if (content.match(/[✨🚀🔥💡]/)) {
  warn('AI 클리셰 이모지 감지!');
}
\`\`\`

## 회피 전략

### 1. 색상 절제
- 2-3가지 색상만 사용
- 단색 그라디언트
- 의미 있는 조합

### 2. SVG 아이콘
- Lucide Icons
- 단색 또는 듀오톤
- 일관된 스타일

### 3. 미니멀 디자인
- 불필요한 장식 제거
- 명확한 구조
- 의미 있는 요소만

---
Tags: #가이드라인 #AI회피 #패턴
`
    }
  ],
  '01-변경기록': [
    {
      name: 'README.md',
      content: `---
title: 변경기록
date: ${new Date().toISOString().split('T')[0]}
category: 변경기록
---

# 변경기록

모든 디자인 변경사항을 기록합니다.

## 네이밍 규칙
\`YYYY-MM-DD-{컴포넌트}-{변경내용}.md\`

예시:
- \`2025-10-20-Header-색상변경.md\`
- \`2025-10-20-Button-아이콘교체.md\`

---
Tags: #변경기록
`
    }
  ],
  '02-트러블슈팅': [
    {
      name: 'README.md',
      content: `---
title: 트러블슈팅
date: ${new Date().toISOString().split('T')[0]}
category: 트러블슈팅
---

# 트러블슈팅

디자인 관련 문제 해결 과정을 기록합니다.

## 네이밍 규칙
\`YYYY-MM-DD-{문제}.md\`

예시:
- \`2025-10-20-그라디언트-렌더링이슈.md\`
- \`2025-10-20-아이콘-정렬문제.md\`

---
Tags: #트러블슈팅
`
    }
  ],
  '03-검토기록': [
    {
      name: 'README.md',
      content: `---
title: 검토기록
date: ${new Date().toISOString().split('T')[0]}
category: 검토기록
---

# 검토기록

AI 패턴 검사 및 디자인 검토 기록입니다.

## 네이밍 규칙
\`YYYY-MM-DD-{컴포넌트}-AI패턴검사.md\`

예시:
- \`2025-10-20-랜딩페이지-AI패턴검사.md\`
- \`2025-10-20-전체UI-색상검토.md\`

---
Tags: #검토기록 #AI패턴
`
    }
  ],
  '99-리소스': [
    {
      name: 'README.md',
      content: `---
title: 리소스
date: ${new Date().toISOString().split('T')[0]}
category: 리소스
---

# 리소스

디자인 관련 참고 자료 및 리소스입니다.

## 포함 항목
- 색상 팔레트
- SVG 아이콘 세트
- 참고 디자인
- 금지 패턴 예시

---
Tags: #리소스
`
    },
    {
      name: '금지-이모지-목록.md',
      content: `---
title: 금지 이모지 목록
date: ${new Date().toISOString().split('T')[0]}
category: 리소스
---

# 금지 이모지 목록

## AI 클리셰 이모지

| 이모지 | 이름 | 이유 | 대체 방안 |
|-------|------|------|----------|
| ✨ | sparkles | AI 공식 상징 | SVG 아이콘 |
| 🚀 | rocket | 스타트업 클리셰 | "출시" 텍스트 |
| 🔥 | fire | 과도한 사용 | "인기" 텍스트 |
| 💡 | lightbulb | 혁신 클리셰 | "아이디어" 텍스트 |
| 🤖 | robot | AI 직접 표현 | "자동화" 텍스트 |
| ⚡ | zap | 속도 클리셰 | "빠른" 텍스트 |
| 🎯 | target | 목표 클리셰 | "목표" 텍스트 |
| 💻 | laptop | 테크 클리셰 | "개발" 텍스트 |
| 🌟 | star | sparkles 변형 | SVG 아이콘 |
| ⭐ | star2 | sparkles 변형 | SVG 아이콘 |

---
Tags: #리소스 #이모지 #금지목록
`
    },
    {
      name: '금지-색상조합.md',
      content: `---
title: 금지 색상 조합
date: ${new Date().toISOString().split('T')[0]}
category: 리소스
---

# 금지 색상 조합

## AI 전형 색상 조합

### 1. 파스텔 핑크+노랑+보라
\`\`\`css
#FF6B9D /* 핑크 */
#FEC84B /* 노랑 */
#8B5CF6 /* 보라 */
\`\`\`
**이유**: AI 생성 이미지의 가장 흔한 조합

### 2. 네온 멀티컬러
\`\`\`css
#00FF00 /* 네온 그린 */
#FF00FF /* 네온 마젠타 */
#00FFFF /* 네온 시안 */
#FFFF00 /* 네온 옐로우 */
\`\`\`
**이유**: 4가지 이상 네온 = 과도함

### 3. 파스텔 레인보우
\`\`\`css
#FFB3BA /* 연한 핑크 */
#FFDFBA /* 연한 주황 */
#FFFFBA /* 연한 노랑 */
#BAFFC9 /* 연한 초록 */
#BAE1FF /* 연한 파랑 */
\`\`\`
**이유**: 5가지 파스텔 = AI 스타일

---
Tags: #리소스 #색상 #금지조합
`
    }
  ]
};

/**
 * 메인 실행
 */
async function main() {
  console.log('🎨 Design Guardian 프로젝트 설정 시작...\n');

  let successCount = 0;
  let failCount = 0;

  for (const [folder, files] of Object.entries(PROJECT_STRUCTURE)) {
    console.log(`\n📁 ${folder}/`);

    for (const file of files) {
      const filePath = `${BASE_PATH}/${folder}/${file.name}`;
      const success = await createFile(filePath, file.content);

      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // API 요청 간격
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log('='.repeat(50));

  if (failCount === 0) {
    console.log('\n🎉 Design Guardian 프로젝트 설정 완료!');
    console.log(`📂 위치: F:\\obsidian\\Pola\\${BASE_PATH}`);
  } else {
    console.log('\n⚠️  일부 파일 생성에 실패했습니다.');
  }
}

main().catch(error => {
  console.error('❌ 오류:', error.message);
  process.exit(1);
});
