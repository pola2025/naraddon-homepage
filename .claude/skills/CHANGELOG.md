# Skill 시스템 변경 이력

Skill 시스템의 모든 변경사항을 추적합니다.

---

## [1.2.0] - 2025-10-19

### ✨ 추가 (Added)

#### 기업심사관 프로젝트 - 웹훅 및 폼 생성 자동화

**webhook-generator**
- **파일**: `.claude/skills/project-specific/fundheallab/webhook-generator/index.js`
- **버전**: 1.0.0
- **기능**:
  - Google Apps Script 웹훅 자동 생성
  - 텔레그램 봇 연동 (고정 토큰: `7947112373:AAGXL3AO9D8jkWnFkuUmU_VQbNpvOWHZREI`)
  - 브랜드별 텔레그램 채팅 ID 설정
  - 폼 데이터 → Google Sheets 저장
  - 텔레그램 알림 전송
  - 이메일 알림 (HTML 템플릿, 브랜드 컬러 적용)
- **CLI**: `node .claude/cli.js webhook "브랜드명" "텔레그램채팅ID" "스프레드시트ID"`

**form-generator**
- **파일**: `.claude/skills/project-specific/fundheallab/form-generator/index.js`
- **버전**: 1.0.0
- **기능**:
  - 브랜드별 입력폼 자동 생성
  - 좌측 브랜드 정보 업데이트 (브랜드명, 전화번호, 컬러)
  - 입력 필드 구조 유지
  - 페이지 타입별 폼 생성 (main, fund, pro, mkt)
  - **mkt 폼 특별 규칙**: 브랜드명/전화번호만 수정, 컬러 변경 금지
- **규칙**:
  - Main 폼: 브랜드 정보 + 컬러 업데이트
  - mkt 폼: 브랜드 정보만, 컬러/코드 변경 금지
- **CLI**: `node .claude/cli.js form "브랜드명" main s20251017bcddee2e53649`

**section-id-mapper**
- **파일**: `.claude/skills/project-specific/fundheallab/section-id-mapper/index.js`
- **버전**: 1.0.0
- **기능**:
  - 섹션 ID ↔ txt 파일명 자동 매핑
  - 공통 컴포넌트 vs 페이지 컴포넌트 구분
  - 섹션 ID 형식 검증
  - 중복 ID 감지
  - mkt Form 특별 규칙 확인
  - 마크다운 테이블 생성 (DESIGN_CONCEPT.md용)
- **매핑 예시**:
  - `main_header.txt` → `s20251017bcddee2e53649`
  - `home_hero.txt` → `s20251017bcddee2e53651`
  - `mkt_form.txt` → `s20251017bcddee2e53654` (특별 규칙 적용)
- **CLI**: `node .claude/cli.js map-ids section-ids.json`

#### CLI 통합

**.claude/cli.js 추가 명령어:**
```bash
# 웹훅 생성
generate-webhook, webhook      # Google Apps Script 웹훅 생성
node .claude/cli.js webhook "자금치유연구소" "-1234567890"

# 입력폼 생성
generate-form, form            # 브랜드별 입력폼 생성
node .claude/cli.js form "자금치유연구소" main s20251017bcddee2e53649

# 섹션 ID 매핑
map-section-ids, map-ids       # 섹션 ID ↔ 파일명 매핑
node .claude/cli.js map-ids section-ids.json
```

---

## [1.1.0] - 2025-10-19

### ✨ 추가 (Added)

#### 기업심사관 프로젝트 Skill 시스템

**프로젝트 구조:**
- **상위 폴더**: `bas_homepage/` (여러 브랜드 프로젝트 관리)
- **프로젝트 경로**: `.claude/skills/project-specific/fundheallab/`

**워크플로우:**
```
1. 아임웹 복제
2. 브랜드 정보 입력 → DESIGN_CONCEPT.md 생성
3. 코드 위젯 업데이트 (검증 포함)
4. 제작 완료
```

