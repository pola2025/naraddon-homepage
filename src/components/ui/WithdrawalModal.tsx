/**
 * 회원 탈퇴 확인 모달
 *
 * @purpose 사용자가 계정을 탈퇴할 때 확인 및 사유 수집
 * @context 탈퇴는 되돌릴 수 없는 작업이므로 신중한 확인 필요
 * @note 탈퇴 사유는 서비스 개선을 위해 수집
 */

'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

/**
 * 탈퇴 사유 옵션
 */
const WITHDRAWAL_REASONS = [
  '더 이상 사용하지 않음',
  '서비스 불만족',
  '개인정보 보호 우려',
  '다른 서비스 이용',
  '기능 부족',
  '기타',
] as const;

export default function WithdrawalModal({
  isOpen,
  onClose,
  userEmail,
}: WithdrawalModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  /**
   * 탈퇴 처리 핸들러
   *
   * @purpose 사용자 계정 삭제 및 로그아웃
   */
  const handleWithdrawal = async () => {
    try {
      setIsProcessing(true);
      setError('');

      // 1. 탈퇴 사유 검증
      const reason = selectedReason === '기타' ? customReason : selectedReason;
      if (!reason || reason.trim() === '') {
        setError('탈퇴 사유를 선택하거나 입력해주세요');
        setIsProcessing(false);
        return;
      }

      // 2. DELETE API 호출
      const response = await fetch(`/api/users/${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim(),
          feedback: feedback.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '탈퇴 처리에 실패했습니다');
      }

      // 3. 성공 시 로그아웃
      alert('계정이 성공적으로 탈퇴되었습니다.\n그동안 이용해 주셔서 감사합니다.');
      await signOut({ callbackUrl: '/' });
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError(err instanceof Error ? err.message : '탈퇴 처리 중 오류가 발생했습니다');
      setIsProcessing(false);
    }
  };

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">회원 탈퇴</h2>
          <p className="text-sm text-gray-600 mt-1">
            탈퇴 전에 아래 내용을 꼭 확인해주세요
          </p>
        </div>

        {/* 본문 */}
        <div className="px-6 py-4">
          {/* 경고 메시지 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-red-800 mb-2">⚠️ 주의사항</h3>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>탈퇴 후 계정 정보는 복구할 수 없습니다</li>
              <li>작성하신 게시글과 댓글은 삭제되지 않고 유지됩니다</li>
              <li>동일한 이메일로 재가입이 가능합니다</li>
            </ul>
          </div>

          {/* 탈퇴 사유 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              탈퇴 사유를 선택해주세요 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {WITHDRAWAL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                    disabled={isProcessing}
                  />
                  <span className="text-sm text-gray-700">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 기타 사유 입력 */}
          {selectedReason === '기타' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                탈퇴 사유를 입력해주세요 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="탈퇴 사유를 입력해주세요"
                disabled={isProcessing}
              />
            </div>
          )}

          {/* 추가 피드백 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              개선 의견 (선택사항)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="서비스 개선을 위해 의견을 남겨주시면 감사하겠습니다"
              disabled={isProcessing}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handleWithdrawal}
            disabled={isProcessing || !selectedReason}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '처리 중...' : '탈퇴하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
