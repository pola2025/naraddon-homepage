'use client';

import { useState } from 'react';
import { User, isProfileComplete } from '@/types/user.types';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ProfileEditModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
}

export default function ProfileEditModal({ user, isOpen, onClose, onSave }: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    nickname: user.profile.nickname || '',
    email: user.email,
    company: user.profile.company || '',
    businessNumber: user.profile.businessNumber || '',
    businessAddress: user.profile.businessAddress || '',
    phone: user.profile.phone || '',
    introduction: user.profile.introduction || ''
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nickname.trim()) {
      newErrors.nickname = '닉네임을 입력해주세요.';
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!formData.company.trim()) {
      newErrors.company = '상호명을 입력해주세요.';
    }

    if (!formData.businessNumber.trim()) {
      newErrors.businessNumber = '사업자 번호를 입력해주세요.';
    }

    if (!formData.businessAddress.trim()) {
      newErrors.businessAddress = '사업장 소재지를 입력해주세요.';
    }

    if (!user.profile.businessVerified && !verificationResult?.valid) {
      newErrors.businessNumber = '사업자 번호 검증이 필요합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBusinessVerification = async () => {
    if (!formData.businessNumber) {
      setErrors({ ...errors, businessNumber: '사업자 번호를 입력해주세요.' });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/business/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessNumber: formData.businessNumber })
      });

      const result = await response.json();
      setVerificationResult(result);

      if (result.valid) {
        setFormData({
          ...formData,
          company: result.companyName || formData.company,
          businessAddress: result.businessAddress || formData.businessAddress
        });
        setErrors({ ...errors, businessNumber: '' });
      } else {
        setErrors({ ...errors, businessNumber: result.message || '유효하지 않은 사업자 번호입니다.' });
      }
    } catch (error) {
      setErrors({ ...errors, businessNumber: '검증 중 오류가 발생했습니다.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const updatedUser: User = {
      ...user,
      email: formData.email,
      profile: {
        ...user.profile,
        nickname: formData.nickname,
        company: formData.company,
        businessNumber: formData.businessNumber,
        businessAddress: formData.businessAddress,
        businessVerified: verificationResult?.valid || user.profile.businessVerified,
        phone: formData.phone,
        introduction: formData.introduction
      },
      profileComplete: isProfileComplete({
        ...user.profile,
        nickname: formData.nickname,
        company: formData.company,
        businessNumber: formData.businessNumber,
        businessAddress: formData.businessAddress,
        businessVerified: verificationResult?.valid || user.profile.businessVerified
      })
    };

    onSave(updatedUser);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">프로필 정보 수정</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {/* 필수 정보 알림 */}
          {!isProfileComplete(user.profile) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">필수 정보를 입력해주세요</h3>
                  <p className="mt-1 text-sm text-red-600">
                    모든 필수 정보를 입력해야 게시글 작성 권한이 부여됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* 닉네임 (필수) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                닉네임 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className={`mt-1 block w-full rounded-md border ${
                  errors.nickname ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 focus:border-blue-500 focus:outline-none`}
              />
              {errors.nickname && (
                <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>
              )}
            </div>

            {/* 이메일 (필수) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`mt-1 block w-full rounded-md border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 focus:border-blue-500 focus:outline-none`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* 사업자 번호 (필수) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                사업자 번호 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex space-x-2">
                <input
                  type="text"
                  value={formData.businessNumber}
                  onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                  placeholder="123-45-67890"
                  className={`flex-1 rounded-md border ${
                    errors.businessNumber ? 'border-red-300' : 'border-gray-300'
                  } px-3 py-2 focus:border-blue-500 focus:outline-none`}
                />
                <button
                  onClick={handleBusinessVerification}
                  disabled={isVerifying}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isVerifying ? '검증 중...' : '검증'}
                </button>
              </div>
              {errors.businessNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.businessNumber}</p>
              )}
              {verificationResult?.valid && (
                <p className="mt-1 text-sm text-green-600">✓ 사업자 번호가 검증되었습니다.</p>
              )}
            </div>

            {/* 상호명 (필수) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                상호명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className={`mt-1 block w-full rounded-md border ${
                  errors.company ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 focus:border-blue-500 focus:outline-none`}
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-600">{errors.company}</p>
              )}
            </div>

            {/* 사업장 소재지 (필수) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                사업장 소재지 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                placeholder="정확한 주소를 입력해주세요"
                className={`mt-1 block w-full rounded-md border ${
                  errors.businessAddress ? 'border-red-300' : 'border-gray-300'
                } px-3 py-2 focus:border-blue-500 focus:outline-none`}
              />
              {errors.businessAddress && (
                <p className="mt-1 text-sm text-red-600">{errors.businessAddress}</p>
              )}
            </div>

            {/* 휴대폰 번호 (선택) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">휴대폰 번호</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="010-1234-5678"
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* 자기소개 (선택) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">자기소개</label>
              <textarea
                value={formData.introduction}
                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}