#### brand-info-collector
- **파일**: `.claude/skills/project-specific/fundheallab/brand-info-collector/index.js`
- **버전**: 1.0.0
- **기능**:
  - 브랜드 정보 수집 (브랜드명, 도메인, 로고, 컬러, 연락처 등)
  - DESIGN_CONCEPT.md 자동 생성
  - 서브도메인 구조 생성 (home, company, process, fund, pro, mkt)
  - 섹션 ID 매핑 생성 (txt 파일명 → 섹션 ID)
  - 프로젝트 구조 생성
- **출력**:
  - DESIGN_CONCEPT.md (컬러 팔레트, 서브도메인, 디자인 효과, 개발 규칙)
  - `F:\bas_homepage\[브랜드명]\DESIGN_CONCEPT.md` 자동 저장

#### subdomain-validator
- **파일**: `.claude/skills/project-specific/fundheallab/subdomain-validator/index.js`
- **버전**: 1.0.0
- **기능**:
  - 서브도메인 규칙 준수 검증
  - 6개 서브도메인 (home, company, process, fund, pro, mkt)
  - 상대 경로 → 서브도메인 URL 변환 제안
  - 잘못된 도메인 감지
- **검증 항목**:
  - ✅ 절대 URL 사용 (`https://company.example.com`)
  - ❌ 상대 경로 사용 금지 (`/about`)

