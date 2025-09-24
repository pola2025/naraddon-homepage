import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import PolicyAnalysisPost from '@/models/PolicyAnalysisPost';
import ExaminerProfile from '@/models/ExaminerProfile';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const increaseView = searchParams.get('countView') === 'true';

    const post = await PolicyAnalysisPost.findByIdAndUpdate(
      params.id,
      increaseView ? { $inc: { views: 1 } } : {},
      { new: true }
    ).lean();

    if (!post) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('[policy-analysis][GET:id]', error);
    return NextResponse.json(
      { message: '정책분석 게시글을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const adminPassword = process.env.POLICY_ANALYSIS_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { message: '정책분석 게시판 비밀번호가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    const body = await request.json();
    const {
      password,
      title,
      content,
      category,
      excerpt,
      thumbnail,
      tags,
      examinerKey,
      isStructured,
      sections,
      images
    } = body;

    // 비밀번호 검증
    const trimmedPassword = password?.trim();
    if (!trimmedPassword || trimmedPassword !== adminPassword) {
      return NextResponse.json({ message: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json({ message: '제목과 내용을 입력해주세요.' }, { status: 400 });
    }

    await connectDB();

    // examinerKey가 제공된 경우 유효성 검증
    let examinerData = null;
    if (examinerKey) {
      let examiner = null;

      // 먼저 legacyKey로 조회 시도
      examiner = await ExaminerProfile.findOne({ legacyKey: examinerKey }).lean();

      // legacyKey로 못찾으면 imageKey로 조회 시도
      if (!examiner) {
        examiner = await ExaminerProfile.findOne({ imageKey: examinerKey }).lean();
      }

      // imageKey로도 못찾으면 _id로 조회 시도
      if (!examiner && mongoose.Types.ObjectId.isValid(examinerKey)) {
        examiner = await ExaminerProfile.findById(examinerKey).lean();
      }

      if (!examiner) {
        return NextResponse.json(
          { message: '선택한 기업심사관 정보를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      examinerData = {
        key: examiner.legacyKey || examiner.imageKey || examiner._id.toString(),
        name: examiner.name,
        companyName: examiner.companyName || '',
      };
    }

    const normalizedTags = Array.isArray(tags)
      ? tags
          .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
          .map((tag: string) => tag.trim())
      : [];

    const normalizedSections = Array.isArray(sections)
      ? sections
          .filter((section: any) => section && section.id && section.title && section.content)
          .map((section: any) => ({
            id: section.id,
            title: section.title,
            content: section.content,
          }))
      : [];

    const normalizedImages = Array.isArray(images)
      ? images
          .filter((image: any) => image && image.url)
          .map((image: any) => ({
            url: image.url,
            name: image.name?.trim() || '',
            caption: image.caption?.trim() || '',
          }))
      : [];

    const updateData: any = {
      title: title.trim(),
      content,
      category: category?.trim() || '기타',
      excerpt: excerpt?.trim() || '',
      thumbnail: thumbnail?.trim() || '',
      tags: normalizedTags,
      isStructured: isStructured !== false,
      sections: normalizedSections,
      images: normalizedImages,
    };

    // examiner 정보가 있는 경우에만 업데이트
    if (examinerData) {
      updateData.examiner = examinerData;
    }

    const updated = await PolicyAnalysisPost.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error('[policy-analysis][PUT:id]', error);
    return NextResponse.json(
      { message: '정책분석 게시글을 수정하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const adminPassword = process.env.POLICY_ANALYSIS_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { message: '정책분석 게시판 비밀번호가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { password } = body as { password?: string };

    // 비밀번호 검증 (trim 처리 추가)
    const trimmedPassword = password?.trim();
    if (!trimmedPassword || trimmedPassword !== adminPassword) {
      return NextResponse.json({ message: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    await connectDB();

    const deleted = await PolicyAnalysisPost.findByIdAndDelete(params.id).lean();
    if (!deleted) {
      return NextResponse.json({ message: '존재하지 않는 게시글입니다.' }, { status: 404 });
    }

    return NextResponse.json({ message: '삭제되었습니다.' });
  } catch (error) {
    console.error('[policy-analysis][DELETE:id]', error);
    return NextResponse.json(
      { message: '정책분석 게시글을 삭제하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
