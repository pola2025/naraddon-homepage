# Claude Skill System

실행 가능한 Skill 시스템 - 개념에서 실체로

## 📁 구조

```
.claude/
├── skill-engine/              # Skill 실행 엔진
│   └── index.js              # 핵심 엔진 (Skill 로드/실행/로깅)
│
├── skills/                    # Skill 모듈
│   └── automation/
│       ├── metadata-auto-generator/
│       │   └── index.js      # 메타데이터 자동 생성
│       ├── obsidian-auto-doc/
│       │   └── index.js      # Obsidian 문서 자동 생성
│       └── skill-orchestrator/
│           └── index.js      # Skill 오케스트레이터
│
├── cli.js                     # Claude Skill CLI
├── obsidian-config.json       # Obsidian 설정
└── skill-execution-log.json   # 실행 로그
```

## 🚀 빠른 시작

### 1. Skill 목록 확인
```bash
node .claude/cli.js list
```

### 2. 워크플로우 목록
```bash
node .claude/cli.js workflows
```

### 3. 트러블슈팅 워크플로우 실행
```bash
node .claude/cli.js ts "관리자 403 에러 해결"
```

### 4. 기능개발 워크플로우 실행
```bash
node .claude/cli.js feat "이미지 업로드 기능 추가"
```

## 📋 사용 가능한 명령어

| 명령어 | 별칭 | 설명 |
|--------|------|------|
| `troubleshooting` | `ts` | 트러블슈팅 워크플로우 |
| `feature` | `feat` | 기능개발 워크플로우 |
| `architecture` | `arch` | 아키텍처 워크플로우 |
| `conversation` | `conv` | 대화기록 워크플로우 |
| `metadata` | - | 메타데이터 생성 Skill |
| `obsidian` | - | Obsidian 문서 생성 Skill |
| `list` | - | Skill 목록 |
| `workflows` | - | 워크플로우 목록 |
| `help` | - | 도움말 |

## 🎯 워크플로우

### 트러블슈팅 (troubleshooting)

```
POST Skills:
  1. metadata-auto-generator  → 메타데이터 80% 자동 생성
  2. obsidian-auto-doc        → Obsidian 문서 생성
```

**입력:**
- `conversation`: 대화 내용
- `modifiedFiles`: 수정된 파일 (Git diff)
- `gitDiff`: Git diff 내용

**출력:**
- Obsidian 문서 (`.md`)
- 실행 로그

**예시:**
```bash
node .claude/cli.js ts "관리자 페이지 403 에러 해결. JWT 콜백에서 role 조회 추가"
```

### 기능개발 (feature-development)

```
POST Skills:
  1. metadata-auto-generator  → 메타데이터 80% 자동 생성
  2. obsidian-auto-doc        → Obsidian 문서 생성
```

**예시:**
```bash
node .claude/cli.js feat "심사관 이미지 업로드 UX 개선 완료"
```

## 🔧 Skill 개발

### Skill 구조

```javascript
// .claude/skills/category/skill-name/index.js
module.exports = {
  name: 'skill-name',
  version: '1.0.0',
  description: 'Skill 설명',

  async run(context) {
    // Skill 로직
    return {
      // 결과
    };
  },
};
```

### 새 Skill 추가

1. 디렉토리 생성:
```bash
mkdir -p .claude/skills/category/new-skill
```

2. `index.js` 작성:
```javascript
module.exports = {
  name: 'new-skill',
  async run(context) {
    // 구현
    return { success: true };
  },
};
```

3. 워크플로우에 추가:
```javascript
// .claude/skills/automation/skill-orchestrator/index.js
this.workflows['troubleshooting'].post.push('category/new-skill');
```

## 📊 실행 로그

모든 Skill 실행은 자동으로 로깅됩니다:

```json
{
  "sessions": [
    {
      "timestamp": "2025-10-19T15:00:00.000Z",
      "skill": "automation/metadata-auto-generator",
      "duration": 45,
      "success": true,
      "context": {
        "taskType": "troubleshooting",
        "project": "나라똔"
      }
    }
  ]
}
```

