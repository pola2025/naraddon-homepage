/**
 * 업로드 전 이미지 용량 강제 조정
 *
 * @purpose 심사관이 대용량 이미지를 그대로 올려도 권장 용량 안으로 줄여서 업로드되게 한다
 * @context 2026-10-16 조혜정 심사관 로고 업로드가 Vercel 요청 한도(4.5MB)에 걸림.
 *          Vercel 은 JSON 이 아닌 "Request Entity Too Large" 문구를 돌려주고,
 *          화면 코드가 이를 JSON 으로 읽다가 "Unexpected token 'R'" 오류를 띄웠다.
 * @decision
 *   - 권장 용량(3MB)을 넘는 파일만 압축한다. 4.5MB 한도보다 여유를 둔 값이다.
 *   - compressImage 는 한 번만 인코딩하므로 결과가 크면 품질 → 해상도 순으로 낮춰 다시 시도한다.
 *   - 사용자 요청: "사용자가 리사이즈할 필요 없이 우리가 리사이즈해서 문제 없이 처리되는 플로우"
 *     → 원본 한도는 50MB 로 넉넉히 두고(브라우저 메모리 보호용 안전장치), 마지막 단계는 강하게 줄여 실패하지 않게 한다.
 * @note 서버 라우트(upload-logo 등)는 sharp 로 다시 리사이즈하므로 클라이언트 압축은 전송 용량만 책임진다
 */
import { compressImage } from './imageCompressor';

export const UPLOAD_RECOMMENDED_MB = 3;
export const UPLOAD_ORIGINAL_MAX_MB = 50;

/** 업로드 칸 공통 안내 문구 — 직접 줄일 필요는 없지만 자동 압축 시 화질이 달라질 수 있음을 알린다 */
export const UPLOAD_COMPRESSION_NOTICE = `${UPLOAD_RECOMMENDED_MB}MB를 넘는 파일도 그대로 올리시면 자동으로 줄여서 올립니다. 이때 화질이 원본과 달라질 수 있습니다. (원본 최대 ${UPLOAD_ORIGINAL_MAX_MB}MB)`;

const MB = 1024 * 1024;

// 단계별 압축 시도: 품질을 먼저 낮추고, 그래도 크면 해상도를 줄인다 (마지막 단계는 실패 방지용)
const COMPRESSION_STEPS = [
  { scale: 1, quality: 0.85 },
  { scale: 1, quality: 0.7 },
  { scale: 0.75, quality: 0.7 },
  { scale: 0.5, quality: 0.7 },
  { scale: 0.35, quality: 0.6 },
];

export interface PrepareUploadOptions {
  maxWidthOrHeight: number; // 1단계 압축 시 최대 가로/세로(px)
  fileType: string; // 압축 결과 MIME 타입 (로고 PNG 는 투명 배경 유지를 위해 PNG 유지)
}

export interface PrepareUploadResult {
  file: File;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}

function toMB(bytes: number): string {
  return (bytes / MB).toFixed(1);
}

/**
 * 업로드할 이미지를 권장 용량 이하로 맞춘다
 *
 * @throws 이미지가 아니거나, 원본 최대 용량 초과, 모든 단계를 거쳐도 권장 용량 초과일 때
 */
export async function prepareUploadImage(
  file: File,
  options: PrepareUploadOptions
): Promise<PrepareUploadResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올려 주세요.');
  }

  if (file.size > UPLOAD_ORIGINAL_MAX_MB * MB) {
    throw new Error(
      `파일이 너무 큽니다.\n원본 ${toMB(file.size)}MB → 최대 ${UPLOAD_ORIGINAL_MAX_MB}MB까지 가능합니다.`
    );
  }

  if (file.size <= UPLOAD_RECOMMENDED_MB * MB) {
    return { file, compressed: false, originalSize: file.size, finalSize: file.size };
  }

  for (const step of COMPRESSION_STEPS) {
    const { file: output } = await compressImage(file, {
      maxSizeMB: UPLOAD_RECOMMENDED_MB,
      maxWidthOrHeight: Math.round(options.maxWidthOrHeight * step.scale),
      quality: step.quality,
      fileType: options.fileType,
    });

    if (output.size <= UPLOAD_RECOMMENDED_MB * MB) {
      return { file: output, compressed: true, originalSize: file.size, finalSize: output.size };
    }
  }

  throw new Error(
    `이미지 용량을 ${UPLOAD_RECOMMENDED_MB}MB 이하로 줄이지 못했습니다.\n더 작은 이미지로 다시 올려 주세요.`
  );
}

/** 압축이 일어났을 때 사용자에게 보여줄 안내 (압축 안 했으면 빈 문자열) */
export function compressionNotice(result: PrepareUploadResult): string {
  if (!result.compressed) return '';
  return `선택한 파일(${toMB(result.originalSize)}MB)이 권장 용량 ${UPLOAD_RECOMMENDED_MB}MB를 넘어 ${toMB(result.finalSize)}MB로 자동 압축했습니다.\n화질이 원본과 다를 수 있습니다.`;
}

/**
 * 업로드 실패 응답의 안내 문구
 *
 * @note 413 은 Vercel 이 서버 코드 전에 돌려주므로 본문이 JSON 이 아니다. 본문을 읽지 말고 상태로 판단한다
 */
export function uploadErrorMessage(status: number, fallback: string): string {
  if (status === 413) {
    return `이미지 용량이 너무 큽니다.\n${UPLOAD_RECOMMENDED_MB}MB 이하로 줄여서 다시 올려 주세요.`;
  }
  return fallback;
}
