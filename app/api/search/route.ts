import { NextRequest, NextResponse } from 'next/server';

/**
 * 검색 API - 사이트 내 페이지 검색
 *
 * @purpose 사용자가 입력한 검색어와 매칭되는 페이지 정보 반환
 * @context 메인 히어로 섹션의 검색창에서 호출
 * @note 각 페이지의 제목, 설명, 키워드를 기반으로 검색
 */

// 검색 가능한 페이지 데이터
const searchablePages = [
  {
    id: 'policy-analysis',
    title: '정책분석',
    description: '중소기업 정책자금, 지원사업 분석 및 안내',
    path: '/policy-analysis',
    keywords: [
      '정책자금',
      '정책분석',
      '중소기업',
      '지원사업',
      '정부지원',
      '자금지원',
      '보조금',
      '융자',
      '창업지원',
      '소상공인',
    ],
    category: '정책',
    sections: [
      { title: '정책자금 종류', anchor: '#policy-types' },
      { title: '지원 대상', anchor: '#eligibility' },
      { title: '신청 방법', anchor: '#application' },
    ],
  },
  {
    id: 'business-voice',
    title: '사업자 목소리',
    description: '실제 사업자들의 생생한 경험담과 성공 사례',
    path: '/business-voice',
    keywords: [
      '사업자',
      '목소리',
      '후기',
      '경험담',
      '성공사례',
      '사례',
      '인터뷰',
      '창업',
      '기업',
      '대표',
    ],
    category: '커뮤니티',
    sections: [
      { title: '성공 사례', anchor: '#success-stories' },
      { title: '사업자 인터뷰', anchor: '#interviews' },
    ],
  },
  {
    id: 'naraddon-tube',
    title: '나라똔 인터뷰',
    description: '정책자금, 사업 운영에 관한 영상 콘텐츠',
    path: '/#naraddon-tube',
    keywords: [
      '나라똔 인터뷰',
      '나라똔튜브',
      '영상',
      '동영상',
      '유튜브',
      'youtube',
      '콘텐츠',
      '강의',
      '교육',
      '정보',
    ],
    category: '미디어',
    sections: [],
  },
  {
    id: 'certified-examiners',
    title: '인증 기업심사관',
    description: '공인 기업심사관 자격 안내 및 목록',
    path: '/certified-examiners',
    keywords: [
      '인증',
      '심사관',
      '기업심사관',
      '자격',
      '공인',
      '전문가',
      '심사',
      '인증심사',
    ],
    category: '자격',
    sections: [],
  },
  {
    id: 'ttontok',
    title: '똔똑',
    description: 'AI 기반 사업 컨설팅 및 질문 답변 서비스',
    path: '/ttontok',
    keywords: [
      '똔똑',
      'AI',
      '인공지능',
      '챗봇',
      '상담',
      '질문',
      '답변',
      '컨설팅',
      '도움',
      '문의',
    ],
    category: 'AI 서비스',
    sections: [
      { title: 'AI 상담', anchor: '#ai-chat' },
      { title: '자주 묻는 질문', anchor: '#faq' },
    ],
  },
  {
    id: 'consultation-request',
    title: '상담 요청',
    description: '무료 심사 신청 및 사업 관련 Q&A',
    path: '/consultation-request',
    keywords: [
      '상담',
      '신청',
      '무료심사',
      '심사신청',
      'Q&A',
      '질문',
      '문의',
      '100가지',
      '사업자',
      '필수',
    ],
    category: '상담',
    sections: [
      { title: '무료 심사 신청', anchor: '#free-consultation' },
      { title: '사업자 Q&A 100가지', anchor: '#qna-section' },
    ],
  },
  {
    id: 'expert-services',
    title: '전문가 서비스',
    description: '인증 전문가의 맞춤형 컨설팅 서비스',
    path: '/expert-services',
    keywords: [
      '전문가',
      '서비스',
      '컨설팅',
      '인증',
      '심사',
      '전문',
      '상담사',
      '어드바이저',
      '자문',
    ],
    category: '서비스',
    sections: [
      { title: '전문가 소개', anchor: '#experts' },
      { title: '서비스 안내', anchor: '#services' },
    ],
  },
  {
    id: 'policy-news',
    title: '정책 뉴스',
    description: '최신 정책 소식 및 지원사업 공고',
    path: '/policy-news',
    keywords: [
      '정책',
      '뉴스',
      '소식',
      '공고',
      '최신',
      '지원사업',
      '공지',
      '안내',
      '발표',
    ],
    category: '뉴스',
    sections: [
      { title: '최신 뉴스', anchor: '#latest-news' },
      { title: '정책 공고', anchor: '#announcements' },
    ],
  },
];

/**
 * 검색 결과 인터페이스
 */
interface SearchResult {
  id: string;
  title: string;
  description: string;
  path: string;
  category: string;
  matchedKeywords: string[];
  relevanceScore: number;
  sections?: { title: string; anchor: string }[];
}

/**
 * 검색어와 페이지 매칭 점수 계산
 */
function calculateRelevance(query: string, page: typeof searchablePages[0]): number {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(Boolean);
  let score = 0;

  // 제목 매칭 (가장 높은 점수)
  if (page.title.toLowerCase().includes(queryLower)) {
    score += 100;
  }

  // 키워드 매칭
  page.keywords.forEach((keyword) => {
    if (keyword.toLowerCase().includes(queryLower)) {
      score += 50;
    }
    queryWords.forEach((word) => {
      if (keyword.toLowerCase().includes(word)) {
        score += 20;
      }
    });
  });

  // 설명 매칭
  if (page.description.toLowerCase().includes(queryLower)) {
    score += 30;
  }
  queryWords.forEach((word) => {
    if (page.description.toLowerCase().includes(word)) {
      score += 10;
    }
  });

  // 섹션 제목 매칭
  page.sections?.forEach((section) => {
    if (section.title.toLowerCase().includes(queryLower)) {
      score += 40;
    }
    queryWords.forEach((word) => {
      if (section.title.toLowerCase().includes(word)) {
        score += 15;
      }
    });
  });

  return score;
}

/**
 * 매칭된 키워드 추출
 */
function getMatchedKeywords(query: string, page: typeof searchablePages[0]): string[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(Boolean);
  const matched: string[] = [];

  page.keywords.forEach((keyword) => {
    if (keyword.toLowerCase().includes(queryLower)) {
      matched.push(keyword);
    } else {
      queryWords.forEach((word) => {
        if (keyword.toLowerCase().includes(word) && !matched.includes(keyword)) {
          matched.push(keyword);
        }
      });
    }
  });

  return matched.slice(0, 5); // 최대 5개 키워드
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  // 검색어 없으면 빈 결과 반환
  if (!query || query.trim().length === 0) {
    return NextResponse.json({
      success: true,
      results: [],
      query: '',
      total: 0,
    });
  }

  const trimmedQuery = query.trim();

  // 검색어가 너무 짧으면 경고
  if (trimmedQuery.length < 1) {
    return NextResponse.json({
      success: false,
      error: '검색어를 입력해주세요.',
      results: [],
      query: trimmedQuery,
      total: 0,
    });
  }

  // 검색 실행
  const results: SearchResult[] = searchablePages
    .map((page) => ({
      id: page.id,
      title: page.title,
      description: page.description,
      path: page.path,
      category: page.category,
      matchedKeywords: getMatchedKeywords(trimmedQuery, page),
      relevanceScore: calculateRelevance(trimmedQuery, page),
      sections: page.sections,
    }))
    .filter((result) => result.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return NextResponse.json({
    success: true,
    results,
    query: trimmedQuery,
    total: results.length,
  });
}
