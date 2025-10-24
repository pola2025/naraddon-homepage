import { NextRequest, NextResponse } from 'next/server';
import { requireLogin , handleAuthError } from '@/lib/auth/guards';
import connectDB from '@/lib/mongodb';
import DDonTalk from '@/models/DDonTalk';

// POST: 댓글 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 로그인 필수
    const user = await requireLogin();

    await connectDB();

    const body = await request.json();
    const { author, content } = body;

    if (!author || !content) {
      return NextResponse.json(
        { success: false, error: '작성자와 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    const post = await DDonTalk.findById(params.id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    post.comments.push({
      author,
      content,
      createdAt: new Date()
    });

    await post.save();

    /**
     * 댓글 작성 활동 기록
     *
     * @purpose examiner 역할 사용자의 댓글 작성 활동 추적
     * @context 댓글 작성 성공 후 활동 점수 기록
     */
    try {
      if (user.email) {
        const { db } = await import('@/lib/mongodb');
        const dbInstance = (await db()).db;

        const dbUser = await dbInstance.collection('users').findOne({ email: user.email });

        if (dbUser && dbUser.role === 'examiner') {
          const examiner = await dbInstance.collection('expert-examiners').findOne({
            userId: dbUser._id.toString()
          });

          if (examiner) {
            console.log('[DDonTalk Comment] Recording comment activity for examiner:', examiner.name);

            await fetch(`${process.env.NEXTAUTH_URL}/api/admin/examiners/${examiner._id.toString()}/activities`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activityType: 'commentCreated', increment: 1 })
            });

            console.log('[DDonTalk Comment] Comment activity recorded successfully');
          }
        }
      }
    } catch (activityError) {
      console.error('[DDonTalk Comment] Failed to record comment activity:', activityError);
      // 활동 기록 실패해도 댓글 작성은 성공으로 처리
    }

    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('댓글 추가 오류:', error);

    // uc778uc99d/uad8cud55c uc5d0ub7ec ucc98ub9ac
    const authError = handleAuthError(error);
    if (authError) return authError;
    return NextResponse.json(
      { success: false, error: '댓글 작성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE: 댓글 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔒 로그인 필수
    const user = await requireLogin();

    await connectDB();

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: '댓글 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const post = await DDonTalk.findById(params.id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    post.comments = post.comments.filter(
      (comment: any) => comment._id.toString() !== commentId
    );

    await post.save();

    return NextResponse.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('댓글 삭제 오류:', error);

    // uc778uc99d/uad8cud55c uc5d0ub7ec ucc98ub9ac
    const authError = handleAuthError(error);
    if (authError) return authError;
    return NextResponse.json(
      { success: false, error: '댓글 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}