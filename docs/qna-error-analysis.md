# Business Voice Q&A - 오류 위험 분석

## 📋 현재 작동 상태 분석

### ✅ 정상 동작 확인
- MongoDB 연결 성공
- API 엔드포인트 정상 응답 (`/api/business-voice/questions`)
- 데이터 직렬화 정상 (answers, metrics 등)
- TypeScript 컴파일 성공

### ⚠️ 발견된 경고 (비즈니스 로직에 영향 없음)
1. **Sentry 설정 경고**
   ```
   prismaIntegration is not exported from '@sentry/nextjs'
   ```
   - **영향**: 없음 (Sentry 모니터링만 영향)
   - **해결**: Sentry 설정 업데이트 필요 (선택사항)

2. **Tailwind CSS 경고**
   ```
   @tailwindcss/line-clamp plugin is now included by default
   ```
   - **영향**: 없음 (스타일링 정상)
   - **해결**: `tailwind.config.js`에서 플러그인 제거

---

## 🔍 잠재적 오류 위험 분석

### 1. MongoDB 연결 오류 위험 ⚠️

#### 문제점
```typescript
// src/lib/mongodb.ts
// MongoDB 연결이 실패할 경우 에러 처리 부족
```

#### 현재 상태
```typescript
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
```

#### 위험 시나리오
1. **MongoDB Atlas 다운타임**
   - 증상: API 500 에러
   - 영향: 전체 서비스 중단
   - 확률: 낮음 (Atlas 99.95% uptime)

2. **네트워크 타임아웃**
   - 증상: 30초 후 타임아웃
   - 영향: 사용자 대기 시간 증가
   - 확률: 중간

3. **연결 풀 고갈**
   - 증상: `MongoServerSelectionError`
   - 영향: 신규 요청 실패
   - 확률: 트래픽 급증 시

#### 해결 방안
```typescript
// connectDB에 타임아웃 추가
const CONNECT_TIMEOUT = 10000; // 10초

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: CONNECT_TIMEOUT,
      socketTimeoutMS: CONNECT_TIMEOUT,
      maxPoolSize: 10, // 연결 풀 제한
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('[MongoDB] Connection failed:', e);
    throw new Error('Database connection failed');
  }

  return cached.conn;
}
```

---

### 2. 답변 데이터 직렬화 오류 위험 ⚠️

#### 문제점
```typescript
// src/lib/businessVoiceService.ts
const serializeAnswer = (answer: BusinessVoiceAnswer): BusinessVoiceAnswerDto => {
  // profileId가 ObjectId일 때 toString() 호출
  let profileId: string | undefined;
  if (typeof profileIdValue === 'string') {
    profileId = profileIdValue;
  } else if (
    profileIdValue &&
    typeof (profileIdValue as { toString?: () => string }).toString === 'function'
  ) {
    profileId = (profileIdValue as { toString: () => string }).toString();
  }
  // ...
};
```

#### 위험 시나리오
1. **profileId가 null일 때**
   - 현재 처리: undefined 반환 (정상)
   - 위험: 없음

2. **answeredAt가 잘못된 형식일 때**
   ```typescript
   // 현재 코드
   if (typeof answeredAtValue === 'string') {
     answeredAt = new Date(answeredAtValue).toISOString();
   } else if (answeredAtValue instanceof Date) {
     answeredAt = answeredAtValue.toISOString();
   }
   ```
   - 위험: `new Date('invalid')` → `"Invalid Date"` → JSON 파싱 오류
   - 확률: 낮음 (MongoDB Date 타입 보장)

#### 해결 방안
```typescript
const serializeAnswer = (answer: BusinessVoiceAnswer): BusinessVoiceAnswerDto => {
  // ... 기존 코드

  // answeredAt 안전 처리
  let answeredAt: string | undefined;
  try {
    if (typeof answeredAtValue === 'string') {
      const date = new Date(answeredAtValue);
      if (!isNaN(date.getTime())) {
        answeredAt = date.toISOString();
      }
    } else if (answeredAtValue instanceof Date) {
      if (!isNaN(answeredAtValue.getTime())) {
        answeredAt = answeredAtValue.toISOString();
      }
    }
  } catch (error) {
    console.error('[serializeAnswer] Invalid answeredAt:', answeredAtValue);
  }

  return {
    // ...
    answeredAt,
  };
};
```

---

### 3. API 에러 처리 부족 위험 ⚠️

