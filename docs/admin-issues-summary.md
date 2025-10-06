# Admin 구조 문제점 요약

## 🔴 핵심 문제

### 1. 이원화된 Admin 구조
```
/admin/naraddon-tube/        ← 목록만 (기능 없음)
/naraddon-tube/admin/         ← 실제 관리 기능 + 별도 인증
```

### 2. 중복 인증 시스템
```
1. NextAuth (네이버 로그인)
2. Admin 비밀번호 (ADMIN_PASSWORD)
3. 나라똔튜브 비밀번호 (NARADDON_TUBE_PASSWORD) ← 불필요
4. 비즈니스보이스 비밀번호 ← 불필요
5. 정책소식 비밀번호 ← 불필요
```

### 3. 긴 코드 & 복잡한 로직
- `/app/naraddon-tube/admin/page.tsx`: **590줄**
- 인증, UI, 데이터 처리 모두 한 파일에
- 컴포넌트 분리 안됨

### 4. CSS 불일치
- Admin 레이아웃: Tailwind CSS
- 나라똔튜브 Admin: 별도 CSS 파일

## ✅ 해결 방안

### 즉시 조치 (단순화)

#### 1. 나라똔튜브 Admin 컴포넌트 분리
```
/app/naraddon-tube/admin/
├── page.tsx (100줄 이하)
├── components/
│   ├── VideoForm.tsx        # 영상 등록/수정 폼
│   ├── VideoList.tsx        # 영상 목록 테이블
│   └── ThumbnailUpload.tsx  # 썸네일 업로드
└── hooks/
    └── useNaraddonTube.tsx  # 데이터 관리 로직
```

#### 2. 인증 단순화
```typescript
// 하나의 체크만
if (userRole === 'admin' || userRole === 'super_admin') {
  // 바로 접근 허용
}
```

#### 3. 통합 제안
```
/admin/
├── layout.tsx (통합 인증)
├── dashboard/
├── naraddon-tube/  ← 여기로 통합
├── business-voice/
├── policy-news/
└── expert-services/
```

## 📋 작업 우선순위

1. **긴급 (지금)**: 나라똔튜브 Admin 컴포넌트 분리
2. **중요 (다음)**: 중복 인증 제거
3. **권장 (이후)**: 전체 Admin 통합

어떤 작업부터 진행할까요?
