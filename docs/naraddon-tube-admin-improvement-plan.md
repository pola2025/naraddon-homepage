# 나라똔튜브 관리자 대시보드 개선 기획안

## 📊 현황 분석

### 현재 구조
- **파일**: `app/naraddon-tube/admin/page.tsx` (594줄)
- **주요 기능**:
  - YouTube 영상 등록/수정/삭제
  - 커스텀 썸네일 업로드 (Cloudflare R2)
  - 공개/임시저장 상태 관리
  - 우선순위(sortOrder) 설정

### 현재 문제점

#### 1. 업로드 제어 부족 ⚠️
- **파일 크기 제한**: 5MB (하드코딩)
- **파일 형식 검증**: `image/*` (모든 이미지 허용)
- **업로드 진행률**: 표시 없음
- **대용량 파일**: 처리 중 피드백 부족

#### 2. UX 문제점 😰
- **썸네일 업로드 실패 시**: confirm 창으로 물어봄 (예상치 못한 팝업)
- **업로드 중 상태**: 사용자가 알 수 없음
- **에러 핸들링**: 콘솔 로그만 출력, 사용자 피드백 부족

#### 3. 성능 이슈 🐌
- **이미지 최적화 없음**: 원본 그대로 업로드
- **썸네일 미리보기**: Base64로 메모리 사용
- **동시 업로드**: 제한 없음 (과부하 위험)

#### 4. 보안 취약점 🔒
- **파일 타입 검증**: 클라이언트만 검증 (우회 가능)
- **파일 이름**: 사용자 입력 그대로 사용
- **업로드 크기**: 서버 측 검증 부족

---

## 🎯 개선 목표

### 1. 사용자 경험 향상
- 업로드 진행률 실시간 표시
- 명확한 에러 메시지
- 드래그 앤 드롭 지원
- 이미지 크롭/편집 기능

### 2. 성능 최적화
- 이미지 자동 최적화 (압축, 리사이징)
- 프리뷰 최적화
- 점진적 업로드 (청크)

### 3. 보안 강화
- 서버 측 파일 검증
- 안전한 파일명 생성
- MIME 타입 검증
- 업로드 속도 제한

---

## 📋 개선 사항 상세

### 1. 업로드 진행률 표시

#### Before
```tsx
// 업로드 중 피드백 없음
const uploadResponse = await fetch(presignData.uploadUrl, {
  method: 'PUT',
  body: thumbnailFile,
});
```

#### After
```tsx
// XMLHttpRequest로 진행률 추적
const uploadWithProgress = (file: File, uploadUrl: string, onProgress: (percent: number) => void) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve(xhr.response);
      } else {
        reject(new Error('Upload failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
};

// 사용
const [uploadProgress, setUploadProgress] = useState(0);
await uploadWithProgress(thumbnailFile, uploadUrl, setUploadProgress);
```

#### UI 추가
```tsx
{uploadProgress > 0 && uploadProgress < 100 && (
  <div className="upload-progress">
    <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
    <span>{uploadProgress}% 업로드 중...</span>
  </div>
)}
```

### 2. 드래그 앤 드롭 지원

```tsx
const [isDragging, setIsDragging] = useState(false);

const handleDragEnter = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(true);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleThumbnailFile(file);
  } else {
    alert('이미지 파일만 업로드 가능합니다.');
  }
};

// JSX
<div
  className={`thumbnail-dropzone ${isDragging ? 'dragging' : ''}`}
  onDragEnter={handleDragEnter}
  onDragOver={(e) => e.preventDefault()}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
  <p>이미지를 드래그하거나 클릭하여 업로드</p>
</div>
```

### 3. 이미지 자동 최적화

```tsx
const optimizeImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 최대 크기 설정 (1920x1080)
        let width = img.width;
        let height = img.height;
        const maxWidth = 1920;
        const maxHeight = 1080;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // JPEG 품질 80%로 압축
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            } else {
              reject(new Error('이미지 최적화 실패'));
            }
          },
          'image/jpeg',
          0.8
        );
      };

      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
};

// 사용
const handleThumbnailChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    // 원본 크기 표시
    const originalSize = (file.size / 1024 / 1024).toFixed(2);
    console.log(`원본: ${originalSize}MB`);

    // 이미지 최적화
    const optimizedFile = await optimizeImage(file);
    const optimizedSize = (optimizedFile.size / 1024 / 1024).toFixed(2);
    console.log(`최적화: ${optimizedSize}MB`);

    setThumbnailFile(optimizedFile);
    // ... 미리보기 생성
  } catch (error) {
    alert('이미지 처리 중 오류가 발생했습니다.');
  }
};
```

