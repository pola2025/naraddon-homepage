'use client';

import React, { useState } from 'react';

/**
 * 경력 섹션 편집 컴포넌트
 *
 * @purpose 심사관이 경력사항을 직접 추가/수정/삭제
 * @context 사용자 요청: "경력도 작성"
 * @decision
 *   - 경력 항목별 추가/수정/삭제 기능
 *   - 기간, 회사명, 직책, 설명 필드 제공
 *   - 드래그앤드롭으로 순서 변경 (향후 구현 가능)
 */

interface Career {
  period: string;
  company: string;
  position: string;
  description?: string;
}

interface CareerEditorProps {
  careers: Career[];
  onChange: (careers: Career[]) => void;
}

export default function CareerEditor({ careers, onChange }: CareerEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  /**
   * 새 경력 항목 추가
   *
   * @purpose 빈 경력 항목 추가 및 편집 모드 활성화
   */
  const addCareer = () => {
    const newCareer: Career = {
      period: '',
      company: '',
      position: '',
      description: '',
    };
    const updated = [...careers, newCareer];
    onChange(updated);
    setEditingIndex(updated.length - 1);
  };

  /**
   * 경력 항목 수정
   *
   * @purpose 특정 인덱스의 경력 정보 업데이트
   */
  const updateCareer = (index: number, field: keyof Career, value: string) => {
    const updated = [...careers];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  /**
   * 경력 항목 삭제
   *
   * @purpose 특정 인덱스의 경력 항목 제거
   * @context 사용자 확인 후 삭제
   */
  const deleteCareer = (index: number) => {
    if (confirm('이 경력을 삭제하시겠습니까?')) {
      const updated = careers.filter((_, i) => i !== index);
      onChange(updated);
      if (editingIndex === index) {
        setEditingIndex(null);
      }
    }
  };

  /**
   * 경력 순서 변경 (위로 이동)
   */
  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...careers];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  /**
   * 경력 순서 변경 (아래로 이동)
   */
  const moveDown = (index: number) => {
    if (index === careers.length - 1) return;
    const updated = [...careers];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* 안내 메시지 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <i className="fas fa-info-circle mr-2"></i>
          경력사항을 추가하고 순서를 조정하세요. 최신 경력부터 작성하는 것을 권장합니다.
        </p>
      </div>

      {/* 경력 리스트 */}
      <div className="space-y-4">
        {careers.map((career, index) => (
          <div
            key={index}
            className="border border-gray-300 rounded-lg p-6 bg-white hover:shadow-md transition-shadow"
          >
            {/* 경력 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {career.position || '직책 미입력'} - {career.company || '회사명 미입력'}
              </h4>
              <div className="flex items-center space-x-2">
                {/* 순서 변경 버튼 */}
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="위로 이동"
                >
                  <i className="fas fa-chevron-up"></i>
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === careers.length - 1}
                  className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="아래로 이동"
                >
                  <i className="fas fa-chevron-down"></i>
                </button>

                {/* 편집/삭제 버튼 */}
                <button
                  type="button"
                  onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                  className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <i className={`fas ${editingIndex === index ? 'fa-times' : 'fa-edit'} mr-1`}></i>
                  {editingIndex === index ? '닫기' : '편집'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteCareer(index)}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <i className="fas fa-trash mr-1"></i>
                  삭제
                </button>
              </div>
            </div>

            {/* 편집 모드 */}
            {editingIndex === index ? (
              <div className="space-y-4">
                {/* 기간 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    기간
                  </label>
                  <input
                    type="text"
                    value={career.period}
                    onChange={(e) => updateCareer(index, 'period', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 2020.01 - 2023.12 또는 2020.01 - 현재"
                  />
                </div>

                {/* 회사명 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    회사명
                  </label>
                  <input
                    type="text"
                    value={career.company}
                    onChange={(e) => updateCareer(index, 'company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 나라똔 주식회사"
                  />
                </div>

                {/* 직책 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    직책
                  </label>
                  <input
                    type="text"
                    value={career.position}
                    onChange={(e) => updateCareer(index, 'position', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 대표이사, 수석 컨설턴트"
                  />
                </div>

                {/* 설명 (선택사항) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명 (선택사항)
                  </label>
                  <textarea
                    value={career.description || ''}
                    onChange={(e) => updateCareer(index, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="주요 업무 및 성과를 간략히 작성하세요 (선택사항)"
                  />
                </div>
              </div>
            ) : (
              /* 미리보기 모드 */
              <div className="text-gray-700">
                <p className="text-sm text-gray-600 mb-2">
                  <i className="fas fa-calendar-alt mr-2"></i>
                  {career.period || '기간 미입력'}
                </p>
                {career.description && (
                  <p className="text-sm text-gray-600 mt-2">{career.description}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 새 경력 추가 버튼 */}
      <button
        type="button"
        onClick={addCareer}
        className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <i className="fas fa-plus-circle mr-2"></i>
        새 경력 추가
      </button>

      {/* 안내 메시지 - 경력이 없을 때 */}
      {careers.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <i className="fas fa-briefcase text-4xl text-gray-300 mb-4"></i>
          <p className="text-gray-600">
            아직 추가된 경력이 없습니다.<br />
            위의 "새 경력 추가" 버튼을 클릭하여 경력을 추가하세요.
          </p>
        </div>
      )}
    </div>
  );
}
