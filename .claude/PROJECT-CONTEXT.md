# 🏢 나라똔 프로젝트 개발 환경

## 📚 기술 스택

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React Hook Form**

### Backend
- **Next.js API Routes**
- **MongoDB Atlas** (Database)
- **Mongoose** (ODM)

### Infrastructure
- **Vercel** (Hosting & Deployment)
- **Cloudflare R2** (Object Storage - 이미지/파일)
- **Cloudflare** (CDN & DNS)

### Authentication
- **NextAuth.js**
- **Role-based Access Control** (admin, super_admin, user)

---

## 🗂️ 프로젝트 구조

```
naraddon-homepage/
├── app/                          # Next.js App Router
│   ├── admin/                    # 통합 Admin 시스템
│   │   ├── dashboard/
│   │   └── naraddon-tube/
│   ├── naraddon-tube/           # 나라똔튜브 서비스
│   │   └── admin/               # 나라똔튜브 전용 admin
│   ├── business-voice/          # 비즈니스 보이스
│   ├── expert-services/         # 전문가 서비스
│   ├── policy-news/             # 정책 뉴스
│   └── api/                     # API Routes
│       ├── auth/                # 인증
│       ├── admin/               # Admin API
│       └── upload/              # 파일 업로드
│
├── components/                   # React 컴포넌트
│   ├── admin/
│   ├── naraddon-tube/
│   └── common/
│
├── lib/                         # 유틸리티
│   ├── mongodb.ts               # MongoDB 연결
│   ├── cloudflare-r2.ts         # R2 클라이언트
│   └── auth.ts                  # NextAuth 설정
│
├── models/                      # MongoDB 모델
│   ├── User.ts
│   ├── NaraddonTube.ts
│   └── ...
│
└── .claude/                     # Claude 협업 시스템
    ├── inbox/
    ├── dashboard/
    └── scripts/
```

---

## 🔧 개발 환경 변수

### 필수 환경변수 (.env.local)
```bash
# MongoDB
DATABASE_URL=mongodb+srv://...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...

# 서비스 비밀번호
NARADDON_TUBE_PASSWORD=...
BUSINESS_VOICE_PASSWORD=...
```

---

## 🚀 배포 프로세스

### 개발 → 프로덕션
```bash
# 1. 로컬 개발
npm run dev              # localhost:3000

# 2. 빌드 검증
npm run build
npm run start

# 3. Vercel 배포
git push origin main     # 자동 배포 트리거

# 4. 프로덕션 확인
https://naraddon.com
```

### Vercel 환경변수 설정
```bash
# Vercel Dashboard에서 설정
# Settings → Environment Variables
# Production / Preview / Development 각각 설정
```

---

## 📝 Claude A & B 작업 시 주의사항

### Claude A (PM/Developer)

#### 1. Next.js App Router 규칙
```typescript
// ✅ 올바른 패턴
// app/naraddon-tube/admin/page.tsx
'use client'  // 클라이언트 컴포넌트 명시

export default function NaraddonTubeAdmin() {
  // useState, useEffect 사용 가능
}

// ✅ 서버 컴포넌트 (기본값)
// app/naraddon-tube/page.tsx
export default async function NaraddonTubePage() {
  const data = await fetchData();  // 서버에서 데이터 페칭
  return <div>{data}</div>
}
```

#### 2. MongoDB 연결
```typescript
// ✅ 올바른 패턴
import { connectDB } from '@/lib/mongodb';

export async function GET() {
  try {
    await connectDB();
    const data = await Model.find();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### 3. Cloudflare R2 업로드
```typescript
// ✅ 올바른 패턴
import { uploadToR2 } from '@/lib/cloudflare-r2';

const file = formData.get('file');
const url = await uploadToR2(file, 'naraddon-tube/thumbnails/');
```

#### 4. 인증 확인
```typescript
// ✅ 올바른 패턴
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // ... admin 작업
}
```

### Claude B (UI/UX Reviewer)

#### 1. 반응형 디자인 체크
```typescript
// ✅ 모바일 우선 체크
<div className="
  w-full                    // 모바일: 전체 너비
  md:w-1/2                  // 태블릿: 절반
  lg:w-1/3                  // 데스크톱: 1/3
  p-4                       // 패딩
  space-y-4                 // 수직 간격
">
```

#### 2. 로딩 상태 체크
```typescript
// ✅ 로딩 UI 필수
{isLoading ? (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
  </div>
) : (
  <ContentComponent />
)}
```

#### 3. 에러 처리 체크
```typescript
// ✅ 에러 바운더리 또는 에러 상태
{error ? (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-red-600">{error.message}</p>
  </div>
) : (
  <ContentComponent />
)}
```

#### 4. 접근성 체크
```typescript
// ✅ ARIA 속성 및 시맨틱 HTML
<button
  aria-label="동영상 업로드"
  aria-describedby="upload-help"
  className="..."
>
  업로드
</button>

<p id="upload-help" className="sr-only">
  최대 100MB까지 업로드 가능합니다
</p>
```

---

## 🔄 Claude A & B 협업 예시 (나라똔 환경)

### 예시: 나라똔튜브 썸네일 업로드 개선

#### 1. 사용자 요청
```
사용자: "나라똔튜브 썸네일 업로드 시 미리보기 기능 추가해줘"
```

#### 2. Claude A 기획
```typescript
// Claude A:
// 📋 기획안
// 1. 썸네일 선택 시 즉시 미리보기
// 2. Cloudflare R2 업로드 진행률 표시
// 3. 업로드 완료 후 URL 자동 반영