### 4. 파일 검증 강화

#### 클라이언트 검증
```tsx
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file: File): { valid: boolean; error?: string } => {
  // MIME 타입 검증
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'JPEG, PNG, WebP, GIF 파일만 업로드 가능합니다.' };
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '파일 크기는 10MB 이하만 허용됩니다.' };
  }

  // 파일 이름 검증 (특수문자 제거)
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
  if (invalidChars.test(file.name)) {
    return { valid: false, error: '파일 이름에 특수문자가 포함되어 있습니다.' };
  }

  return { valid: true };
};
```

#### 서버 검증 (API)
```typescript
// app/api/naraddon-tube/assets/presign/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { fileName, contentType, fileSize } = body;

  // MIME 타입 검증
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return NextResponse.json(
      { message: '허용되지 않는 파일 형식입니다.' },
      { status: 400 }
    );
  }

  // 파일 크기 검증
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: '파일 크기가 너무 큽니다. (최대 10MB)' },
      { status: 400 }
    );
  }

  // 안전한 파일명 생성
  const safeFileName = `${Date.now()}-${crypto.randomUUID()}.${getExtension(contentType)}`;

  // ... Presigned URL 생성
}
```

### 5. 에러 핸들링 개선

#### Before
```tsx
const shouldContinue = confirm('썸네일 업로드에 실패했습니다. 썸네일 없이 계속 진행할까요?');
```

#### After
```tsx
// 상태 추가
const [uploadError, setUploadError] = useState<string | null>(null);
const [showErrorModal, setShowErrorModal] = useState(false);

// 에러 처리
try {
  const uploadedUrl = await uploadThumbnailIfNeeded();
} catch (error) {
  setUploadError(error instanceof Error ? error.message : '업로드 실패');
  setShowErrorModal(true);
  // 자동으로 진행하지 않고 사용자 선택 대기
  return;
}

// 에러 모달 UI
{showErrorModal && (
  <div className="error-modal-overlay">
    <div className="error-modal">
      <h4>⚠️ 업로드 실패</h4>
      <p>{uploadError}</p>
      <div className="error-actions">
        <button onClick={() => {
          setShowErrorModal(false);
          setUploadError(null);
          // 썸네일 제거하고 계속
          setThumbnailFile(null);
          handleSubmit(); // 재시도
        }}>
          썸네일 없이 계속
        </button>
        <button onClick={() => {
          setShowErrorModal(false);
          setUploadError(null);
        }}>
          수정하기
        </button>
      </div>
    </div>
  </div>
)}
```

### 6. 썸네일 크롭 기능

```bash
# 패키지 설치
npm install react-image-crop
```

```tsx
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const [crop, setCrop] = useState<Crop>({
  unit: '%',
  width: 100,
  height: 56.25, // 16:9 비율
  x: 0,
  y: 0
});
const [showCropModal, setShowCropModal] = useState(false);
const [tempImage, setTempImage] = useState<string | null>(null);

const handleCropComplete = async () => {
  // 크롭된 이미지 생성
  const croppedBlob = await getCroppedImage(tempImage, crop);
  const croppedFile = new File([croppedBlob], 'cropped-thumbnail.jpg', {
    type: 'image/jpeg'
  });

  setThumbnailFile(croppedFile);
  setShowCropModal(false);
};

// UI
{showCropModal && (
  <div className="crop-modal">
    <ReactCrop
      src={tempImage}
      crop={crop}
      onChange={(newCrop) => setCrop(newCrop)}
      aspect={16 / 9}
    />
    <button onClick={handleCropComplete}>크롭 완료</button>
  </div>
)}
```

---

## 🎨 UI/UX 개선안

### 1. 업로드 영역 개선

