import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 가장 최근 사용자 1명 가져오기
    const user = await db.collection('users')
      .findOne({}, { sort: { _id: -1 } });

    if (user) {
      // createdAt이 없으면 _id에서 타임스탬프 추출 (MongoDB ObjectId)
      let createdDate;
      if (user.createdAt) {
        createdDate = new Date(user.createdAt);
      } else if (user._id) {
        // ObjectId의 처음 4바이트는 타임스탬프
        createdDate = new Date(parseInt(user._id.toString().substring(0, 8), 16) * 1000);
      } else {
        createdDate = new Date();
      }

      return NextResponse.json({
        email: user.email,
        name: user.name,
        hasCreatedAt: !!user.createdAt,
        createdAt: createdDate.toISOString(),
        formattedDate: createdDate.toLocaleDateString('ko-KR'),
        timeSinceCreation: `${Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))} 일 전`
      });
    }

    return NextResponse.json({ message: '사용자 없음' });
  } catch (error) {
    return NextResponse.json({ error: '데이터베이스 오류' }, { status: 500 });
  }
}