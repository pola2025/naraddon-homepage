'use client';

import { useEffect, useMemo, useState } from 'react';
import { compressImage } from '@/lib/image/imageCompressor';

/**
 * 정보 이미지 편집기 (deferred upload)
 *
 * @purpose 브랜드 페이지 정보 섹션에 표시될 이미지 선택 + 사전 압축
 * @decision
 *   - 파일 선택 시 R2 업로드 안 함 → 상단 "저장" 버튼 클릭 시에만 업로드
 *     (사용자가 선택 후 저장 안 하면 R2에 고아 파일 안 생김)
 *   - 선택 직후 클라이언트에서 WebP 사전 압축 (1920px / Q85 / 3.5MB) 후 부모에 File 전달
 *   - 프리뷰는 blob URL로 즉시 표시 (사용자에게 로딩 노출 안 함)
 *   - 실제 업로드 로딩은 상단 "저장" 버튼에서 표현됨
 */

interface InfoImageEditorProps {
  infoImage: string;
  /** 부모가 관리하는 사전 압축 파일 — 저장 시점에 업로드됨 */
  pendingFile: File | null;
  /** 기존 저장된 URL을 변경/삭제할 때 호출 (빈 문자열 = 삭제 의도) */
  onChange: (imageUrl: string) => void;
  /** 새 파일 선택 시 호출 (저장 시점까지 업로드 보류) */
  onPendingFileChange: (file: File | null) => void;
  onSave: () => Promise<void>;
}

export default function InfoImageEditor({
  infoImage,
  pendingFile,
  onChange,
  onPendingFileChange,
}: InfoImageEditorProps) {
  const [compressing, setCompressing] = useState(false);

  // 로컬 blob 프리뷰 — pendingFile 있을 때만 생성
  const localPreviewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );

  // 메모리 누수 방지: blob URL 정리
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  // 표시할 프리뷰: 선택된 파일 우선, 없으면 기존 저장된 URL
  const previewUrl = localPreviewUrl || infoImage;

  const handleImageSelect = async (file: File) => {
    if (!file) return;

    // 원본 한도 (20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert(
        `파일이 너무 큽니다.\n원본 ${(file.size / 1024 / 1024).toFixed(1)}MB → 최대 20MB까지 가능합니다.`
      );
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택 가능합니다.');
      return;
    }

    try {
      setCompressing(true);

      // 클라이언트 사전 WebP 압축 — 저장 시 빠른 업로드 + Vercel 4.5MB 한도 회피
      const compressed = await compressImage(file, {
        maxSizeMB: 3.5,
        maxWidthOrHeight: 1920,
        quality: 0.85,
        fileType: 'image/webp',
      });

      console.log('[InfoImage] pre-compressed (not uploaded yet)', {
        originalMB: (compressed.originalSize / 1024 / 1024).toFixed(2),
        compressedMB: (compressed.compressedSize / 1024 / 1024).toFixed(2),
        ratio: `${compressed.compressionRatio.toFixed(1)}%`,
      });

      onPendingFileChange(compressed.file);
    } catch (err) {
      console.error('[InfoImage] compress error:', err);
      alert(err instanceof Error ? err.message : '이미지 처리 실패');
    } finally {
      setCompressing(false);
    }
  };

  const handleImageRemove = () => {
    if (!confirm('정보 이미지를 삭제하시겠습니까? (페이지 상단 "저장" 클릭 시 적용)')) return;
    if (pendingFile) {
      // 새 선택만 취소 (아직 업로드 안 됨)
      onPendingFileChange(null);
    } else {
      // 기존 저장된 이미지 삭제 의도 — 저장 클릭 시 DB에서 제거됨
      onChange('');
    }
  };

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-3"></i>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">정보 이미지 안내</h3>
            <p className="text-sm text-blue-700">
              브랜드 페이지 정보 섹션에 표시될 이미지입니다.
              <br />
              제품/서비스 소개, 회사 연혁, 비전 등을 이미지로 표현할 수 있습니다.
              <br />
              <strong>
                최대 20MB · 자동 WebP 압축 · 페이지 상단 &quot;저장&quot; 버튼 클릭 시에만
                적용됩니다.
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* 이미지 영역 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <i className="fas fa-image text-blue-500 mr-2"></i>
          정보 이미지
        </label>

        {previewUrl ? (
          <div className="space-y-4">
            <div className="relative w-full border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
              {/* blob: URL 호환 위해 plain <img> 사용 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="정보 이미지"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />

              {/* 압축 중 작은 뱃지 (블로커 X) */}
              {compressing && (
                <div className="absolute top-2 right-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <i className="fas fa-spinner fa-spin"></i>
                  압축 중
                </div>
              )}

              {/* 미저장 상태 뱃지 — 사용자 가시성 */}
              {pendingFile && !compressing && (
                <div className="absolute top-2 right-2 bg-amber-500/95 text-white text-xs px-2 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <i className="fas fa-clock"></i>
                  저장 대기 중
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleImageRemove}
                disabled={compressing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
              >
                <i className="fas fa-trash mr-2"></i>
                이미지 삭제
              </button>

              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block">
                <i className="fas fa-sync-alt mr-2"></i>
                이미지 변경
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                  disabled={compressing}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <i className="fas fa-cloud-upload-alt text-gray-400 text-5xl mb-4"></i>
            <p className="text-gray-600 mb-4">
              정보 이미지를 선택하세요
              <br />
              <span className="text-sm text-gray-500">
                최대 20MB · JPG/PNG/WebP · 자동 WebP 압축
              </span>
            </p>

            <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              {compressing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  압축 중...
                </>
              ) : (
                <>
                  <i className="fas fa-upload mr-2"></i>
                  이미지 선택
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                  e.target.value = '';
                }}
                className="hidden"
                disabled={compressing}
              />
            </label>
          </div>
        )}

        <p className="mt-2 text-sm text-gray-500">
          <i className="fas fa-lightbulb text-yellow-500 mr-1"></i>
          권장: 가로 1200px 이상의 고해상도 이미지 (자동 압축됨)
        </p>
      </div>

      {/* 사용 예시 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
          활용 예시
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 회사 소개 인포그래픽</li>
          <li>• 제품/서비스 라인업 이미지</li>
          <li>• 회사 연혁 타임라인</li>
          <li>• 비전 및 미션 이미지</li>
          <li>• 조직도 또는 팀 소개</li>
        </ul>
      </div>
    </div>
  );
}