// components/naraddon-tube/ThumbnailUpload.tsx
'use client'

export function ThumbnailUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    // R2 업로드 로직
    // ...
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="..."
      />

      {preview && (
        <div className="relative w-full h-48">
          <Image
            src={preview}
            alt="썸네일 미리보기"
            fill
            className="object-cover rounded-lg"
          />
        </div>
      )}

      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// 🔄 Claude B에게 검토 요청
```

#### 3. Claude B 검토
```
Claude B:
  🔍 UI/UX 검토

  ✅ 기능적 측면:
  - 파일 선택 → 미리보기 ✅
  - 업로드 진행률 표시 ✅
  - R2 연동 준비됨 ✅

  ⚠️ UX 개선 필요:
  1. 미리보기 이미지 크기 제한 없음
     → 큰 이미지 시 성능 저하 가능
     → 최대 2MB 제한 추가 권장

  2. 업로드 실패 시 UI 없음
     → 에러 메시지 표시 필요

  3. 모바일 반응형 고려 부족
     → 미리보기 높이 모바일에서 조정 필요

  4. 접근성:
     - 파일 input에 label 필요
     - 진행률에 aria-label 추가

  📝 Decision: NEEDS_CHANGES

  개선사항:
  - 파일 크기 체크 (2MB 제한)
  - 에러 상태 UI 추가
  - 모바일 반응형 개선
  - 접근성 속성 추가
```

#### 4. Claude A 수정
```typescript
// Claude A:
// 📥 Claude B 피드백 반영

'use client'

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function ThumbnailUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크
    if (file.size > MAX_FILE_SIZE) {
      setError('파일 크기는 2MB 이하여야 합니다');
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    try {
      setUploading(true);
      setError(null);

      // R2 업로드
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/thumbnail', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('업로드 실패');

      const { url } = await res.json();
      onUploadComplete(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="thumbnail-upload"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          썸네일 이미지
        </label>
        <input
          id="thumbnail-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          aria-describedby="file-help"
          className="..."
        />
        <p id="file-help" className="mt-1 text-sm text-gray-500">
          최대 2MB까지 업로드 가능합니다
        </p>
      </div>

      {error && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-3"
          role="alert"
        >
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {preview && (
        <div className="relative w-full h-32 md:h-48">
          <Image
            src={preview}
            alt="썸네일 미리보기"
            fill
            className="object-cover rounded-lg"
          />
        </div>
      )}

      {uploading && (
        <div
          className="w-full bg-gray-200 rounded-full h-2"
          role="progressbar"
          aria-label="업로드 진행률"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// 🔄 Claude B에게 재검토 요청
```

#### 5. Claude B 최종 승인
```
Claude B:
  ✅ 재검토 완료

  모든 개선사항 반영 확인:
  - 파일 크기 제한 ✅
  - 에러 처리 UI ✅
  - 모바일 반응형 (h-32 md:h-48) ✅
  - 접근성 (label, aria-*) ✅

  UX 평가:
  - 사용자 피드백 명확함 ✅
  - 에러 복구 경로 제공 ✅
  - 모든 디바이스 지원 ✅

  ✅ Decision: PROCEED

  💬 승인 의견:
  "사용자 경험이 크게 개선되었습니다.
   에러 처리와 접근성이 모두 반영되어 안전하게 배포 가능합니다."
```

#### 6. Claude A 실행 및 커밋
```bash
# Claude A:
# 🚀 실행

git add components/naraddon-tube/ThumbnailUpload.tsx

git commit -m "feat(naraddon-tube): Add thumbnail preview and upload progress

- Thumbnail preview on file selection
- Upload progress bar with Cloudflare R2
- File size validation (2MB max)
- Error handling with user feedback
- Mobile responsive design (h-32 md:h-48)
- Accessibility improvements (label, aria-*)

UX improvements reviewed and approved by Claude B

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
Reviewed-By: Claude B <ui-ux-reviewer@anthropic.com>"

git push origin main

# ✅ 작업 완료
# 💤 사용자 재명령 대기 중...
```

---

## 🎯 나라똔 프로젝트 핵심 원칙

### 1. 성능 최적화
- ✅ Next.js Image 컴포넌트 사용 (자동 최적화)
- ✅ Cloudflare R2로 정적 파일 분리
- ✅ MongoDB 쿼리 최적화 (인덱스 활용)
- ✅ Vercel Edge Functions 활용

### 2. 보안
- ✅ 환경변수로 민감정보 관리
- ✅ NextAuth로 인증/인가
- ✅ API Route에서 권한 체크
- ✅ Input validation (Zod 등)

### 3. 사용자 경험
- ✅ 로딩 상태 명시
- ✅ 에러 메시지 친절하게
- ✅ 모바일 최적화
- ✅ 접근성 준수

### 4. 개발자 경험
- ✅ TypeScript 타입 안전성
- ✅ ESLint/Prettier 코드 품질
- ✅ 컴포넌트 재사용성
- ✅ 명확한 폴더 구조

---

*최종 업데이트: 2025-10-05*
*나라똔 프로젝트 전용 컨텍스트*