로그 파일: `.claude/skill-execution-log.json`

## 🎯 메타데이터 자동 생성

`metadata-auto-generator` Skill은 다음을 자동으로 추론합니다:

### 100% 자동
- 날짜
- 프로젝트
- 프로젝트코드
- 상태

### 70-80% 자동
- 카테고리 (대화 키워드 기반)
- 기능모듈 (파일 경로 기반)
- 에러타입 (에러 메시지 파싱)
- 심각도 (컨텍스트 기반)

### 100% 자동 (태그)
- 프로젝트 태그
- 기능 모듈 중첩 태그
- 작업 유형 태그
- 상태/심각도 태그

**품질 점수:**
- 필수 필드: 40점
- 기능 모듈: 20점
- 카테고리별 특수 필드: 20점
- 상태: 20점

## 📝 Obsidian 문서 자동 생성

`obsidian-auto-doc` Skill은 REST API로 직접 Obsidian 문서를 생성합니다.

### 문서 구조

```markdown
---
title: 제목
날짜: 2025-10-19
프로젝트: 나라똔
카테고리: 트러블슈팅
tags:
  - 프로젝트/나라똔
  - 기능/관리자/인증
---

#나라똔 #관리자 #인증 #트러블슈팅

# 제목

## 본문

---

발생일시:: 2025-10-19
해결일시:: 2025-10-19
심각도:: High
```

### 파일 경로 규칙

```
Projects/{프로젝트}/{카테고리 폴더}/{날짜}-{제목}.md

예시:
Projects/나라똔/05-트러블슈팅/2025-10-19-관리자인증-403에러-JWT콜백미조회.md
Projects/나라똔/03-기능개발/2025-10-19-심사관이미지업로드-UX개선.md
```

## 🔗 Skill 체인

Skill은 서로 연결되어 실행됩니다:

```
사용자 요청
  ↓
Skill Orchestrator
  ↓
metadata-auto-generator
  ├→ 대화 분석
  ├→ Git diff 분석
  ├→ 파일 경로 분석
  ├→ 메타데이터 생성
  └→ 품질 검증
  ↓ (메타데이터 전달)
obsidian-auto-doc
  ├→ 본문 생성
  ├→ YAML 생성
  ├→ 해시태그 생성
  └→ Obsidian REST API 저장
  ↓
완료!
```

## 🌟 장점

### vs 기존 방식 (.md 문서)
| 항목 | 기존 | 개선 후 |
|------|------|---------|
| **실행** | 불가능 | 가능 ✅ |
| **자동화** | 수동 | 자동 ✅ |
| **일관성** | 낮음 | 높음 ✅ |
| **테스트** | 불가능 | 가능 ✅ |
| **확장성** | 어려움 | 쉬움 ✅ |

### vs Templater
| 항목 | Templater | Skill System |
|------|-----------|--------------|
| **사용자 입력** | 5-10개 프롬프트 | 0개 ✅ |
| **자동화** | 부분 자동 | 100% 자동 ✅ |
| **설정** | 폴더 템플릿 필요 | 불필요 ✅ |
| **품질 검증** | 없음 | 자동 검증 ✅ |

## 🔮 향후 계획

- [ ] 추가 Skill 개발
  - [ ] `request-result-validator`
  - [ ] `token-efficient-architecture`
  - [ ] `security-check`
- [ ] Skill 테스트 자동화
- [ ] Skill 성능 모니터링
- [ ] 웹 대시보드 구축
- [ ] Claude API 직접 통합

## 📞 문의

문제가 발생하면:
1. 로그 확인: `.claude/skill-execution-log.json`
2. 디버그 모드: `DEBUG=1 node .claude/cli.js <command>`
3. Skill 재로드: 캐시 클리어 후 재실행

---

**이제 Skill 시스템이 실제로 작동합니다!** 🎉
