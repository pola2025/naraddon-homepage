# Design Guardian Skill

AI 스타일을 회피하고 일관된 디자인을 유지하는 Claude Skill입니다.

## 개요

Design Guardian는 다음을 자동으로 수행합니다:

1. **AI 패턴 감지**: 색상, 이모지, 레이아웃 검사
2. **실시간 경고**: 문제 발견 시 즉시 알림
3. **Obsidian 기록**: 모든 변경사항 자동 문서화

## 설치

### 1. 필수 조건
- Obsidian REST API 플러그인 설치
- Node.js 18 이상

### 2. Skill 활성화
```bash
# Obsidian 연결 확인
node scripts/obsidian-api-client.js list Projects/디자인

# Design Guardian 초기 설정
node scripts/setup-design-project.js
node scripts/create-design-templates.js
```

### 3. 설정 확인
`.claude/obsidian-config.json`에서 디자인 프로젝트 설정 확인:
```json
{
  "design": {
    "designRules": {
      "maxColors": 3,
      "bannedEmojis": ["✨", "🚀", "🔥", ...],
      "preferSvgIcons": true,
      "neonAllowed": true,
      "purpleDiscouraged": true
    }
  }
}
```

## 사용법

### 자동 실행
CSS, SCSS, TSX 파일 수정 시 자동으로 실행됩니다.

### 수동 실행
```bash
# 특정 파일 검사
node scripts/check-design-patterns.js src/components/Header.tsx

# 전체 프로젝트 검사
node scripts/check-design-patterns.js
```

## 핵심 규칙

### 색상
- ✅ 2-3가지 색상
- ✅ 네온 허용 (절제)
- ❌ 5가지 이상 원색
- ❌ 무지개 그라디언트
- ⚠️ 보라색 (컨셉 아닐 때)

### 아이콘
- ✅ SVG (Lucide, Heroicons)
- ⚠️ 최소한의 이모지
- ❌ ✨🚀🔥💡🤖⚡🎯💻

### 레이아웃
- ✅ 의미있는 구조
- ❌ 획일적 패턴
- ❌ 과도한 블러

## 파일 구조

```
.claude/skills/design-guardian/
├─ skill.md              # Skill 정의
├─ patterns.json         # 금지 패턴 목록
├─ README.md            # 이 파일
└─ utils/
   ├─ color-detector.js # 색상 검사
   ├─ emoji-detector.js # 이모지 검사
   └─ obsidian-logger.js # Obsidian 기록
```

## Obsidian 문서 위치

```
F:\obsidian\Pola\Projects\디자인\
├─ 00-가이드라인/
│  ├─ 색상-시스템.md
│  ├─ 아이콘-규칙.md
│  └─ AI-회피-패턴.md
├─ 01-변경기록/      # 여기에 자동 기록됨
├─ 02-트러블슈팅/
├─ 03-검토기록/
└─ 99-리소스/
```

## 예시

### Before (AI 스타일)
```css
.card {
  background: linear-gradient(
    #FF6B9D, #FEC84B, #8B5CF6, #00D9FF
  );
}
```

**문제**: 4가지 색상 그라디언트

### After (개선)
```css
.card {
  background: linear-gradient(
    #00FF00, #00AA00
  );
}
```

**개선**: 2색 그라디언트 (네온 그린 계열)

## 트러블슈팅

### Obsidian 연결 실패
```bash
# REST API 플러그인 재시작
# Obsidian에서 Ctrl+R

# 토큰 확인
cat .claude/obsidian-config.json
```

### 템플릿 인식 안 됨
```bash
# 템플릿 재생성
node scripts/create-design-templates.js

# Templater 플러그인 재시작
```

## 버전

- **v1.0.0** (2025-10-20): 초기 릴리스
  - 색상 검사
  - 이모지 검사
  - Obsidian 자동 기록

## 라이선스

MIT

## 문의

Issues: https://github.com/your-repo/issues
