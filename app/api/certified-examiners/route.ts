import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

// 캐시 설정: 5분간 유효
export const revalidate = 300;

/**
 * GET /api/certified-examiners - 공개된 심사관 목록 조회
 *
 * @purpose 프론트엔드에서 표시할 공개 심사관 목록 제공
 * @context isPublished=true인 심사관만 반환
 * @security 인증 불필요 (공개 API)
 * @returns 심사관 이름, 회사명, 이미지 URL
 * @performance 인덱스 사용, 5분 캐싱
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 성능 모니터링: DB 연결 시간
    const dbConnectTime = Date.now() - startTime;
    console.log(`[Certified Examiners API] DB connect: ${dbConnectTime}ms`);

    // isPublished=true인 심사관만 조회 (인덱스 사용)
    const queryStartTime = Date.now();
    const examiners = await db.collection('expert-examiners')
      .find({ isPublished: true })
      .project({
        name: 1,
        companyName: 1,
        imageUrl: 1,
        position: 1,
        category: 1,
        specialties: 1,
        sortOrder: 1,
        isPublished: 1
      })
      .toArray();

    const queryTime = Date.now() - queryStartTime;
    console.log(`[Certified Examiners API] Query: ${queryTime}ms`);

    /**
     * 활동 점수 조회 및 결합
     *
     * @purpose 각 심사관의 활동 점수를 조회하여 프로필 카드에 표시
     * @context examiner-activities 컬렉션에서 점수 조회
     */
    const activitiesStartTime = Date.now();
    const examinerIds = examiners.map(e => e._id.toString());

    // 모든 심사관의 활동 점수를 한 번에 조회 (성능 최적화)
    const activitiesData = await db.collection('examiner-activities')
      .find({ examinerId: { $in: examinerIds } })
      .project({
        examinerId: 1,
        activities: 1,
        totalScore: 1
      })
      .toArray();

    // examiner ID를 키로 하는 활동 점수 맵 생성
    const activitiesMap = new Map(
      activitiesData.map(a => [a.examinerId, a])
    );

    const activitiesTime = Date.now() - activitiesStartTime;
    console.log(`[Certified Examiners API] Activities fetch: ${activitiesTime}ms`);

    /**
     * 활동 점수 계산
     *
     * @formula
     *   - 로그인: 2점
     *   - 페이지 방문: 1점
     *   - 게시글 작성: 10점
     *   - 댓글 작성: 5점
     *   - 프로필 업데이트: 5점
     *   - 상담 배정: 15점
     *   - 상담 완료: 20점
     */
    const scoreConfig = {
      pageVisit: 1,
      postCreated: 10,
      commentCreated: 5,
      login: 2,
      profileUpdate: 5
    };

    // 프론트엔드 형식으로 변환 (활동 점수 포함)
    const formattedExaminers = examiners.map(examiner => {
      const examinerId = examiner._id.toString();
      const activity = activitiesMap.get(examinerId);

      // 활동 점수 계산
      let activityScore = 0;
      if (activity && activity.activities) {
        activityScore =
          (activity.activities.pageVisits || 0) * scoreConfig.pageVisit +
          (activity.activities.postsCreated || 0) * scoreConfig.postCreated +
          (activity.activities.commentsCreated || 0) * scoreConfig.commentCreated +
          (activity.activities.loginCount || 0) * scoreConfig.login +
          ((activity.activities.profileUpdates || 0) * scoreConfig.profileUpdate);
      }

      return {
        _id: examinerId,
        name: examiner.name,
        companyName: examiner.companyName,
        imageUrl: examiner.imageUrl || '',
        position: examiner.position || '인증 기업심사관',
        category: examiner.category || 'funding',
        specialties: examiner.specialties || [],
        isPublished: true,
        sortOrder: examiner.sortOrder || 0,
        activityScore,
        activityStats: activity ? {
          loginCount: activity.activities?.loginCount || 0,
          pageVisits: activity.activities?.pageVisits || 0,
          postsCreated: activity.activities?.postsCreated || 0,
          commentsCreated: activity.activities?.commentsCreated || 0,
          lastActiveAt: activity.activities?.lastActiveAt || null
        } : null
      };
    });

    const totalTime = Date.now() - startTime;
    console.log(`[Certified Examiners API] Total: ${totalTime}ms, Count: ${formattedExaminers.length}`);

    return NextResponse.json(
      {
        success: true,
        examiners: formattedExaminers,
        total: formattedExaminers.length
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[Certified Examiners API] Error:', error);
    const totalTime = Date.now() - startTime;
    console.error(`[Certified Examiners API] Failed after ${totalTime}ms`);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch examiners',
        examiners: []
      },
      { status: 500 }
    );
  }
}
