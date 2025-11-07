/**
 * 구조화된 데이터 (JSON-LD) 생성 유틸리티
 *
 * @purpose Google/Naver 검색 결과에 Rich Snippet 표시
 * @context 나라똔 비즈니스에 맞는 스키마만 포함
 */

/**
 * 회사 정보 (Organization Schema)
 *
 * @purpose 검색 결과에 회사 로고, 이름, SNS 표시
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '나라똔',
    alternateName: 'NARADDON',
    url: 'https://naraddon.com',
    logo: 'https://naraddon.com/logo.png',
    description: '정부정책자금 전문 컨설팅 플랫폼. 인증 기업심사관과 함께하는 정책자금 성공 파트너',
    sameAs: [
      // SNS 추가 시 여기에 링크
      // 'https://www.facebook.com/naraddon',
      // 'https://www.instagram.com/naraddon',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Korean'],
    },
  };
}

/**
 * 인증심사관 프로필 (Person Schema)
 *
 * @purpose 검색 결과에 전문가 프로필 표시
 */
export function getExaminerPersonSchema(examiner: {
  name: string;
  companyName: string;
  imageUrl?: string;
  position?: string;
  specialties?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: examiner.name,
    jobTitle: examiner.position || '인증 기업심사관',
    worksFor: {
      '@type': 'Organization',
      name: examiner.companyName,
    },
    image: examiner.imageUrl,
    knowsAbout: examiner.specialties || [],
    url: `https://naraddon.com/certified-examiners/${examiner.name}`,
  };
}

/**
 * 정책 뉴스/분석 게시글 (Article Schema)
 *
 * @purpose 검색 결과에 기사 정보 표시 (작성일, 수정일 등)
 */
export function getArticleSchema(article: {
  title: string;
  description: string;
  author: string;
  publishedAt: Date;
  updatedAt?: Date;
  imageUrl?: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: '나라똔',
      logo: {
        '@type': 'ImageObject',
        url: 'https://naraddon.com/logo.png',
      },
    },
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt?.toISOString() || article.publishedAt.toISOString(),
    image: article.imageUrl,
    url: article.url,
  };
}

/**
 * 서비스 정보 (Service Schema)
 *
 * @purpose 검색 결과에 제공 서비스 표시
 */
export function getServiceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '정책자금 컨설팅',
    description: '인증 기업심사관과 함께하는 정부 정책자금 신청 컨설팅 서비스',
    provider: {
      '@type': 'Organization',
      name: '나라똔',
    },
    areaServed: {
      '@type': 'Country',
      name: '대한민국',
    },
    serviceType: '비즈니스 컨설팅',
    category: ['정책자금', '정부지원금', 'R&D지원', '수출지원'],
  };
}

/**
 * 네비게이션 경로 (BreadcrumbList Schema)
 *
 * @purpose 검색 결과에 페이지 경로 표시
 */
export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * FAQ Schema (자주 묻는 질문)
 *
 * @purpose 검색 결과에 FAQ 직접 표시
 */
export function getFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
