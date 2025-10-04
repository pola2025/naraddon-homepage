import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/lib/mongodb-client';

// GET /api/users/[id] - 사용자 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URL 디코딩 적용
    const userId = decodeURIComponent(params.id);

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // users 컬렉션에서 사용자 정보 조회
    const user = await db.collection('users').findOne({
      email: userId // NextAuth는 이메일을 ID로 사용
    });

    if (!user) {
      // 새 사용자인 경우 기본 정보로 생성
      const newUser = {
        email: session.user?.email,
        name: session.user?.name,
        image: session.user?.image,
        provider: (session.user as any)?.provider || 'naver',
        role: (session.user as any)?.role || 'user',
        mobile: (session.user as any)?.mobile || '',  // 네이버 로그인에서 받은 전화번호
        profile: {
          phone: (session.user as any)?.mobile || '',  // profile.phone에도 저장
          company: '',
          position: '',
          businessNumber: '',
          introduction: '',
          address: {
            zipCode: '',
            address1: '',
            address2: ''
          },
          website: ''
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      };

      // 새 사용자 생성
      const result = await db.collection('users').insertOne(newUser);

      // insertOne이 반환한 _id를 포함하여 반환
      return NextResponse.json({
        ...newUser,
        _id: result.insertedId
      });
    }

    // 마지막 로그인 시간만 업데이트 (createdAt은 절대 수정 안 함)
    const currentLoginTime = new Date();
    await db.collection('users').updateOne(
      { email: userId },
      {
        $set: { lastLoginAt: currentLoginTime },
        $setOnInsert: { createdAt: currentLoginTime }  // 새 문서일 때만 createdAt 설정
      },
      { upsert: false }  // 기존 문서만 업데이트
    );

    // mobile 필드가 있고 profile.phone이 없으면 동기화
    if (user.mobile && (!user.profile || !user.profile.phone)) {
      await db.collection('users').updateOne(
        { email: userId },
        {
          $set: {
            'profile.phone': user.mobile
          }
        }
      );
      // 응답에도 반영
      if (!user.profile) user.profile = {};
      user.profile.phone = user.mobile;
    }

    // 날짜 필드를 ISO 문자열로 변환하여 반환
    const userResponse = {
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString(),
      lastLoginAt: currentLoginTime.toISOString()
    };

    return NextResponse.json(userResponse);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - 사용자 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 세션 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // URL 디코딩 적용
    const userId = decodeURIComponent(params.id);
    const data = await request.json();

    // 자기 정보만 수정 가능
    if (session.user?.email !== userId && (session.user as any)?.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');

    // 업데이트할 데이터 준비
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    // 사용자 정보 업데이트
    const result = await db.collection('users').updateOne(
      { email: session.user?.email },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 업데이트된 사용자 정보 반환
    const updatedUser = await db.collection('users').findOne({
      email: session.user?.email
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user data' },
      { status: 500 }
    );
  }
}