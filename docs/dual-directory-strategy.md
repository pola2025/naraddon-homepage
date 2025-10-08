# 🎯 이중 디렉토리 전략 (app vs src/app)

## 📌 Next.js 기본 동작
- **app/** 디렉토리가 있으면 → app/ 사용
- **app/** 없고 **src/app**만 있으면 → src/app 사용
- **둘 다 있으면** → app/만 사용 (src/app 무시)

## 🚀 제안하는 해결 방법

### Option 1: 역할별 명확한 분리 (권장)
```
프로젝트 구조:
├── app/              # 메인 애플리케이션 (프로덕션)
├── src/
│   ├── app-legacy/   # 이전 버전 (백업/참조용)
│   ├── lib/          # 공유 라이브러리
│   ├── components/   # 공유 컴포넌트
│   └── utils/        # 유틸리티
└── lib/              # app에서 사용할 라이브러리
```

**장점:**
- 충돌 없음
- 명확한 구조
- 점진적 마이그레이션 가능

### Option 2: 환경변수 기반 조건부 사용
```javascript
// next.config.js
const useSourceApp = process.env.USE_SOURCE_APP === 'true';

module.exports = {
  // 조건부 리다이렉트
  async redirects() {
    if (useSourceApp) {
      return [
        {
          source: '/:path*',
          destination: '/legacy/:path*',
          permanent: false,
        }
      ];
    }
    return [];
  },

  // Webpack alias 설정
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/lib': useSourceApp ? 'src/lib' : 'lib',
      '@/components': useSourceApp ? 'src/components' : 'components',
    };
    return config;
  }
};
```

### Option 3: tsconfig.json 경로 매핑 통합
```json
{
  "compilerOptions": {
    "paths": {
      "@/lib/*": ["lib/*", "src/lib/*"],
      "@/components/*": ["components/*", "src/components/*"],
      "@/app/*": ["app/*"],
      "@/src/*": ["src/*"]
    }
  }
}
```

## 🔧 즉시 실행 가능한 액션

### Step 1: src/app 백업 및 이름 변경
```bash
# src/app을 src/app-legacy로 이름 변경
mv src/app src/app-legacy

# 또는 백업 생성
cp -r src/app backups/src-app-$(date +%Y%m%d)
```

### Step 2: 공유 라이브러리 통합
```bash
# src/lib과 lib 병합
cp -r src/lib/* lib/
```

### Step 3: tsconfig.json 수정
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/lib/*": ["lib/*"],
      "@/components/*": ["components/*"],
      "@/app/*": ["app/*"]
    }
  }
}
```

## ⚠️ 주의사항

### 현재 문제점
1. **app과 src/app이 동시에 존재** → 충돌
2. **lib이 두 곳에 분산** → import 에러
3. **export 방식 불일치** → default vs named

### 해결 우선순위
1. ✅ lib 디렉토리 통합 (완료: mongodb.ts 복사)
2. 🔄 src/app → src/app-legacy 이름 변경
3. ⏳ 필요한 컴포넌트만 app으로 이동
4. ⏳ import 경로 정리

## 🎯 최종 목표
```
app/           # 단일 메인 애플리케이션
lib/           # 모든 공유 라이브러리
components/    # 모든 공유 컴포넌트
src/           # 삭제 또는 legacy로 보관
```

## 📝 검증 방법
```bash
# 빌드 테스트
npm run build

# 특정 파일이 어디서 로드되는지 확인
grep -r "from '@/lib" app/
grep -r "from '@/lib" src/

# 중복 파일 찾기
find . -name "*.tsx" -exec basename {} \; | sort | uniq -d
```