#### 문제점
```typescript
// app/api/business-voice/questions/route.ts
export async function GET(request: NextRequest) {
  try {
    const questions = await getBusinessVoiceQuestions({
      category,
      limit,
      needsExpertReply,
    });

    return NextResponse.json({ questions, count: questions.length });
  } catch (error) {
    console.error('[business-voice] GET /api/business-voice/questions error', error);
    return NextResponse.json(
      { message: 'Failed to load Business Voice questions.' },
      { status: 500 }
    );
  }
}
```

#### 위험 시나리오
1. **에러 상세 정보 손실**
   - 증상: 로그에만 `console.error`, 클라이언트는 일반 메시지만 받음
   - 영향: 디버깅 어려움
   - 해결: 에러 타입별 메시지 분류

2. **타임아웃 미처리**
   - 증상: 30초 후 Vercel timeout (Lambda 제한)
   - 영향: 503 에러
   - 해결: API 타임아웃 설정

#### 해결 방안
```typescript
export async function GET(request: NextRequest) {
  try {
    // API 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25초

    const questions = await getBusinessVoiceQuestions({
      category,
      limit,
      needsExpertReply,
    });

    clearTimeout(timeoutId);

    return NextResponse.json({ questions, count: questions.length });
  } catch (error) {
    console.error('[business-voice] GET /api/business-voice/questions error', error);

    // 에러 타입별 처리
    if (error instanceof mongoose.Error) {
      return NextResponse.json(
        { message: 'Database error. Please try again later.' },
        { status: 503 }
      );
    }

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { message: 'Request timeout. Please try again.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to load questions.' },
      { status: 500 }
    );
  }
}
```

---

### 4. 클라이언트 사이드 오류 위험 ⚠️

#### 문제점
```tsx
// src/components/business-voice/QnASection.tsx
const fetchQnAData = async () => {
  try {
    setIsLoading(true);
    const response = await fetch('/api/business-voice/questions?limit=10', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data: ApiResponse = await response.json();
    // ...
  } catch (error) {
    console.error('Q&A 데이터 로딩 실패:', error);
  } finally {
    setIsLoading(false);
  }
};
```

#### 위험 시나리오
1. **fetch 타임아웃 없음**
   - 증상: 무한 대기
   - 영향: 로딩 스피너 계속 표시
   - 확률: 네트워크 불안정 시

2. **에러 상태 UI 없음**
   - 증상: `console.error`만 출력, 사용자에게 피드백 없음
   - 영향: 빈 화면만 표시
   - 확률: API 에러 시

#### 해결 방안
```tsx
const QnASection = () => {
  const [qnaItems, setQnaItems] = useState<QnAItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // 에러 상태 추가

  const fetchQnAData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 타임아웃 추가
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초

      const response = await fetch('/api/business-voice/questions?limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setQnaItems(transformData(data.questions));
    } catch (error) {
      console.error('Q&A 데이터 로딩 실패:', error);

      if (error.name === 'AbortError') {
        setError('요청 시간이 초과되었습니다. 다시 시도해주세요.');
      } else {
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 에러 상태 UI
  if (error) {
    return (
      <section className="qna-section">
        <div className="qna-container">
          <div className="qna-error">
            <p>{error}</p>
            <button onClick={fetchQnAData}>다시 시도</button>
          </div>
        </div>
      </section>
    );
  }

  // ... 기존 코드
};
```

---

### 5. 무한 리렌더링 위험 ⚠️

#### 문제점
```tsx
const toggleExpanded = (id: string) => {
  setExpandedItems(prev => {
    const newSet = new Set(prev);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return newSet;
  });
};
```

#### 위험 시나리오
- **Set 객체 참조 동일성 문제**
  - Set을 직접 수정 후 반환 시 React가 변경 감지 못함
  - 현재 코드: `new Set(prev)` 사용으로 문제 없음 ✅

---

### 6. 답변 ID 중복 위험 ⚠️

#### 문제점
```tsx
answers: q.answers.map((a: ApiAnswer): Answer => ({
  _id: a.profileId || Math.random().toString(), // ⚠️ Math.random() 사용
  // ...
}))
```

#### 위험 시나리오
1. **Math.random() 충돌**
   - 확률: 매우 낮지만 이론적으로 가능
   - 영향: 같은 key로 인한 React 경고

2. **profileId가 없는 community 답변**
   - 현재: `Math.random().toString()` 사용
   - 문제: 고유성 보장 안됨

