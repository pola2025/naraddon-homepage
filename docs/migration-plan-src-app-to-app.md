# src/app → app 마이그레이션 계획

## 📅 작성일: 2025-01-25

## 🎯 목표
src/app 디렉토리의 컴포넌트를 app 디렉토리로 안전하게 마이그레이션하여 단일 앱 구조로 통합

## 📊 현재 상황 분석

### 1. 디렉토리 구조 비교

#### app 디렉토리에만 있는 항목
- ✅ 정상 작동 중

#### src/app에만 있는 항목 (마이그레이션 필요)
- `error.tsx` - 전역 에러 핸들링
- `global-error.tsx` - 전역 에러 바운더리
- `not-found.tsx` - 404 페이지
- `apple-icon.png` - Apple 터치 아이콘
- `icon.png` - 파비콘
- `page-metadata.ts` - 페이지 메타데이터 설정
- 백업 디렉토리들:
  - `consultation-request-backup-*`
  - `expert-services-backup-*`
  - `naraddon-tube-compare`

#### 양쪽에 존재하는 항목 (충돌 위험)
- `globals.css` - 전역 스타일
- `layout.tsx` - 루트 레이아웃
- `page.tsx` - 홈페이지
- 대부분의 기능 페이지들 (admin, business-voice, policy-news 등)

### 2. 이미 해결된 충돌
- ✅ `/api/auth/[...nextauth]` 라우트 - app만 사용
- ✅ `/auth/login` 페이지 - app만 사용
- ✅ `/auth/error` 페이지 - app만 사용

## 🚀 마이그레이션 전략

### Phase 1: 에러 처리 및 메타데이터 (우선순위: 높음)
1. **에러 핸들링 파일 마이그레이션**
   - src/app/error.tsx → app/error.tsx
   - src/app/global-error.tsx → app/global-error.tsx
   - src/app/not-found.tsx → app/not-found.tsx
   - **주의**: 기존 app에 이미 있을 수 있으니 확인 필요

2. **메타데이터 통합**
   - src/app/page-metadata.ts 내용을 app 구조에 맞게 통합
   - layout.tsx와 page.tsx의 메타데이터 설정 확인

### Phase 2: 정적 리소스 (우선순위: 중간)
1. **아이콘 파일 이동**
   - src/app/icon.png → app/icon.png
   - src/app/apple-icon.png → app/apple-icon.png
   - **확인**: Next.js 13+ 자동 파비콘 처리 기능 활용

### Phase 3: 스타일 통합 (우선순위: 높음)
1. **globals.css 비교 및 병합**
   - 두 파일의 차이점 분석
   - 중복 제거 및 통합
   - src/app 특유의 스타일 보존

### Phase 4: 레이아웃 통합 (우선순위: 높음)
1. **layout.tsx 비교**
   - Provider 구조 확인
   - 메타데이터 설정 확인
   - 폰트 설정 확인

### Phase 5: 페이지별 마이그레이션 (우선순위: 낮음)
1. **중복 페이지 확인**
   - 각 페이지의 기능 차이 분석
   - 더 완성도 높은 버전 선택
   - 점진적 마이그레이션

### Phase 6: 백업 정리 (우선순위: 낮음)
1. **백업 디렉토리 정리**
   - 필요한 내용 확인 후 제거
   - 별도 백업 위치로 이동

## 🔒 안전 조치

### 1. 백업 전략
```bash
# 마이그레이션 전 전체 백업
cp -r src/app backups/src-app-$(date +%Y%m%d-%H%M%S)
```

### 2. 단계별 테스트
- 각 Phase 완료 후 로컬 테스트
- 빌드 성공 확인
- 프로덕션 배포 전 스테이징 테스트

### 3. 롤백 계획
- Git 커밋 단위로 세분화
- 문제 발생 시 즉시 롤백 가능

## ⚠️ 주의사항

1. **import 경로 변경**
   - `@/src/app/*` → `@/app/*` 경로 변경 필요
   - 상대 경로 import 확인

2. **Next.js App Router 규칙**
   - 파일명 규칙 준수 (page.tsx, layout.tsx, error.tsx)
   - 메타데이터 export 방식 확인

3. **스타일 충돌**
   - CSS 모듈 스코프 확인
   - Tailwind 클래스 충돌 확인

4. **환경변수 참조**
   - src/app 특유의 환경변수 사용 확인

## 📝 체크리스트

### Pre-migration
- [ ] 전체 백업 생성
- [ ] 현재 빌드 상태 확인
- [ ] 의존성 분석 완료

### Phase 1
- [ ] error.tsx 마이그레이션
- [ ] global-error.tsx 마이그레이션
- [ ] not-found.tsx 마이그레이션
- [ ] 에러 핸들링 테스트

### Phase 2
- [ ] icon.png 이동
- [ ] apple-icon.png 이동
- [ ] 파비콘 표시 확인

### Phase 3
- [ ] globals.css 분석
- [ ] 스타일 병합
- [ ] 스타일 적용 확인

### Phase 4
- [ ] layout.tsx 비교
- [ ] Provider 구조 통합
- [ ] 메타데이터 통합

### Phase 5
- [ ] 페이지별 우선순위 결정
- [ ] 단계적 마이그레이션
- [ ] 기능 테스트

### Phase 6
- [ ] 백업 디렉토리 정리
- [ ] src/app 디렉토리 제거
- [ ] 최종 검증

### Post-migration
- [ ] 전체 빌드 테스트
- [ ] 프로덕션 배포
- [ ] 모니터링

## 📊 예상 일정
- Phase 1-3: 즉시 진행 가능 (1-2시간)
- Phase 4: 신중한 검토 필요 (2-3시간)
- Phase 5: 점진적 진행 (1-2일)
- Phase 6: 최종 정리 (30분)

## 🔄 진행 상태
- 현재: Phase 0 - 계획 수립 완료
- 다음: Phase 1 - 에러 핸들링 파일 마이그레이션