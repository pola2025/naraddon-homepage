import CertifiedExaminersPage from '@/components/certified-examiners/CertifiedExaminersPage';
import styles from './page.module.css';
import clientPromise from '@/lib/mongodb-client';

// ISR: 5분마다 재생성
export const revalidate = 300;

/**
 * Server Component - 데이터를 서버에서 미리 가져옴
 *
 * @performance ISR로 정적 생성, 5분마다 재생성
 * @benefit 클라이언트 API 호출 제거, 초기 로딩 3-5배 빠름
 */
export default async function Page() {
  // 서버에서 데이터 가져오기
  let examiners = [];

  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    const result = await db.collection('expert-examiners')
      .find({ isPublished: true })
      .project({
        _id: 1,
        name: 1,
        companyName: 1,
        imageUrl: 1,
        position: 1,
        category: 1,
        specialties: 1,
        likes: 1
      })
      .toArray();

    // MongoDB ObjectId를 문자열로 변환
    examiners = result.map(examiner => ({
      _id: examiner._id.toString(),
      name: examiner.name,
      companyName: examiner.companyName,
      imageUrl: examiner.imageUrl || '',
      position: examiner.position || '인증 기업심사관',
      category: examiner.category || 'funding',
      specialties: examiner.specialties || [],
      likes: examiner.likes || 0
    }));
  } catch (error) {
    console.error('[Certified Examiners Page] Error:', error);
    // 에러 시 빈 배열 반환 (페이지는 정상 작동)
  }

  return (
    <div className={styles.pageWrapper} style={{ backgroundColor: '#0A0A0A', minHeight: '100vh' }}>
      <CertifiedExaminersPage initialExaminers={examiners} />
    </div>
  );
}