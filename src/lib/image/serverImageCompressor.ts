/**
 * 서버 측 이미지 압축 유틸리티 (sharp 사용)
 *
 * @purpose API 라우트에서 업로드된 이미지를 서버 측에서 압축
 * @context Next.js API 라우트, Cloudflare R2 업로드 전 처리
 * @decision sharp 라이브러리로 고품질 압축 및 포맷 변환
 */

import sharp from 'sharp';

export interface ServerCompressionOptions {
  maxSizeMB?: number;        // 최대 파일 크기 (기본: 10MB)
  maxWidth?: number;         // 최대 너비 (기본: 1920px)
  maxHeight?: number;        // 최대 높이 (기본: 1920px)
  quality?: number;          // 품질 (기본: 85)
  format?: 'jpeg' | 'png' | 'webp'; // 출력 포맷
}

export interface ServerCompressionResult {
  buffer: Buffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  format: string;
}

/**
 * 서버에서 이미지 압축 (sharp 사용)
 *
 * @param input Buffer 또는 파일 경로
 * @param options 압축 옵션
 * @returns 압축된 이미지 Buffer 및 통계
 */
export async function compressImageOnServer(
  input: Buffer | string,
  options: ServerCompressionOptions = {}
): Promise<ServerCompressionResult> {
  const {
    maxSizeMB = 10,
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85,
    format
  } = options;

  try {
    // 원본 이미지 정보 가져오기
    const image = sharp(input);
    const metadata = await image.metadata();
    const originalSize = input instanceof Buffer ? input.length : 0;

    // 리사이징 계산
    let resizeOptions: { width?: number; height?: number } = {};

    if (metadata.width && metadata.width > maxWidth) {
      resizeOptions.width = maxWidth;
    }
    if (metadata.height && metadata.height > maxHeight) {
      resizeOptions.height = maxHeight;
    }

    // 포맷 결정
    let outputFormat = format;
    if (!outputFormat) {
      // 원본 포맷 유지, 단 GIF는 PNG로 변환
      outputFormat = metadata.format === 'gif' ? 'png' :
                     (metadata.format as 'jpeg' | 'png' | 'webp') || 'jpeg';
    }

    // 압축 파이프라인
    let pipeline = image;

    // 리사이징 적용
    if (Object.keys(resizeOptions).length > 0) {
      pipeline = pipeline.resize({
        ...resizeOptions,
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // 포맷별 압축 설정
    switch (outputFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality,
          progressive: true,
          mozjpeg: true
        });
        break;

      case 'png':
        pipeline = pipeline.png({
          quality,
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true
        });
        break;

      case 'webp':
        pipeline = pipeline.webp({
          quality,
          effort: 6
        });
        break;
    }

    // 압축 실행
    const buffer = await pipeline.toBuffer({ resolveWithObject: true });
    const compressedSize = buffer.data.length;

    // 목표 크기보다 크면 품질을 낮춰서 재압축
    const maxBytes = maxSizeMB * 1024 * 1024;
    let finalBuffer = buffer.data;
    let finalQuality = quality;

    if (compressedSize > maxBytes) {
      console.log(`크기 초과 (${(compressedSize / 1024 / 1024).toFixed(2)}MB), 재압축 진행...`);

      // 품질을 낮춰가며 반복 압축
      for (let q = quality - 10; q >= 60; q -= 10) {
        let retryPipeline = sharp(input);

        if (Object.keys(resizeOptions).length > 0) {
          retryPipeline = retryPipeline.resize({
            ...resizeOptions,
            fit: 'inside',
            withoutEnlargement: true
          });
        }

        switch (outputFormat) {
          case 'jpeg':
            retryPipeline = retryPipeline.jpeg({ quality: q, progressive: true, mozjpeg: true });
            break;
          case 'png':
            retryPipeline = retryPipeline.png({ quality: q, compressionLevel: 9 });
            break;
          case 'webp':
            retryPipeline = retryPipeline.webp({ quality: q, effort: 6 });
            break;
        }

        const retryBuffer = await retryPipeline.toBuffer({ resolveWithObject: true });

        if (retryBuffer.data.length <= maxBytes) {
          finalBuffer = retryBuffer.data;
          finalQuality = q;
          console.log(`재압축 성공 (품질: ${q}%, 크기: ${(retryBuffer.data.length / 1024 / 1024).toFixed(2)}MB)`);
          break;
        }
      }
    }

    const finalSize = finalBuffer.length;

    return {
      buffer: finalBuffer,
      originalSize,
      compressedSize: finalSize,
      compressionRatio: originalSize > 0 ? ((1 - finalSize / originalSize) * 100) : 0,
      width: buffer.info.width,
      height: buffer.info.height,
      format: outputFormat
    };

  } catch (error) {
    console.error('이미지 압축 실패:', error);
    throw new Error(`이미지 압축 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * Base64 데이터 URL을 Buffer로 변환
 */
export function dataURLToBuffer(dataURL: string): Buffer {
  const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * 이미지 메타데이터 추출
 */
export async function getImageMetadata(input: Buffer | string) {
  const metadata = await sharp(input).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: metadata.size,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation
  };
}
