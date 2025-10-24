# Design Guardian Skill

**목적**: AI 스타일을 회피하고 일관된 디자인을 유지하며, 모든 변경사항을 Obsidian에 자동 기록합니다.

---

## 핵심 원칙

### 1. 색상 절제
- **금지**: 5가지 이상 원색, 무지개 그라디언트
- **권장**: 2-3가지 색상, 단색 그라디언트
- **네온 허용**: 절제하면 사용 가능
- **보라색 주의**: 컨셉 아닐 때 권장하지 않음

### 2. SVG 아이콘 우선
- **1순위**: Lucide/Heroicons SVG 아이콘
- **2순위**: 최소한의 의미있는 이모지
- **금지**: ✨🚀🔥💡🤖⚡🎯💻🌟⭐

### 3. Obsidian 자동 기록
- 모든 디자인 변경사항
- AI 패턴 검사 결과
- 트러블슈팅 과정

---

## 자동 실행 조건

다음 파일 수정 시 자동으로 AI 패턴 검사:
- `**/*.css`
- `**/*.scss`
- `**/*.module.css`
- `**/*.tsx` (스타일 관련)
- `**/*.jsx` (스타일 관련)

---

## 검사 항목

### 1. 색상 검사
```javascript
// 색상 개수 체크
const colors = extractHexColors(code);
if (colors.length > 3) {
  warn(`색상이 ${colors.length}개입니다. 3개 이하 권장`);
}

// 무지개 그라디언트 체크
if (hasRainbowGradient(code)) {
  error('무지개 그라디언트 감지! AI 스타일입니다.');
}

// AI 전형 조합 체크
const aiCombos = [
  ['#FF6B9D', '#FEC84B', '#8B5CF6'], // 핑크+노랑+보라
];
if (hasAIColorCombo(colors, aiCombos)) {
  error('AI 전형 색상 조합 감지!');
}

// 보라색 과다 사용 체크 (컨셉 아닐 때)
if (!isConceptPurple && hasManyPurple(colors)) {
  warn('보라색 과다 사용. AI 클리셰입니다.');
}
```

### 2. 이모지 검사
```javascript
const bannedEmojis = ['✨', '🚀', '🔥', '💡', '🤖', '⚡', '🎯', '💻', '🌟', '⭐'];
const found = code.match(/[\u{1F300}-\u{1F9FF}]/gu);

if (found) {
  const banned = found.filter(e => bannedEmojis.includes(e));
  if (banned.length > 0) {
    error(`금지 이모지 감지: ${banned.join(' ')}`);
    suggest('SVG 아이콘으로 교체하세요');
  }
}
```

### 3. 아이콘 검사
```javascript
// SVG import 확인
if (!code.includes('lucide-react') && !code.includes('heroicons')) {
  info('SVG 아이콘 라이브러리 사용을 권장합니다');
}

// HTML 내 이모지 확인
if (code.match(/<[^>]*>[\u{1F300}-\u{1F9FF}]/gu)) {
  warn('HTML 내 이모지 발견. SVG로 교체 권장');
}
```

---

## 워크플로우

### 변경 전 (Before Hook)
```
1. 파일 내용 읽기
2. AI 패턴 검사 실행
   - 색상 개수 체크
   - 금지 이모지 체크
   - 무지개 그라디언트 체크
   - 보라색 과다 사용 체크
3. 문제 발견 시 경고 표시
4. 사용자에게 계속 여부 확인
```

### 변경 후 (After Hook)
```
1. 변경 내용 분석
2. Obsidian에 자동 기록
   - 파일: Projects/디자인/01-변경기록/YYYY-MM-DD-{컴포넌트}-{변경}.md
   - 템플릿: design-change-template.md 사용
3. AI 패턴 검사 결과 포함
4. Git 커밋 시 요약 추가
```

---

## 오류 메시지 예시

### 색상 과다
```
⚠️ AI 스타일 감지!

발견된 문제:
- 총 6가지 색상 사용 (#FF6B9D, #FEC84B, #8B5CF6, #10B981, #00D9FF, #F59E0B)
- 권장: 3가지 이하

권장 수정:
Option 1 - 단색 중심
  --primary: #FF6B9D
  --secondary: #1A1A1A
  --accent: #FFFFFF

Option 2 - 네온 미니멀
  --primary: #00FF00
  --bg: #0A0A0A
  --text: #FFFFFF

계속 진행하시겠습니까? (Y/n)
```

### 금지 이모지
```
❌ 금지 이모지 감지!

Line 15: ✨ sparkles - AI 공식 상징
Line 23: 🚀 rocket - 스타트업 클리셰

권장 수정:
import { Sparkles, Rocket } from 'lucide-react';

<Sparkles className="w-5 h-5" />
<Rocket className="w-5 h-5" />

또는 텍스트로 교체:
"새로운 기능" (이모지 제거)
```

---

## Obsidian 기록 형식

### 변경기록
```markdown
---
title: Header-색상변경
date: 2025-10-20
component: Header
type: color-change
status: completed
---

# Header 색상 변경

## AI 패턴 검사 결과
- [x] 색상 3개 이하
- [x] 금지 이모지 없음
- [x] 무지개 그라디언트 없음

## 변경 내용
Before: 6가지 색상
After: 2가지 색상 (네온 그린 + 다크)

Tags: #디자인 #변경기록 #Header
```

---

## 설정 (obsidian-config.json)

```json
{
  "design": {
    "designRules": {
      "maxColors": 3,
      "bannedEmojis": ["✨", "🚀", "🔥", "💡", "🤖", "⚡", "🎯", "💻", "🌟", "⭐"],
      "preferSvgIcons": true,
      "neonAllowed": true,
      "purpleDiscouraged": true,
      "purpleAllowedWhenConcept": true
    }
  }
}
```

---

## 사용 예시

### CSS 파일 수정 시
```css
/* ❌ 수정 전 */
.card {
  background: linear-gradient(
    #FF6B9D, #FEC84B, #8B5CF6, #00D9FF
  );
}

/* [Design Guardian 실행] */
/* ⚠️ 4가지 색상 그라디언트 - AI 스타일! */

/* ✅ 수정 후 */
.card {
  background: linear-gradient(
    #00FF00, #00AA00
  );
}

/* [Obsidian 자동 기록] */
/* Projects/디자인/01-변경기록/2025-10-20-Card-그라디언트수정.md */
```

---

## 관련 문서

- [[색상-시스템]] - 색상 사용 규칙
- [[아이콘-규칙]] - SVG 아이콘 가이드
- [[AI-회피-패턴]] - AI 스타일 감지
- [[금지-이모지-목록]] - 금지 이모지 전체 목록
- [[금지-색상조합]] - 금지 색상 조합 목록

---

**버전**: 1.0.0
**작성일**: 2025-10-20
**작성자**: Design Guardian System
