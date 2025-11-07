'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

/**
 * 전화번호 입력 모달
 *
 * @purpose 네이버 OAuth에서 전화번호를 받지 못한 사용자에게 입력 요청
 * @context 로그인 직후 mobile 없으면 표시, 입력 후 다시 안 뜸
 * @decision "나중에" 클릭 시 sessionStorage에 저장하여 세션 종료까지만 숨김
 */

interface PhoneNumberModalProps {
  onClose: () => void;
  onSave: (phoneNumber: string) => void;
}

export default function PhoneNumberModal({ onClose, onSave }: PhoneNumberModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * 전화번호 형식 검증
   *
   * @purpose 010-xxxx-xxxx 형식 확인
   * @returns 유효하면 true
   */
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  /**
   * 전화번호 자동 포맷팅
   *
   * @purpose 사용자가 숫자만 입력해도 자동으로 하이픈 추가
   * @example 01012345678 → 010-1234-5678
   */
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');

    // 최대 11자리까지만
    const limited = numbers.slice(0, 11);

    // 자동 포맷팅
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
    }
  };

  /**
   * 전화번호 입력 핸들러
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  /**
   * 전화번호 저장
   */
  const handleSave = async () => {
    // 유효성 검사
    if (!validatePhoneNumber(phoneNumber)) {
      setError('올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('[PhoneModal] Saving phone:', phoneNumber);

      // API 호출하여 전화번호 저장
      const response = await fetch('/api/users/update-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phoneNumber }),
      });

      console.log('[PhoneModal] Response status:', response.status);

      const data = await response.json();
      console.log('[PhoneModal] Response data:', data);

      // success 필드가 false이거나 HTTP 상태 코드가 에러인 경우
      if (!response.ok || data.success === false) {
        throw new Error(data.message || '전화번호 저장에 실패했습니다');
      }

      // 성공
      console.log('[PhoneModal] ✅ Save success');
      onSave(phoneNumber);
    } catch (err: any) {
      console.error('[PhoneModal] ❌ Save failed:', err);
      setError(err.message || '전화번호 저장 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * "나중에" 클릭 핸들러
   *
   * @purpose sessionStorage에 저장하여 이번 세션에만 숨김
   * @context 다음 로그인 시 다시 표시됨
   */
  const handleLater = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hidePhoneModal', 'true');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* 헤더 */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          전화번호 등록
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          원활한 서비스 이용을 위해 전화번호를 등록해주세요
        </p>

        {/* 입력 필드 */}
        <div className="mb-4">
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            휴대폰 번호
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder="010-1234-5678"
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            disabled={isLoading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleLater}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            나중에
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !phoneNumber}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '저장 중...' : '등록하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
