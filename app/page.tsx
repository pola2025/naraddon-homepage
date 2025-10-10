import Home from '@/components/home/Home';
import connectDB from '@/lib/mongodb';
import PolicyNewsPost from '@/models/PolicyNewsPost';
import NaraddonTubeEntry from '@/models/NaraddonTubeEntry';

// ISR: 5분마다 재생성
export const revalidate = 300;

/**
 * Server Component - 메인 페이지 데이터 미리 가져오기
 *
 * @purpose 정책소식, 나라똔튜브 데이터를 서버에서 미리 조회
 * @performance ISR로 정적 생성, 5분마다 재생성
 * @benefit 클라이언트 API 호출 2개 제거, 초기 로딩 2-3배 빠름
 * @note 클라이언트 기능(인트로, 애니메이션)은 Home.js에서 처리
 */
export default async function HomePage() {
  // 서버에서 병렬로 데이터 가져오기
  let policyNews = [];
  let tubeVideos = [];

  try {
    await connectDB();

    // 병렬 조회 (Promise.all)
    const [policyPosts, tubeEntries] = await Promise.all([
      // 정책소식 8개
      PolicyNewsPost.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .lean()
        .exec(),

      // 나라똔튜브 (공개된 것만)
      NaraddonTubeEntry.find({ isPublished: true })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean()
        .exec()
    ]);

    // MongoDB ObjectId를 문자열로 변환 (직렬화 가능하도록)
    policyNews = policyPosts.map(post => ({
      _id: post._id.toString(),
      title: post.title,
      content: post.content,
      category: post.category,
      excerpt: post.excerpt || '',
      thumbnail: post.thumbnail || '',
      tags: post.tags || [],
      isMain: post.isMain || false,
      isPinned: post.isPinned || false,
      badge: post.badge || '',
      views: post.views || 0,
      likes: post.likes || 0,
      comments: post.comments || 0,
      createdAt: post.createdAt ? post.createdAt.toISOString() : new Date().toISOString()
    }));

    tubeVideos = tubeEntries.map(entry => ({
      _id: entry._id.toString(),
      videos: entry.videos || [],
      isPublished: entry.isPublished || false,
      sortOrder: entry.sortOrder || 0
    }));

  } catch (error) {
    console.error('[Homepage] Error fetching data:', error);
    // 에러 시 빈 배열 반환 (페이지는 정상 작동)
  }

  return <Home initialPolicyNews={policyNews} initialTubeVideos={tubeVideos} />;
}
