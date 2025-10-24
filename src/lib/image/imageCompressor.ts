/**
 * 이미지 압축 유틸리티
 *
 * @purpose 심사관 브랜드 페이지에서 업로드되는 이미지를 자동으로 압축
 * @context 브라우저 환경에서 클라이언트 측 압축 (sharp는 서버 측에서 사용)
 * @decision 10MB 이하로 압축하여 로딩 속도 최적화
 */

export interface ImageCompressionOptions {
  maxSizeMB?: number;        // 최대 파일 크기 (기본: 10MB)
  maxWidthOrHeight?: number; // 최대 가로/세로 크기 (기본: 1920px)
  quality?: number;          // 품질 (0-1, 기본: 0.85)
  fileType?: string;         // 출력 파일 타입 (기본: 원본 유지)
}

export interface ImageCompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * 브라우저에서 이미지 압축
 *
 * @param file 원본 이미지 파일
 * @param options 압축 옵션
 * @returns 압축된 이미지 파일 및 통계
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<ImageCompressionResult> {
  const {
    maxSizeMB = 10,
    maxWidthOrHeight = 1920,
    quality = 0.85,
    fileType = file.type
  } = options;

  const originalSize = file.size;

  // 이미 충분히 작은 파일은 압축 스킵
  if (originalSize <= maxSizeMB * 1024 * 1024) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 0
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // 리사이징 계산
        let width = img.width;
        let height = img.height;

        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          } else {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        // Canvas로 압축
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context를 생성할 수 없습니다.'));
          return;
        }

        // 고품질 렌더링 설정
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);

        // Blob으로 변환
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 압축에 실패했습니다.'));
              return;
            }

            // File 객체 생성
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, getExtension(fileType)),
              { type: fileType }
            );

            const compressedSize = compressedFile.size;

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              compressionRatio: ((1 - compressedSize / originalSize) * 100)
            });
          },
          fileType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('이미지를 로드할 수 없습니다.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 여러 이미지를 한 번에 압축
 */
export async function compressImages(
  files: File[],
  options: ImageCompressionOptions = {}
): Promise<ImageCompressionResult[]> {
  const results = await Promise.all(
    files.map(file => compressImage(file, options))
  );

  return results;
}

/**
 * 파일 타입에서 확장자 추출
 */
function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };

  return extensions[mimeType] || '.jpg';
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