#### 해결 방안
```tsx
import { nanoid } from 'nanoid'; // or use crypto.randomUUID()

answers: q.answers.map((a: ApiAnswer, index: number): Answer => ({
  _id: a.profileId || `${q.id}-answer-${index}-${Date.now()}`, // 고유 ID 보장
  // 또는
  _id: a.profileId || crypto.randomUUID(), // Node 18+
  // ...
}))
```

---

## 📊 위험 등급 요약

| 항목 | 위험도 | 발생 확률 | 영향도 | 우선순위 |
|-----|-------|---------|-------|---------|
| MongoDB 연결 실패 | 🔴 높음 | 낮음 | 매우 높음 | 1 |
| API 타임아웃 | 🟡 중간 | 중간 | 높음 | 2 |
| 클라이언트 에러 UI 없음 | 🟡 중간 | 중간 | 중간 | 3 |
| 답변 ID 중복 | 🟢 낮음 | 매우 낮음 | 낮음 | 4 |
| 데이터 직렬화 오류 | 🟢 낮음 | 낮음 | 낮음 | 5 |

---

## ✅ 권장 개선 사항

### 즉시 적용 (High Priority)
1. **MongoDB 연결 타임아웃 설정**
   ```typescript
   serverSelectionTimeoutMS: 10000,
   socketTimeoutMS: 10000,
   ```

2. **클라이언트 에러 상태 UI 추가**
   ```tsx
   const [error, setError] = useState<string | null>(null);
   ```

3. **API fetch 타임아웃 추가**
   ```tsx
   const controller = new AbortController();
   setTimeout(() => controller.abort(), 10000);
   ```

### 중기 적용 (Medium Priority)
4. **답변 ID 생성 개선**
   ```tsx
   _id: a.profileId || crypto.randomUUID()
   ```

5. **에러 로깅 강화**
   ```typescript
   console.error('[QnASection]', {
     error,
     timestamp: new Date(),
     url: window.location.href,
   });
   ```

### 장기 적용 (Low Priority)
6. **Sentry 에러 추적 설정**
7. **성능 모니터링 (Core Web Vitals)**
8. **E2E 테스트 추가**

---

## 🧪 테스트 시나리오

### 1. MongoDB 연결 실패 시뮬레이션
```bash
# 잘못된 MongoDB URI로 테스트
MONGODB_URI="mongodb://invalid:27017" npm run dev
```

**예상 결과**:
- ✅ API 500 에러 반환
- ✅ 클라이언트에 에러 메시지 표시
- ✅ 로그에 에러 기록

### 2. 네트워크 타임아웃 시뮬레이션
```typescript
// API에서 인위적 지연
await new Promise(resolve => setTimeout(resolve, 30000));
```

**예상 결과**:
- ✅ 10초 후 타임아웃
- ✅ "요청 시간 초과" 메시지 표시

### 3. 빈 데이터 처리
```javascript
// MongoDB에서 모든 데이터 삭제
await BusinessVoiceQuestion.deleteMany({});
```

**예상 결과**:
- ✅ 빈 배열 반환 (`{ questions: [], count: 0 }`)
- ✅ "등록된 질문이 없습니다" 메시지 표시

---

## 🔧 즉시 적용 가능한 패치

### 파일 1: `src/lib/mongodb.ts`
```typescript
const opts = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 10000,
  maxPoolSize: 10,
};
```

### 파일 2: `src/components/business-voice/QnASection.tsx`
```tsx
const [error, setError] = useState<string | null>(null);

const fetchQnAData = async () => {
  try {
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('/api/business-voice/questions?limit=10', {
      signal: controller.signal,
      // ...
    });

    clearTimeout(timeoutId);
    // ...
  } catch (error) {
    if (error.name === 'AbortError') {
      setError('요청 시간이 초과되었습니다. 다시 시도해주세요.');
    } else {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    }
  }
};
```

---

## 📝 결론

### 현재 상태
- ✅ 기본 기능 정상 동작
- ⚠️ 에러 처리 보완 필요
- ⚠️ 타임아웃 설정 필요

### 프로덕션 배포 전 필수 작업
1. MongoDB 연결 타임아웃 설정
2. 클라이언트 에러 UI 추가
3. API fetch 타임아웃 추가

### 예상 소요 시간
- 필수 개선: **30분**
- 권장 개선: **2시간**
- 전체 개선: **4시간**

---

**작성일**: 2025-10-08 03:10 KST
**다음 단계**: 즉시 적용 패치 구현
