'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { UserProfile, BusinessVerification } from '@/types/user.types';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updatedProfile: Partial<UserProfile>) => void;
}

export default function ProfileCompletionModal({
  isOpen,
  onClose,
  profile,
  onUpdateProfile
}: ProfileCompletionModalProps) {
  const [formData, setFormData] = useState({
    nickname: profile.nickname || '',
    company: profile.company || '',
    businessNumber: profile.businessNumber || '',
    businessAddress: profile.businessAddress || '',
    phone: profile.phone || ''
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<BusinessVerification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);

  // 필수 필드 체크 - 사업자 정보는 선택사항
  const isComplete = () => {
    // 닉네임과 회사명만 필수
    // 사업자 번호를 입력한 경우에만 검증 필요
    const hasRequiredFields = Boolean(formData.nickname && formData.company);

    // 사업자 번호를 입력한 경우 검증도 완료되어야 함
    const isBusinessInfoValid = !formData.businessNumber ||
                                (formData.businessNumber && verificationResult?.valid);

    return hasRequiredFields && isBusinessInfoValid;
  };

  // 사업자 번호 포맷팅 (XXX-XX-XXXXX)
  const formatBusinessNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    const match = numbers.match(/^(\d{0,3})(\d{0,2})(\d{0,5})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join('-');
    }
    return value;
  };

  // 사업자 번호 검증
  const verifyBusinessNumber = async () => {
    if (!formData.businessNumber || formData.businessNumber.replace(/-/g, '').length !== 10) {
      alert('올바른 사업자 번호를 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/business/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessNumber: formData.businessNumber.replace(/-/g, '') })
      });

      const result = await response.json();
      setVerificationResult(result);

      if (result.valid) {
        // 검증 성공 시 회사명과 주소 자동 입력
        if (result.companyName) {
          setFormData(prev => ({
            ...prev,
            company: result.companyName || prev.company,
            businessAddress: result.businessAddress || prev.businessAddress
          }));
        }
      } else {
        alert(result.message || '사업자 번호 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('Business verification error:', error);
      alert('사업자 번호 검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 프로필 업데이트
  const handleSubmit = async () => {
    if (!isComplete()) {
      alert('모든 필수 정보를 입력하고 사업자 번호를 검증해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateProfile({
        ...formData,
        businessVerified: true
      });

      // 완료 후 모달 닫기
      localStorage.setItem('profileCompletionDismissed', 'false');
      onClose();
    } catch (error) {
      console.error('Profile update error:', error);
      alert('프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 임시 닫기 (24시간 후 다시 표시)
  const handleTemporaryDismiss = () => {
    const dismissTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24시간 후
    localStorage.setItem('profileCompletionDismissedUntil', dismissTime.toString());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8">
        {/* 백드롭 */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={canDismiss ? handleTemporaryDismiss : undefined}
        />

        {/* 모달 - 화면 안에 들어가도록 max-h 추가 */}
        <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-3" />
              <h2 className="text-xl font-semibold">프로필을 완성해주세요</h2>
            </div>
            {canDismiss && (
              <button
                onClick={handleTemporaryDismiss}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-900 mb-6 font-semibold">
              나라똔 서비스를 원활하게 이용하시려면 필수 정보를 입력해주세요.
              <span className="text-blue-600">사업자 정보가 없으신 분은 예비창업회원으로 등록됩니다.</span>
            </p>

            <div className="space-y-4">
              {/* 닉네임 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  닉네임 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                  placeholder="활동할 닉네임을 입력하세요"
                />
              </div>

              {/* 회사명 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  회사명 (상호명) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                  placeholder="회사명을 입력하세요"
                />
              </div>

              {/* 사업자 번호 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  사업자 번호 <span className="text-gray-500">(선택)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.businessNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      businessNumber: formatBusinessNumber(e.target.value)
                    }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                    placeholder="000-00-00000"
                    maxLength={12}
                  />
                  <button
                    onClick={verifyBusinessNumber}
                    disabled={isVerifying || !formData.businessNumber}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? '검증 중...' : '검증'}
                  </button>
                </div>
                {verificationResult && (
                  <div className={`mt-2 text-sm flex items-center ${verificationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {verificationResult.valid ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        사업자 번호가 검증되었습니다.
                      </>
                    ) : (
                      <>
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        {verificationResult.message || '유효하지 않은 사업자 번호입니다.'}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 사업장 주소 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  사업장 주소 <span className="text-gray-500">(선택)</span>
                </label>
                <input
                  type="text"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                  placeholder="사업장 주소를 입력하세요"
                />
              </div>

              {/* 전화번호 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                  placeholder="010-0000-0000"
                />
              </div>
            </div>

            {/* 진행 상태 표시 */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-bold text-blue-800 mb-2">회원 등급</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center text-gray-900 font-medium">
                  <span className={`inline-block w-4 h-4 mr-2 rounded-full ${formData.nickname ? 'bg-green-500' : 'bg-gray-400'}`} />
                  닉네임
                </div>
                <div className="flex items-center text-gray-900 font-medium">
                  <span className={`inline-block w-4 h-4 mr-2 rounded-full ${formData.company ? 'bg-green-500' : 'bg-gray-400'}`} />
                  회사명
                </div>
                <div className="flex items-center text-gray-900 font-medium">
                  <span className={`inline-block w-4 h-4 mr-2 rounded-full ${formData.businessNumber && verificationResult?.valid ? 'bg-blue-500' : 'bg-gray-400'}`} />
                  {formData.businessNumber && verificationResult?.valid ? '사업자 회원' : '예비창업 회원'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center p-6 border-t bg-gray-50">
            <button
              onClick={handleTemporaryDismiss}
              className="px-4 py-2 text-sm text-gray-700 font-medium hover:text-gray-900"
            >
              나중에 하기 (24시간 후 재알림)
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isComplete() || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '저장 중...' : '프로필 완성하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}