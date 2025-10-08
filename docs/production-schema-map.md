# 🏗️ 프로덕션 스키마 맵 (Production Schema Map)

## 📅 최종 업데이트: 2025-01-25

## 🎯 디렉토리 구조 및 역할

### 📁 app/ (메인 프로덕션)
```
app/
├── api/                      # API 라우트
│   ├── auth/[...nextauth]/  # ✅ NextAuth 인증 (활성)
│   ├── admin/                # 관리자 API
│   ├── business-voice/       # 비즈니스 음성 서비스
│   ├── consultations/        # 상담 서비스
│   ├── policy-news/          # 정책 뉴스
│   └── ...
├── auth/                     # 인증 페이지
│   ├── login/               # ✅ 로그인 페이지 (활성)
│   └── error/               # ✅ 에러 페이지 (활성)
├── business-voice/          # 비즈니스 음성 페이지
├── consultation-request/    # 상담 신청
├── policy-news/            # 정책 뉴스
└── ...
```

### 📁 src/app/ (레거시/백업)
```
src/app/
├── api/
│   ├── auth/[...nextauth]/  # ❌ 비활성화됨 (.disabled)
│   └── ...                  # 기타 API (일부 활성)
├── auth/
│   ├── login/               # ❌ 비활성화됨 (.disabled)
│   └── error/               # ❌ 비활성화됨 (.disabled)
└── ...
```

## 🔗 페이지별 의존성 맵

### 1. 🔐 인증 시스템
| 페이지/API | 현재 위치 | 의존성 | 상태 |
|-----------|----------|--------|------|
| /auth/login | app/auth/login/page.tsx | NextAuth, mongodb | ✅ 활성 |
| /api/auth/[...nextauth] | app/api/auth/[...nextauth]/route.ts | mongodb, NextAuth | ✅ 활성 |
| /api/auth/error | app/api/auth/error/route.ts | - | ✅ 활성 |
| /api/auth/blacklist | src/app/api/auth/blacklist/route.ts | mongodb | ⚠️ 혼재 |

### 2. 👨‍💼 관리자 시스템
| 페이지/API | 현재 위치 | 의존성 | 상태 |
|-----------|----------|--------|------|
| /admin | app/admin/page.tsx | authOptions | ✅ 활성 |
| /admin/dashboard | app/admin/dashboard/page.tsx | admin-logger | ✅ 활성 |
| /api/admin/login | app/api/admin/login/route.ts | mongodb | ✅ 활성 |
| /api/admin/check-session | app/api/admin/check-session/route.ts | authOptions | ⚠️ 에러 |

### 3. 💼 비즈니스 음성
| 페이지/API | 현재 위치 | 의존성 | 상태 |
|-----------|----------|--------|------|
| /business-voice | app/business-voice/page.tsx | businessVoiceService | ✅ 활성 |
| /api/business-voice/ttontok | app/api/business-voice/ttontok/route.ts | mongodb | ✅ 활성 |
| /api/business-voice/ttontok/nicknames | app/api/business-voice/ttontok/nicknames/route.ts | mongodb | ⚠️ 에러 |

### 4. 📰 정책 뉴스
| 페이지/API | 현재 위치 | 의존성 | 상태 |
|-----------|----------|--------|------|
| /policy-news | app/policy-news/page.tsx | mongodb | ✅ 활성 |
| /api/policy-news | app/api/policy-news/route.ts | mongodb, r2 | ✅ 활성 |

### 5. 🤝 상담 서비스
| 페이지/API | 현재 위치 | 의존성 | 상태 |
|-----------|----------|--------|------|
| /consultation-request | app/consultation-request/page.tsx | - | ✅ 활성 |
| /api/consultations | app/api/consultations/route.ts | mongodb, notification-service | ✅ 활성 |

## 🔧 공유 라이브러리 의존성

### 📚 lib/ 디렉토리
| 파일 | 사용처 | 중요도 | 상태 |
|-----|--------|--------|------|
| mongodb.ts | 모든 API | 🔴 필수 | ✅ 복사됨 |
| mongodb-client.ts | API 일부 | 🔴 필수 | ❌ 미복사 |
| admin-logger.ts | Admin API | 🟡 중요 | ❌ src/lib만 |
| auth/ | 인증 관련 | 🔴 필수 | ❌ src/lib만 |
| csrf.ts | 보안 | 🟡 중요 | ❌ src/lib만 |
| notification-service.ts | 알림 | 🟡 중요 | ❌ src/lib만 |
| r2.ts | 파일 업로드 | 🟡 중요 | ❌ src/lib만 |
| rate-limit.ts | API 보안 | 🟡 중요 | ❌ src/lib만 |

## 🚨 현재 문제점 및 해결 방안

### 1. authOptions import 에러
**문제**: Admin API들이 `@/app/api/auth/[...nextauth]/route`에서 authOptions를 import
**해결**:
```typescript
// lib/auth-options.ts 생성
export const authOptions = {...}

// 양쪽에서 import
import { authOptions } from '@/lib/auth-options';
```

### 2. mongodb import 에러
**문제**: `{ connectDB }`를 named import로 시도
**해결**: ✅ 완료 (lib/mongodb.ts에 both export 추가)

### 3. src/lib 의존성
**문제**: 많은 중요 파일이 src/lib에만 있음
**해결**: 단계적으로 lib/로 복사 필요

## 📋 작업 우선순위

### 🔴 즉시 필요 (서비스 중단 방지)
1. authOptions 분리 → lib/auth-options.ts
2. mongodb-client.ts 복사
3. auth 디렉토리 복사

### 🟡 중요 (기능 영향)
1. notification-service.ts
2. r2.ts (파일 업로드)
3. admin-logger.ts

### 🟢 개선 (성능/보안)
1. rate-limit.ts
2. csrf.ts
3. performance-monitor.ts

## 🔄 마이그레이션 체크리스트

- [x] mongodb.ts → lib/
- [ ] authOptions 분리
- [ ] mongodb-client.ts → lib/
- [ ] auth/ → lib/
- [ ] notification-service.ts → lib/
- [ ] r2.ts → lib/
- [ ] admin-logger.ts → lib/
- [ ] src/app → src/app-backup 이름 변경
- [ ] 빌드 테스트
- [ ] 프로덕션 배포

## 📝 검증 명령어

```bash
# 어느 디렉토리가 사용되는지 확인
npm run build 2>&1 | grep "app\|src/app"

# import 경로 확인
grep -r "from '@/lib" app/
grep -r "from '@/src" app/

# 중복 파일 찾기
find app src/app -name "*.tsx" -o -name "*.ts" | xargs basename | sort | uniq -d
```

## ⚡ 빠른 롤백 계획

```bash
# 문제 발생 시
git reset --hard HEAD~1
git push --force

# 또는 특정 파일만
git checkout HEAD~1 -- 문제파일
git commit -m "fix: 롤백"
git push
```