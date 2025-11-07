import { MetadataRoute } from 'next';
import connectDB from '@/lib/mongodb';

/**
 * 동적 Sitemap 생성
 *
 * @purpose SEO 최적화를 위한 전체 사이트맵 자동 생성
 * @context 정적 페이지 + MongoDB의 동적 콘텐츠 URL 포함
 * @note Next.js 14 App Router의 sitemap 기능 활용
 * @fix Mongoose API 사용 (clientPromise → connectDB, client.db() → mongoose.connection.db)
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://naraddon.com';

  // 정적 페이지 URL 목록
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/consultation-request`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/business-voice`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/policy-news`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/policy-analysis`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/certified-examiners`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  try {
    // Mongoose 연결 사용 (MongoDB Native Client 대신)
    const mongoose = await connectDB();
    const db = mongoose.connection.db;

    // 정책소식 게시글 URL 생성
    const policyNews = await db
      .collection('policy_news')
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const policyNewsUrls: MetadataRoute.Sitemap = policyNews.map((post) => ({
      url: `${baseUrl}/policy-news/${post._id}`,
      lastModified: post.updatedAt || post.createdAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // 정책분석 게시글 URL 생성
    const policyAnalysis = await db
      .collection('policy_analysis')
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const policyAnalysisUrls: MetadataRoute.Sitemap = policyAnalysis.map((post) => ({
      url: `${baseUrl}/policy-analysis/${post._id}`,
      lastModified: post.updatedAt || post.createdAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // 똔톡 게시글 URL 생성
    const ttontokPosts = await db
      .collection('business_voice_posts')
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const ttontokUrls: MetadataRoute.Sitemap = ttontokPosts.map((post) => ({
      url: `${baseUrl}/business-voice/ttontok/${post._id}`,
      lastModified: post.updatedAt || post.createdAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // 묻고답하기 게시글 URL 생성
    const ddontalkPosts = await db
      .collection('ddontalk_posts')
      .find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const ddontalkUrls: MetadataRoute.Sitemap = ddontalkPosts.map((post) => ({
      url: `${baseUrl}/ddontalk/${post._id}`,
      lastModified: post.updatedAt || post.createdAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // 인증심사관 상세 페이지 URL 생성
    const examiners = await db
      .collection('expert-examiners')
      .find({ isPublished: true })
      .sort({ createdAt: -1 })
      .toArray();

    const examinerUrls: MetadataRoute.Sitemap = examiners.map((examiner) => ({
      url: `${baseUrl}/certified-examiners/${examiner._id}`,
      lastModified: examiner.updatedAt || examiner.createdAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // 모든 URL 병합
    return [
      ...staticPages,
      ...policyNewsUrls,
      ...policyAnalysisUrls,
      ...ttontokUrls,
      ...ddontalkUrls,
      ...examinerUrls,
    ];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    // 에러 발생 시 정적 페이지만 반환
    return staticPages;
  }
}
