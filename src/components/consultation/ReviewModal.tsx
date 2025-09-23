'use client';

import { useState } from 'react';
import { XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { RATING_LABELS, RATING_TEXT } from '@/types/review.types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  auditorName: string;
  onSubmit: (review: any) => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  consultationId,
  auditorName,
  onSubmit
}: ReviewModalProps) {
  const [ratings, setRatings] = useState({
    professionalism: 0,
    communication: 0,
    responsiveness: 0,
    problemSolving: 0,
    satisfaction: 0
  });

  const [hoveredRatings, setHoveredRatings] = useState({
    professionalism: 0,
    communication: 0,
    responsiveness: 0,
    problemSolving: 0,
    satisfaction: 0
  });

  const [review, setReview] = useState({
    goodPoints: '',
    improvements: '',
    additionalComments: ''
  });

  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingClick = (category: keyof typeof ratings, value: number) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleRatingHover = (category: keyof typeof ratings, value: number) => {
    setHoveredRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleRatingLeave = (category: keyof typeof ratings) => {
    setHoveredRatings(prev => ({ ...prev, [category]: 0 }));
  };

  const calculateAverage = () => {
    const values = Object.values(ratings);
    const sum = values.reduce((a, b) => a + b, 0);
    return values.length > 0 ? (sum / values.length).toFixed(1) : '0.0';
  };

  const isValid = () => {
    const allRated = Object.values(ratings).every(r => r > 0);
    const hasReview = review.goodPoints || review.improvements || review.additionalComments;
    return allRated && hasReview && wouldRecommend !== null;
  };

  const handleSubmit = async () => {
    if (!isValid()) {
      alert('모든 평가 항목을 작성해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        consultationId,
        ratings,
        review,
        wouldRecommend,
        averageRating: parseFloat(calculateAverage())
      });
      onClose();
    } catch (error) {
      console.error('Review submission error:', error);
      alert('리뷰 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold">상담 평가하기</h2>
              <p className="text-sm text-gray-500 mt-1">
                {auditorName} 심사관님의 상담은 어떠셨나요?
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* 평가 항목 */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">평가 항목</h3>

              {Object.entries(RATING_LABELS).map(([key, item]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {ratings[key as keyof typeof ratings] > 0 &&
                        RATING_TEXT[ratings[key as keyof typeof ratings] as keyof typeof RATING_TEXT]
                      }
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        onClick={() => handleRatingClick(key as keyof typeof ratings, value)}
                        onMouseEnter={() => handleRatingHover(key as keyof typeof ratings, value)}
                        onMouseLeave={() => handleRatingLeave(key as keyof typeof ratings)}
                        className="p-1"
                      >
                        {value <= (hoveredRatings[key as keyof typeof ratings] || ratings[key as keyof typeof ratings]) ? (
                          <StarIconSolid className="h-8 w-8 text-yellow-400" />
                        ) : (
                          <StarIcon className="h-8 w-8 text-gray-300" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* 평균 점수 표시 */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">평균 점수</span>
                  <div className="flex items-center">
                    <StarIconSolid className="h-5 w-5 text-yellow-400 mr-1" />
                    <span className="text-lg font-bold text-blue-900">{calculateAverage()}</span>
                    <span className="text-sm text-blue-700 ml-1">/ 5.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 텍스트 리뷰 */}
            <div className="space-y-4 mt-8">
              <h3 className="text-lg font-semibold">상세 평가</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  좋았던 점 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={review.goodPoints}
                  onChange={(e) => setReview(prev => ({ ...prev, goodPoints: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="상담에서 특히 만족스러웠던 점을 알려주세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  개선이 필요한 점
                </label>
                <textarea
                  value={review.improvements}
                  onChange={(e) => setReview(prev => ({ ...prev, improvements: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="더 나은 서비스를 위해 개선되었으면 하는 점이 있다면 알려주세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  추가 의견
                </label>
                <textarea
                  value={review.additionalComments}
                  onChange={(e) => setReview(prev => ({ ...prev, additionalComments: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="기타 전달하고 싶은 의견이 있다면 자유롭게 작성해주세요"
                />
              </div>
            </div>

            {/* 추천 여부 */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">추천 의향</h3>
              <p className="text-sm text-gray-600 mb-4">
                이 심사관님을 다른 분들께 추천하시겠습니까?
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setWouldRecommend(true)}
                  className={`flex-1 py-3 px-4 rounded-md border-2 transition-colors ${
                    wouldRecommend === true
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-2xl mb-1">👍</span>
                  <p className="font-medium">예, 추천합니다</p>
                </button>
                <button
                  onClick={() => setWouldRecommend(false)}
                  className={`flex-1 py-3 px-4 rounded-md border-2 transition-colors ${
                    wouldRecommend === false
                      ? 'border-gray-500 bg-gray-50 text-gray-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-2xl mb-1">👎</span>
                  <p className="font-medium">아니요</p>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 mr-3"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid() || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '제출 중...' : '평가 제출'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}