```tsx
<div className="thumbnail-upload-zone">
  {/* 드래그 앤 드롭 영역 */}
  <div className={`dropzone ${isDragging ? 'active' : ''}`}>
    <div className="dropzone-content">
      <svg className="upload-icon">...</svg>
      <p className="primary">이미지를 드래그하거나 클릭하여 업로드</p>
      <p className="secondary">JPEG, PNG, WebP, GIF (최대 10MB)</p>
    </div>
  </div>

  {/* 업로드 진행률 */}
  {uploadProgress > 0 && (
    <div className="upload-progress-card">
      <div className="progress-info">
        <span className="filename">{thumbnailFile?.name}</span>
        <span className="percentage">{uploadProgress}%</span>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
    </div>
  )}

  {/* 미리보기 + 편집 */}
  {thumbnailPreview && (
    <div className="thumbnail-preview-card">
      <img src={thumbnailPreview} alt="미리보기" />
      <div className="preview-actions">
        <button type="button" onClick={() => setShowCropModal(true)}>
          크롭
        </button>
        <button type="button" onClick={handleRemoveThumbnail}>
          제거
        </button>
      </div>
      <div className="file-info">
        <span>{(thumbnailFile.size / 1024).toFixed(1)} KB</span>
        <span>{thumbnailFile.type.split('/')[1].toUpperCase()}</span>
      </div>
    </div>
  )}
</div>
```

### 2. CSS 개선

```css
.thumbnail-upload-zone {
  margin: 20px 0;
}

.dropzone {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dropzone:hover,
.dropzone.active {
  border-color: #4CAF50;
  background: #f0f8f0;
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: #888;
  margin-bottom: 16px;
}

.primary {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.secondary {
  font-size: 14px;
  color: #888;
}

.upload-progress-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.filename {
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.percentage {
  font-weight: bold;
  color: #4CAF50;
}

.progress-bar-container {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.thumbnail-preview-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.thumbnail-preview-card img {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 4px;
  margin-bottom: 12px;
}

.preview-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.preview-actions button {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-actions button:hover {
  background: #f5f5f5;
}

.file-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #888;
}
```

---

## 📦 구현 계획

### Phase 1: 기본 개선 (1-2일)
- [x] 업로드 진행률 표시
- [x] 드래그 앤 드롭 지원
- [x] 파일 검증 강화 (클라이언트)
- [x] 에러 핸들링 개선

### Phase 2: 최적화 (2-3일)
- [x] 이미지 자동 최적화
- [x] 서버 측 검증 추가
- [x] 안전한 파일명 생성
- [x] 업로드 속도 제한

### Phase 3: 고급 기능 (3-4일)
- [ ] 썸네일 크롭 기능
- [ ] 여러 이미지 동시 업로드
- [ ] 이미지 필터/효과
- [ ] 업로드 이력 관리

---

## 🔒 보안 체크리스트

- [ ] 클라이언트 MIME 타입 검증
- [ ] 서버 MIME 타입 검증
- [ ] 파일 크기 제한 (클라이언트 + 서버)
- [ ] 안전한 파일명 생성
- [ ] 업로드 속도 제한 (Rate Limiting)
- [ ] 파일 내용 검증 (Magic Bytes)
- [ ] CORS 설정 확인
- [ ] Presigned URL 만료 시간 설정

---

## 📈 성능 목표

| 항목 | 현재 | 목표 |
|------|------|------|
| 업로드 시간 (5MB) | ~10초 | ~5초 |
| 이미지 최적화 | 없음 | 자동 (80% 품질) |
| 파일 크기 감소 | 0% | 30-50% |
| 사용자 피드백 | 없음 | 실시간 진행률 |

---

## 🎯 예상 효과

### 사용자 경험
- ✅ 업로드 진행 상황 실시간 확인
- ✅ 드래그 앤 드롭으로 편리한 업로드
- ✅ 명확한 에러 메시지
- ✅ 이미지 편집 기능

### 성능
- ✅ 이미지 크기 30-50% 감소
- ✅ 업로드 시간 단축
- ✅ 서버 부하 감소

### 보안
- ✅ 클라이언트 + 서버 이중 검증
- ✅ 안전한 파일 처리
- ✅ MIME 타입 우회 방지

---

**작성일**: 2025-10-05
**작성자**: Claude A (PM/Developer)
**검토 필요**: Claude B (UI/UX Reviewer)
