'use client';

import React, { useState, useEffect } from 'react';

/**
 * 브랜드 페이지 회사소개 편집 컴포넌트
 *
 * @purpose 심사관이 회사소개, 소개내용, 전문영역, 지원목표를 직접 작성
 * @context 사용자 요청: "회사소개 소개내용 전문영역 지원목표 부분을 직접 작성할 수 있도록"
 * @decision
 *   - 기본 템플릿 사용 옵션 제공 (useDefaultIntro)
 *   - 사용자 정의 HTML 입력 가능 (wysiwyg 에디터 고려)
 *   - 구조화된 입력 필드로 전문영역, 지원목표 개별 입력
 */

interface BrandIntroEditorProps {
  companyIntro?: string;
  companyLogo?: string;
  useDefaultIntro: boolean;
  onChange: (companyIntro: string, useDefaultIntro: boolean, companyLogo?: string) => void;
  onSave?: () => Promise<void>;
}

export default function BrandIntroEditor({
  companyIntro = '',
  companyLogo = '',
  useDefaultIntro,
  onChange,
  onSave,
}: BrandIntroEditorProps) {
  const [localUseDefault, setLocalUseDefault] = useState(useDefaultIntro);
  const [localIntro, setLocalIntro] = useState(companyIntro);
  const [localLogo, setLocalLogo] = useState(companyLogo);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // 구조화된 입력을 위한 상태
  const [companyName, setCompanyName] = useState('');
  const [mainIntro, setMainIntro] = useState('');
  const [specialties, setSpecialties] = useState<string[]>(['']);
  const [goals, setGoals] = useState<string[]>(['']);
  const [visionMessage, setVisionMessage] = useState('');

  /**
   * 기존 HTML 파싱하여 폼 필드 채우기
   *
   * @purpose 이전에 저장한 내용을 수정할 수 있도록 폼에 로드
   * @context 사용자 요청: "기존 내용 남아있고 수정하거나 삭제할 수 있게"
   */
  useEffect(() => {
    if (!companyIntro || localUseDefault) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(companyIntro, 'text/html');

      // 회사명 추출 (h3 텍스트에서 "소개" 제거)
      const h3 = doc.querySelector('h3');
      let companyText = '';
      if (h3) {
        companyText = h3.textContent?.replace(' 소개', '').trim() || '';
        setCompanyName(companyText);
      }

      // 소개 내용 추출
      const p = doc.querySelector('p');
      if (p) {
        setMainIntro(p.textContent?.trim() || '');
      }

      // 전문 영역 추출 (첫 번째 .brand-about-section 또는 .about-section)
      const sections = doc.querySelectorAll('.brand-about-section, .about-section');
      let extractedSpecialties: string[] = [];
      if (sections[0]) {
        const lis = sections[0].querySelectorAll('li');
        extractedSpecialties = Array.from(lis)
          .map(li => li.textContent?.trim() || '')
          .filter(text => text);
        if (extractedSpecialties.length > 0) {
          setSpecialties(extractedSpecialties);
        }
      }

      // 지원 목표 추출 (두 번째 .brand-about-section 또는 .about-section)
      let extractedGoals: string[] = [];
      if (sections[1]) {
        const lis = sections[1].querySelectorAll('li');
        extractedGoals = Array.from(lis)
          .map(li => {
            // <strong> 태그 제거하고 텍스트만 추출
            const text = li.textContent?.trim() || '';
            return text;
          })
          .filter(text => text);
        if (extractedGoals.length > 0) {
          setGoals(extractedGoals);
        }
      }

      // 비전 메시지 추출
      const visionBox = doc.querySelector('.brand-vision-box strong, .vision-box strong');
      let vision = '';
      if (visionBox) {
        vision = visionBox.textContent?.trim().replace(/^"|"$/g, '') || '';
        setVisionMessage(vision);
      }

      console.log('[BrandIntroEditor] Parsed existing content:', {
        companyName: companyText,
        specialties: extractedSpecialties?.length,
        goals: extractedGoals?.length,
        visionMessage: vision
      });

    } catch (error) {
      console.error('[BrandIntroEditor] Failed to parse existing HTML:', error);
    }
  }, [companyIntro, localUseDefault]);

  /**
   * 기본 템플릿 토글
   *
   * @purpose 기본 템플릿 사용 여부 전환
   * @context useDefaultIntro가 true이면 기본 템플릿 표시, false이면 사용자 정의 내용 표시
   */
  const handleToggleDefault = (checked: boolean) => {
    setLocalUseDefault(checked);
    onChange(localIntro, checked, localLogo);
  };

  /**
   * 사용자 정의 HTML 변경
   *
   * @purpose 사용자가 직접 입력한 HTML 내용 저장
   * @note 향후 WYSIWYG 에디터 (TinyMCE, Quill 등) 도입 고려
   */
  const handleIntroChange = (value: string) => {
    setLocalIntro(value);
    onChange(value, localUseDefault, localLogo);
  };

  /**
   * 회사 로고 업로드
   *
   * @purpose 회사 로고 이미지를 Cloudflare R2에 업로드
   * @context 사용자 요청: "로고는 직접 올리면 반영 안올리면 미반영"
   */
  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      setUploadingLogo(true);

      const formData = new FormData();
      formData.append('image', file);

      // 심사관 브랜드 로고 업로드 API 사용 (examiner와 admin 권한 허용)
      const response = await fetch('/api/examiner/brand/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Logo Upload] Error:', errorData);
        throw new Error(errorData.error || '로고 업로드에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setLocalLogo(data.imageUrl);
        onChange(localIntro, localUseDefault, data.imageUrl);
        alert('로고가 업로드되었습니다.');
      } else {
        throw new Error(data.error || '업로드 URL을 받지 못했습니다.');
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      alert(error instanceof Error ? error.message : '로고 업로드 실패');
    } finally {
      setUploadingLogo(false);
    }
  };

  /**
   * 구조화된 입력으로 HTML 생성 및 저장
   *
   * @purpose 전문영역, 지원목표 등을 개별 입력받아 HTML 구조 생성하고 즉시 저장
   * @context 사용자 요청: "회사소개 적용 버튼으로 바로 저장" - 상단 저장 버튼과 동일하게 작동
   * @note data-styled 속성으로 CSS 모듈 스타일 적용 표시
   * @decision
   *   - HTML 생성 후 onChange로 부모 상태에 반영
   *   - React 상태 업데이트는 비동기이므로 setTimeout으로 다음 렌더 사이클에서 저장
   *   - 또는 onSave에 생성된 HTML을 직접 전달할 수 있도록 인터페이스 확장 필요
   */
  const generateStructuredHTML = async () => {
    const specialtiesList = specialties.filter((s) => s.trim()).map((s) => `<li>${s}</li>`).join('\n');
    const goalsList = goals.filter((g) => g.trim()).map((g) => `<li><strong>${g}</strong></li>`).join('\n');

    const html = `
<div data-custom-brand-content="true">
  <h3>${companyName || '회사명'} 소개</h3>
  <p>${mainIntro || '회사 소개 내용을 입력하세요.'}</p>

  <div class="brand-about-section">
    <h4><i class="fas fa-star"></i> 전문 영역</h4>
    <ul>
${specialtiesList || '<li>전문 영역을 입력하세요</li>'}
    </ul>
  </div>

  <div class="brand-about-section">
    <h4><i class="fas fa-bullseye"></i> 지원 목표</h4>
    <ul>
${goalsList || '<li>지원 목표를 입력하세요</li>'}
    </ul>
  </div>

  <div class="brand-vision-box">
    <strong>"${visionMessage || '비전 메시지를 입력하세요'}"</strong>
  </div>
</div>
    `.trim();

    // 로컬 상태 업데이트 (UI 표시용)
    setLocalIntro(html);
    setLocalUseDefault(false);

    // 부모 컴포넌트에 즉시 반영
    onChange(html, false, localLogo);

    // React 상태 업데이트는 배치되므로, 다음 렌더 사이클에서 저장
    // setTimeout을 사용하여 부모 컴포넌트의 상태가 업데이트된 후 저장
    if (onSave) {
      setTimeout(async () => {
        await onSave();
      }, 0);
    }
  };

  /**
   * 전문영역 항목 추가/삭제
   */
  const addSpecialty = () => setSpecialties([...specialties, '']);
  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };
  const updateSpecialty = (index: number, value: string) => {
    const updated = [...specialties];
    updated[index] = value;
    setSpecialties(updated);
  };

  /**
   * 지원목표 항목 추가/삭제
   */
  const addGoal = () => setGoals([...goals, '']);
  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };
  const updateGoal = (index: number, value: string) => {
    const updated = [...goals];
    updated[index] = value;
    setGoals(updated);
  };

  return (
    <div className="space-y-6">
      {/* 기본 템플릿 사용 여부 */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h3 className="text-lg font-medium text-gray-900">기본 템플릿 사용</h3>
          <p className="text-sm text-gray-600 mt-1">
            기본 템플릿을 사용하면 나라똔 기본 회사소개 문구가 표시됩니다.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={localUseDefault}
            onChange={(e) => handleToggleDefault(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* 회사 로고 업로드 */}
      <div className="border border-gray-300 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          <i className="fas fa-image mr-2 text-purple-600"></i>
          회사 로고 (선택사항)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          로고를 업로드하면 브랜드 페이지에 표시됩니다. 업로드하지 않으면 나라똔 기본 로고가 표시됩니다.
        </p>

        <div className="flex items-center space-x-6">
          {/* 로고 미리보기 */}
          {localLogo && (
            <div className="flex-shrink-0">
              <div className="w-32 h-32 border border-gray-300 rounded-lg overflow-hidden bg-white p-2 flex items-center justify-center">
                <img
                  src={localLogo}
                  alt="회사 로고"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* 업로드 영역 */}
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
              disabled={uploadingLogo}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-2">
              {uploadingLogo ? (
                <span className="text-purple-600">
                  <i className="fas fa-spinner fa-spin mr-1"></i>
                  업로드 중...
                </span>
              ) : (
                '권장: PNG (투명 배경) 또는 JPG, 최대 5MB'
              )}
            </p>
            {localLogo && (
              <button
                type="button"
                onClick={() => {
                  setLocalLogo('');
                  onChange(localIntro, localUseDefault, '');
                }}
                className="mt-3 px-4 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
              >
                <i className="fas fa-times mr-1"></i>
                로고 제거
              </button>
            )}
          </div>
        </div>
      </div>

      {!localUseDefault && (
        <>
          {/* 구조화된 입력 모드 */}
          <div className="border border-gray-300 rounded-lg p-6 bg-white">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              <i className="fas fa-edit mr-2 text-blue-600"></i>
              구조화된 정보 입력
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              아래 양식을 채우고 "HTML 생성" 버튼을 클릭하면 자동으로 회사소개 HTML이 생성됩니다.
            </p>

            {/* 회사명 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                회사명 / 브랜드명
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 나라똔 인증 기업심사관"
              />
            </div>

            {/* 회사 소개 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                소개 내용
              </label>
              <textarea
                value={mainIntro}
                onChange={(e) => setMainIntro(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 정부 지원사업 심사 대비를 돕는 경영컨설턴트입니다."
              />
            </div>

            {/* 전문 영역 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전문 영역
              </label>
              {specialties.map((specialty, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => updateSpecialty(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`전문 영역 ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecialty(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSpecialty}
                className="mt-2 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                <i className="fas fa-plus mr-2"></i>
                전문 영역 추가
              </button>
            </div>

            {/* 지원 목표 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                지원 목표
              </label>
              {goals.map((goal, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => updateGoal(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`지원 목표 ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeGoal(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addGoal}
                className="mt-2 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                <i className="fas fa-plus mr-2"></i>
                지원 목표 추가
              </button>
            </div>

            {/* 비전 메시지 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비전 메시지 (선택사항)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={visionMessage}
                  onChange={(e) => setVisionMessage(e.target.value)}
                  maxLength={35}
                  className={`w-full px-3 py-2 pr-16 border rounded-lg focus:ring-2 focus:border-transparent ${
                    visionMessage.length > 35
                      ? 'border-red-500 focus:ring-red-500'
                      : visionMessage.length >= 30
                      ? 'border-yellow-500 focus:ring-yellow-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder='예: "나라똔 인증 기업심사관과 함께 성공적인 사업 기회를 만드세요"'
                />
                <span
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${
                    visionMessage.length > 35
                      ? 'text-red-600'
                      : visionMessage.length >= 30
                      ? 'text-yellow-600'
                      : 'text-gray-500'
                  }`}
                >
                  {visionMessage.length}/35
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                <i className="fas fa-info-circle mr-1"></i>
                기본 멘트와 같은 길이(공백 포함 35자)를 권장합니다. 너무 길면 디자인이 깨질 수 있습니다.
              </p>
            </div>

            {/* HTML 생성 버튼 */}
            <button
              type="button"
              onClick={generateStructuredHTML}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              <i className="fas fa-save mr-2"></i>
              회사소개 적용
            </button>
          </div>
        </>
      )}

      {localUseDefault && (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            <i className="fas fa-info-circle mr-2"></i>
            기본 템플릿이 적용됩니다. 사용자 정의 내용을 작성하려면 위의 토글을 끄세요.
          </p>
        </div>
      )}
    </div>
  );
}
