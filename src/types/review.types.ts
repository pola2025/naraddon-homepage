// 상담 리뷰 및 평가 타입 정의

export interface ConsultationReview {
  id?: string;
  consultationId: string;

  // 평가 대상
  examinerId: string;          // 평가 대상 기업심사관 ID
  examinerName: string;         // 기업심사관 이름

  // 평가자 정보
  reviewerId: string;          // 평가 작성자 ID
  reviewerName: string;        // 평가 작성자 이름
  reviewerEmail: string;

  // 5가지 평가 항목 (각각 1-5점)
  ratings: {
    professionalism: number;   // 전문성: 업무 지식과 전문적인 조언
    communication: number;      // 소통능력: 명확하고 이해하기 쉬운 설명
    responsiveness: number;     // 응답속도: 빠른 피드백과 일정 준수
    problemSolving: number;     // 문제해결: 실질적인 해결책 제시
    satisfaction: number;       // 전반적 만족도: 전체적인 서비스 만족도
  };

  // 평균 점수
  averageRating: number;

  // 텍스트 리뷰
  review: {
    goodPoints?: string;       // 좋았던 점
    improvements?: string;      // 개선이 필요한 점
    additionalComments?: string; // 추가 의견
  };

  // 추천 여부
  wouldRecommend: boolean;

  // 메타데이터
  createdAt: Date;
  updatedAt?: Date;

  // 리뷰 상태
  status: 'draft' | 'submitted' | 'approved' | 'hidden';

  // 관리자 메모 (내부용)
  adminNotes?: string;
}

// 평가 항목 라벨
export const RATING_LABELS = {
  professionalism: {
    label: '전문성',
    description: '업무 지식과 전문적인 조언 제공'
  },
  communication: {
    label: '소통능력',
    description: '명확하고 이해하기 쉬운 설명'
  },
  responsiveness: {
    label: '응답속도',
    description: '빠른 피드백과 일정 준수'
  },
  problemSolving: {
    label: '문제해결',
    description: '실질적인 해결책 제시'
  },
  satisfaction: {
    label: '전반적 만족도',
    description: '전체적인 서비스 만족도'
  }
};

// 별점 텍스트 표현
export const RATING_TEXT = {
  1: '매우 불만족',
  2: '불만족',
  3: '보통',
  4: '만족',
  5: '매우 만족'
};

// 심사관 통계
export interface ExaminerStats {
  examinerId: string;
  examinerName: string;

  // 평가 통계
  totalReviews: number;
  averageRatings: {
    professionalism: number;
    communication: number;
    responsiveness: number;
    problemSolving: number;
    satisfaction: number;
    overall: number;
  };

  // 추천율
  recommendationRate: number; // 퍼센트

  // 최근 리뷰
  recentReviews: ConsultationReview[];

  // 상담 통계
  totalConsultations: number;
  completedConsultations: number;
  contractedConsultations: number;
  successRate: number; // 계약 성공률
}