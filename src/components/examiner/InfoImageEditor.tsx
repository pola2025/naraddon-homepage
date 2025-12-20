'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * 정보 이미지 편집기
 *
 * @purpose 브랜드 페이지 정보 섹션에 표시될 이미지 업로드
 * @context 심사관이 브랜드 정보 이미지를 업로드하여 소개 페이지에 표시
 * @decision
 *   - 최대 10MB 이미지 업로드 가능
 *   - 업로드 시 자동 압축 (API에서 처리)
 *   - Cloudflare R2에 저장
 */

interface InfoImageEditorProps {
  infoImage: string;
  onChange: (imageUrl: string) => void;
  onSave: () => Promise<void>;
}

export default function InfoImageEditor({ infoImage, onChange, onSave }: InfoImageEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(infoImage);

  /**
   * 이미지 파일 업로드
   *
   * @purpose 선택한 이미지를 R2에 업로드하고 자동 압축
   * @note 업로드 API에서 sharp를 사용하여 이미지 압축 처리
   */
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', 'info-image');

      const response = await fetch('/api/examiner/brand/upload-info-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setPreviewUrl(data.imageUrl);
        onChange(data.imageUrl);
        alert('이미지가 업로드되었습니다. 페이지 상단의 "저장" 버튼을 클릭하여 최종 저장하세요.');
      } else {
        throw new Error(data.error || '업로드 실패');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert(error instanceof Error ? error.message : '이미지 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  /**
   * 이미지 삭제
   */
  const handleImageRemove = () => {
    if (confirm('정보 이미지를 삭제하시겠습니까?')) {
      setPreviewUrl('');
      onChange('');
      alert('이미지가 삭제되었습니다. 페이지 상단의 "저장" 버튼을 클릭하여 최종 저장하세요.');
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
              <strong>최대 10MB까지 업로드 가능하며, 자동으로 압축됩니다.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 이미지 업로드 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <i className="fas fa-image text-blue-500 mr-2"></i>
          정보 이미지
        </label>

        {previewUrl ? (
          /* 이미지 미리보기 */
          <div className="space-y-4">
            <div className="relative w-full border border-gray-300 rounded-lg overflow-hidden">
              <Image
                src={previewUrl}
                alt="정보 이미지"
                width={1200}
                height={800}
                style={{ width: '100%', height: 'auto' }}
                className="object-contain"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleImageRemove}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
                    if (file) handleImageUpload(file);
                    // 파일 선택 후 초기화하여 같은 파일 재선택 가능하게
                    e.target.value = '';
                  }}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        ) : (
          /* 업로드 버튼 */
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <i className="fas fa-cloud-upload-alt text-gray-400 text-5xl mb-4"></i>
            <p className="text-gray-600 mb-4">
              정보 이미지를 업로드하세요
              <br />
              <span className="text-sm text-gray-500">최대 10MB, JPG/PNG/GIF 형식</span>
            </p>

            <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              {uploading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  업로드 중...
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
                  if (file) handleImageUpload(file);
                }}
                className="hidden"
                disabled={uploading}
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
