# 🔍 마이그레이션 검증 전략

## 🚨 핵심 문제
**Next.js가 app과 src/app 중 어느 것을 실제로 사용하는지 확실하지 않음**

## 📋 검증 방법

### 1. 실시간 검증 마커 추가
각 파일에 고유 식별자를 추가하여 프로덕션에서 어떤 파일이 렌더링되는지 확인

```typescript
// app/page.tsx
console.log('[MARKER] APP/PAGE.TSX LOADED');

// src/app/page.tsx
console.log('[MARKER] SRC/APP/PAGE.TSX LOADED');
```

### 2. 시각적 검증 요소
눈으로 바로 확인 가능한 요소 추가

```typescript
// app/page.tsx
<div data-source="app-directory" className="hidden">
  <!-- APP 디렉토리 사용 중 -->
</div>

// src/app/page.tsx
<div data-source="src-app-directory" className="hidden">
  <!-- SRC/APP 디렉토리 사용 중 -->
</div>
```

### 3. 빌드 출력 분석
```bash
# 빌드 시 어떤 파일이 포함되는지 확인
npm run build 2>&1 | grep -E "(app|src/app)" > build-analysis.log
```

### 4. Next.js 라우트 우선순위
Next.js 13+ App Router의 파일 우선순위:
1. `app/` 디렉토리
2. `src/app/` 디렉토리 (app이 없을 때만)

**⚠️ 중요: 동일한 라우트가 양쪽에 있으면 app/이 우선!**

## 🧪 단계별 테스트 프로토콜

### Phase 1: 현재 상태 확인
```bash
# 1. 각 디렉토리에 테스트 마커 추가
echo "<!-- APP DIRECTORY -->" >> app/page.tsx
echo "<!-- SRC/APP DIRECTORY -->" >> src/app/page.tsx

# 2. 배포
git add . && git commit -m "test: 디렉토리 우선순위 확인"
git push naraddon main

# 3. 프로덕션에서 소스 보기로 확인
# View Source에서 어떤 마커가 보이는지 확인
```

### Phase 2: API 라우트 테스트
```bash
# 테스트 API 엔드포인트 생성
# app/api/test/route.ts
export async function GET() {
  return Response.json({ source: 'app-directory' });
}

# src/app/api/test/route.ts
export async function GET() {
  return Response.json({ source: 'src-app-directory' });
}

# 배포 후 확인
curl https://naraddon.com/api/test
```

### Phase 3: 동적 확인 스크립트
```typescript
// app/components/SourceChecker.tsx
'use client';

export function SourceChecker() {
  useEffect(() => {
    fetch('/api/directory-check')
      .then(res => res.json())
      .then(data => {
        console.log('현재 사용 중인 디렉토리:', data.source);
        // 관리자에게 알림
        if (typeof window !== 'undefined') {
          window.__APP_SOURCE__ = data.source;
        }
      });
  }, []);

  return null;
}
```

## 🔄 안전한 마이그레이션 순서

### Step 1: 비파괴적 테스트
1. **양쪽에 마커 추가** (콘텐츠 변경 없이)
2. **배포 및 확인**
3. **사용 중인 디렉토리 파악**

### Step 2: 점진적 이동
```bash
# 1. 사용되지 않는 디렉토리의 파일부터 비활성화
mv src/app/unused-file.tsx src/app/unused-file.tsx.backup

# 2. 배포 및 확인
# 3. 문제 없으면 다음 파일 진행
```

### Step 3: 핵심 파일 교체
```bash
# 1. app 디렉토리에 새 버전 생성
cp src/app/critical-file.tsx app/critical-file-new.tsx

# 2. 내용 확인 및 수정
# 3. 원본 파일과 교체
mv app/critical-file.tsx app/critical-file-old.tsx
mv app/critical-file-new.tsx app/critical-file.tsx

# 4. src/app 파일 비활성화
mv src/app/critical-file.tsx src/app/critical-file.tsx.disabled
```

## ⚡ 빠른 롤백 전략

### 즉시 롤백 명령어
```bash
# 문제 발생 시 30초 내 롤백
git revert HEAD
git push naraddon main

# 또는 특정 커밋으로 롤백
git reset --hard <safe-commit-hash>
git push naraddon main --force
```

### 파일별 롤백
```bash
# 특정 파일만 이전 상태로
git checkout HEAD~1 -- app/problematic-file.tsx
git commit -m "fix: 문제 파일 롤백"
git push naraddon main
```

## 📊 검증 체크리스트

### 마이그레이션 전
- [ ] 현재 어떤 디렉토리가 사용 중인지 확인
- [ ] 각 페이지별 소스 디렉토리 매핑
- [ ] API 라우트 소스 확인

### 마이그레이션 중
- [ ] 각 변경사항 배포 후 즉시 테스트
- [ ] 브라우저 개발자 도구로 콘솔 확인
- [ ] 네트워크 탭에서 API 응답 확인

### 마이그레이션 후
- [ ] 모든 페이지 접속 테스트
- [ ] API 엔드포인트 테스트
- [ ] 에러 페이지 테스트 (404, 500)

## 🎯 검증 도구

### 1. 브라우저 콘솔 명령어
```javascript
// 현재 페이지가 어느 디렉토리에서 왔는지 확인
document.querySelector('[data-source]')?.getAttribute('data-source')

// 전역 변수로 확인
window.__APP_SOURCE__
```

### 2. cURL 테스트
```bash
# API 라우트 테스트
curl -s https://naraddon.com/api/health | jq .

# HTML 페이지 마커 확인
curl -s https://naraddon.com | grep -o "data-source=\"[^\"]*\""
```

### 3. 자동화 스크립트
```bash
#!/bin/bash
# check-source.sh

echo "Checking production source..."
RESPONSE=$(curl -s https://naraddon.com)

if echo "$RESPONSE" | grep -q "APP DIRECTORY"; then
  echo "✅ Using app/ directory"
elif echo "$RESPONSE" | grep -q "SRC/APP DIRECTORY"; then
  echo "⚠️ Using src/app/ directory"
else
  echo "❌ Cannot determine source directory"
fi
```

## ⚠️ 위험 신호

즉시 롤백이 필요한 상황:
- 🔴 500 에러 발생
- 🔴 페이지가 전혀 로드되지 않음
- 🔴 로그인 기능 작동 안 함
- 🔴 API 응답 없음
- 🟡 스타일 깨짐 (부분 롤백 고려)
- 🟡 콘솔 에러 다수 발생

## 📝 실시간 모니터링

```bash
# Vercel 로그 실시간 확인
vercel logs --follow

# 브라우저에서 확인할 사항
# 1. 개발자 도구 > Console
# 2. 개발자 도구 > Network > 실패한 요청
# 3. 소스 보기로 HTML 구조 확인
```