#### design-rules-validator
- **파일**: `.claude/skills/project-specific/fundheallab/design-rules-validator/index.js`
- **버전**: 1.0.0
- **기능**:
  - 컬러 팔레트 검증 (#0f172e 다크 블루, #d4af37 네온 골드)
  - Glassmorphism 효과 검증 (backdrop-filter, 반투명 배경)
  - Neon Glow 효과 검증 (box-shadow, text-shadow)
- **검증 항목**:
  - 금지된 컬러 (#000000 순수 검은색)
  - 필수 효과 속성 확인

#### section-id-validator
- **파일**: `.claude/skills/project-specific/fundheallab/section-id-validator/index.js`
- **버전**: 1.0.0
- **기능**:
  - 섹션 ID 명명 규칙 검증 (kebab-case)
  - 중복 ID 검사
  - 페이지별 필수 섹션 ID 확인
  - HTML 유효성 검증
- **검증 항목**:
  - ✅ kebab-case (`hero-section`, `contact-form`)
  - ❌ 숫자로 시작 금지
  - ⚠️ **섹션 ID 제거 금지** (디자인 우선순위 깨짐 방지)

#### component-validator
- **파일**: `.claude/skills/project-specific/fundheallab/component-validator/index.js`
- **버전**: 1.0.0
- **기능**:
  - Header/Footer 공통 컴포넌트 규칙 검증
  - Form 규칙 검증 (mkt Form 특별 보호)
  - 브랜드 정보 적용 확인
- **검증 항목**:
  - Header/Footer: 브랜드명, 로고, 컬러만 변경
  - Form: 입력 양식 유지, 브랜드 정보만 교체
  - **mkt Form**: 브랜드명/전화번호만 수정, 코드/컬러 변경 금지
  - "홈페이지 접수" 표시 필수

#### text-rewriter-validator
- **파일**: `.claude/skills/project-specific/fundheallab/text-rewriter-validator/index.js`
- **버전**: 1.0.0
- **기능**:
  - 텍스트 재작성 규칙 검증
  - 글자수 유사성 검증 (±10%)
  - 금지 용어 검증
  - 복잡한 표현 검증
- **검증 항목**:
  - ✅ 의미와 맥락 유지
  - ✅ 글자수 유사 (±10%)
  - ❌ "경영제도", "사전 준비" 등 금지 용어
  - ❌ 과도한 철학이나 복잡한 설명
  - **제외 대상**: Header, Footer, Form (공통 컴포넌트)

#### homepage-builder-orchestrator
- **파일**: `.claude/skills/project-specific/fundheallab/homepage-builder-orchestrator/index.js`
- **버전**: 1.0.0
- **기능**:
  - 전체 홈페이지 제작 워크플로우 지휘
  - 3단계 실행 (collect-info, validate, deploy)
  - 5개 검증 Skill 자동 실행
  - 위반사항 발견 시 자동 중단
  - 사용자 확인 후 진행
- **워크플로우**:
  1. 브랜드 정보 수집 → 사용자 확인
  2. 코드 위젯 검증 (5개 Skill) → 위반 시 중단
  3. 배포 준비
- **안전장치**:
  - 모든 위반사항은 사용자 확인 필요
  - `skipConfirmation` 플래그로 강제 진행 가능 (비권장)

#### CLI 명령어 추가
- **파일**: `.claude/cli.js`
- **추가된 명령어**:
  ```bash
  # 검증 명령어
  validate-component, component   # 컴포넌트 규칙 검증
  validate-text, text             # 텍스트 재작성 검증

  # 워크플로우 명령어
  build-homepage, build           # 전체 워크플로우
  collect-brand-info, brand       # 브랜드 정보 수집
  ```
- **사용 예시**:
  ```bash
  node .claude/cli.js brand "자금치유연구소" "fundheallab.com"
  node .claude/cli.js build all
  node .claude/cli.js component main_header.txt header
  node .claude/cli.js text original.txt rewritten.txt hero
  ```

#### Obsidian 프로젝트 구조
- **프로젝트 경로**: `F:\obsidian\Pola\Projects\bas_homepage\`
- **하위 프로젝트**: `[브랜드명]/`
- **문서**:
  - `README.md` - 프로젝트 개요
  - `00-디자인시스템/검증규칙요약.md`
  - `01-워크플로우/홈페이지제작워크플로우.md`

#### Obsidian 설정
- **파일**: `.claude/obsidian-config.json`
- **추가된 프로젝트**:
  ```json
  "fundheallab": {
    "name": "기업심사관",
    "path": "Projects/기업심사관",
    "designRules": {
      "colorPalette": {
        "primary": "#0f172e",
        "accent": "#d4af37"
      },
      "effects": ["glassmorphism", "neon-glow"],
      "subdomainRequired": true,
      "sectionIdRequired": true
    }
  }
  ```

### 📚 문서 (Docs)

- **홈페이지 제작 워크플로우**: `F:\obsidian\Pola\Projects\기업심사관\01-워크플로우\홈페이지제작워크플로우.md`
- **검증 규칙 요약**: `F:\obsidian\Pola\Projects\기업심사관\00-디자인시스템\검증규칙요약.md`
- **bas_homepage README**: `F:\obsidian\Pola\Projects\bas_homepage\README.md`

---

## [1.0.0] - 2025-10-19

### ✨ 추가 (Added)

#### Skill Engine
- **파일**: `.claude/skill-engine/index.js`
- **기능**:
  - Skill 로드 및 실행
  - 캐시 시스템
  - 실행 로그 자동 저장
  - Skill 목록 스캔
- **메서드**:
  - `execute(skillPath, context)` - Skill 실행
  - `loadSkill(skillPath)` - Skill 로드
  - `listSkills()` - 사용 가능한 Skill 목록
  - `logExecution()` - 실행 로그 저장

#### metadata-auto-generator
- **파일**: `.claude/skills/automation/metadata-auto-generator/index.js`
- **버전**: 1.0.0
- **기능**:
  - 대화 분석으로 80-90% 메타데이터 자동 생성
  - Git diff 기반 파일 분석
  - 프로젝트/카테고리/기능모듈 자동 감지
  - 에러 타입 추출 (403, 500, CORS 등)
  - 심각도 자동 계산
  - 중첩 태그 자동 생성
  - 품질 점수 계산 (0-100)
- **자동 추론**:
  - 100% 자동: 날짜, 프로젝트, 프로젝트코드, 상태
  - 70-80% 자동: 카테고리, 기능모듈, 에러타입, 심각도
  - 100% 자동: 태그 (프로젝트/기능/작업유형/상태)
- **품질 검증**: 완성도, 누락 필드, 품질 점수

#### obsidian-auto-doc
- **파일**: `.claude/skills/automation/obsidian-auto-doc/index.js`
- **버전**: 1.0.0
- **기능**:
  - REST API로 Obsidian 문서 직접 생성
  - 카테고리별 본문 템플릿 (트러블슈팅/기능개발/대화기록)
  - YAML Front Matter 생성
  - 해시태그 라인 생성
  - 인라인 메타데이터 (Dataview용)
  - 생성 시간 주석 (한국시간 + UTC)
- **문서 구조**:
  - YAML Front Matter
  - 해시태그 (#tag1 #tag2)
  - 제목 (# Title)
  - 본문 (카테고리별 템플릿)
  - 인라인 메타데이터 (field:: value)
  - 타임스탬프 주석
- **파일 경로 규칙**: `Projects/{프로젝트}/{카테고리}/{날짜}-{제목}.md`

#### skill-orchestrator
- **파일**: `.claude/skills/automation/skill-orchestrator/index.js`
- **버전**: 1.0.0
- **기능**:
  - 워크플로우 자동 실행
  - Skill 체인 관리
  - 실행 결과 요약
  - 워크플로우 동적 추가
- **워크플로우**:
  - `troubleshooting`: 트러블슈팅
  - `feature-development`: 기능개발
  - `architecture`: 아키텍처
  - `conversation`: 대화기록
- **실행 단계**: PRE Skills → 메인 작업 → POST Skills

#### Claude CLI
- **파일**: `.claude/cli.js`
- **버전**: 1.0.0
- **명령어**:
  - `ts|troubleshooting` - 트러블슈팅 워크플로우
  - `feat|feature` - 기능개발 워크플로우
  - `arch|architecture` - 아키텍처 워크플로우
  - `conv|conversation` - 대화기록 워크플로우
  - `metadata` - 메타데이터 생성 Skill
  - `obsidian` - Obsidian 문서 생성 Skill
  - `list` - Skill 목록
  - `workflows` - 워크플로우 목록
  - `help` - 도움말
- **컨텍스트 수집**:
  - Git diff 자동 수집
  - 수정된 파일 목록
  - 대화 내용 (환경변수/인자)
- **결과 저장**: `.claude/results/` (JSON)

#### 집첵 프로젝트 - UX Writing Validator
- **파일**: `.claude/skills/quality/ux-writing-validator/index.js`
- **버전**: 1.0.0
- **프로젝트**: 집첵 (부동산 체크리스트 서비스)
- **기능**: 토스 스타일 UX Writing 규칙 검증
- **검증 규칙** (9개):
  1. 존댓말 사용 (high)
  2. 문장 길이 (medium)
  3. 불필요한 수식어 (low)
  4. 사용자 관점 (medium)
  5. 부정 표현 (low)
  6. CTA 명확성 (high)
  7. 용어 일관성 (medium)
  8. 숫자 가독성 (low)
  9. 전문용어 (medium)
- **CLI**: `node .claude/cli.js ux "저장했어요"`

---

## 🔮 향후 계획

### v1.2.0 (계획)
- [ ] 컴포넌트 자동 생성 Skill
- [ ] Airtable 연동 Skill (섹션 ID 자동 매핑)
- [ ] 웹훅 설정 자동화
- [ ] Google Sheets 연동
- [ ] 텔레그램 알림 자동화

### v1.3.0 (계획)
- [ ] 웹 대시보드
- [ ] 실시간 모니터링
- [ ] 성능 최적화
- [ ] 병렬 Skill 실행

---

## 📝 변경 형식

### 타입
- ✨ **Added**: 새로운 기능 추가
- 🔧 **Changed**: 기존 기능 변경
- 🐛 **Fixed**: 버그 수정
- 🗑️ **Removed**: 기능 제거
- ⚡ **Improved**: 성능 개선
- 📚 **Docs**: 문서 업데이트

### 작성 예시
```markdown
## [버전] - YYYY-MM-DD

### ✨ 추가
- **파일**: 경로
- **기능**: 설명
- **변경사항**: 상세 내용
```

---

<!-- 자동 업데이트 영역 -->
