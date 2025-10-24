import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { requirePolicyWriter, handleAuthError } from '@/lib/auth/guards';
import connectDB from '@/lib/mongodb';
import PolicyAnalysisPost from '@/models/PolicyAnalysisPost';
import ExpertExaminer from '@/models/ExpertExaminer';
import * as crypto from 'crypto';

const ALLOWED_SORT_FIELDS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  views: { views: -1, createdAt: -1 },
};

const ACCESS_COOKIE = 'policy-analysis-access';

const buildCookieValue = (password: string) =>
  crypto.createHash('sha256').update(password).digest('hex');

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const examinerKey = searchParams.get('examinerKey');
    const examinerName = searchParams.get('examinerName');
    const rawLimit = searchParams.get('limit');
    const rawSearch = searchParams.get('search');
    const sortKey = searchParams.get('sort') || 'newest';

    const query: Record<string, unknown> = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    // examinerKey 또는 examinerName으로 필터링
    if (examinerKey || examinerName) {
      const examinerQuery = [];
      if (examinerKey) {
        examinerQuery.push({ 'examiner.key': examinerKey });
      }
      if (examinerName) {
        examinerQuery.push({ 'examiner.name': examinerName });
      }
      if (examinerQuery.length === 1) {
        Object.assign(query, examinerQuery[0]);
      } else {
        query.$or = examinerQuery;
      }
    }

    if (rawSearch) {
      const searchRegex = new RegExp(rawSearch.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { excerpt: searchRegex },
        { content: searchRegex },
        { 'examiner.name': searchRegex },
        { tags: searchRegex },
      ];
    }

    const limit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;
    const sort = ALLOWED_SORT_FIELDS[sortKey] || ALLOWED_SORT_FIELDS.newest;

    let postsQuery = PolicyAnalysisPost.find(query).sort(sort);
    if (limit && !Number.isNaN(limit)) {
      postsQuery = postsQuery.limit(limit);
    }

    const posts = await postsQuery.lean();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('[policy-analysis][GET]', error);
    return NextResponse.json(
      { message: '정책분석 게시글을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

interface CreatePayload {
  password?: string;
  title?: string;
  category?: string;
  excerpt?: string;
  content?: string;
  isStructured?: boolean;
  sections?: Array<{ id: string; title: string; content: string }>;
  tags?: string[];
  thumbnail?: string;
  images?: Array<{ url: string; name?: string; caption?: string }>;
  attachments?: Array<{
    key: string;
    fileName: string;
    mimeType?: string;
    size: number;
    sourceUrl?: string;
    cdnUrl?: string;
    checksum?: string;
    uploadedBy?: string;
    uploadedAt?: string;
  }>;
  examinerKey?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[policy-analysis][POST] Request received');
    console.log('[policy-analysis][POST] Headers:', request.headers.get('content-type'));
    console.log('[policy-analysis][POST] Method:', request.method);

    /**
     * 정책분석 작성 권한 검증
     *
     * @purpose admin, super_admin, examiner만 정책분석 게시글 작성 가능
     * @context guards.ts의 requirePolicyWriter 사용 (통합된 권한 체계)
     */
    const user = await requirePolicyWriter();

    console.log('[policy-analysis][POST] User authenticated:', user.email, 'Role:', user.role);

    const body = (await request.json()) as CreatePayload;
    console.log('[policy-analysis][POST] Body parsed:', {
      title: body.title,
      category: body.category,
      examinerKey: body.examinerKey
    });
    const {
      title,
      category,
      excerpt,
      content,
      isStructured,
      sections,
      tags,
      thumbnail,
      images,
      examinerKey,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ message: '제목을 입력해주세요.' }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ message: '내용을 입력해주세요.' }, { status: 400 });
    }

    if (!examinerKey) {
      return NextResponse.json({ message: '인증된 기업심사관을 선택해주세요.' }, { status: 400 });
    }

    console.log('[policy-analysis][POST] examinerKey received:', examinerKey);
    console.log('[policy-analysis][POST] examinerKey is ObjectId valid?:', mongoose.Types.ObjectId.isValid(examinerKey));

    await connectDB();

    // MongoDB에서 실제 examiner 조회
    let examiner = null;

    // 먼저 _id로 조회 시도
    if (mongoose.Types.ObjectId.isValid(examinerKey)) {
      try {
        examiner = await ExpertExaminer.findById(examinerKey).lean();
        console.log('[policy-analysis][POST] Found by _id:', examiner ? examiner.name : 'Not found');
      } catch (error) {
        console.log('[policy-analysis][POST] Error finding by _id:', error);
      }
    }

    // _id가 유효하지 않거나 못찾으면 legacyKey로 조회 시도
    if (!examiner) {
      try {
        examiner = await ExpertExaminer.findOne({ legacyKey: examinerKey }).lean();
        console.log('[policy-analysis][POST] Found by legacyKey:', examiner ? examiner.name : 'Not found');
      } catch (error) {
        console.log('[policy-analysis][POST] Error finding by legacyKey:', error);
      }
    }

    // 전체 examiner 수 확인 (디버깅용)
    const totalExaminers = await ExpertExaminer.countDocuments();
    console.log('[policy-analysis][POST] Total examiners in DB:', totalExaminers);

    if (!examiner) {
      return NextResponse.json(
        { message: '선택한 기업심사관 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const normalizedTags = Array.isArray(tags)
      ? tags
          .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
          .map((tag) => tag.trim())
      : [];

    const normalizedSections = Array.isArray(sections)
      ? sections
          .filter((section) => section && section.id && section.title && section.content)
          .map((section) => ({
            id: section.id,
            title: section.title,
            content: section.content,
          }))
      : [];

    const normalizedImages = Array.isArray(images)
      ? images
          .filter((image) => image && image.url)
          .map((image) => ({
            url: image.url,
            name: image.name?.trim() || '',
            caption: image.caption?.trim() || '',
          }))
      : [];

    const post = await PolicyAnalysisPost.create({
      title: title.trim(),
      category: category?.trim() || '기타',
      excerpt: excerpt?.trim() || '',
      content,
      isStructured: isStructured !== false,
      sections: normalizedSections,
      tags: normalizedTags,
      thumbnail: thumbnail?.trim() || '',
      images: normalizedImages,
      examiner: {
        key: examiner.legacyKey || examiner._id.toString(),
        name: examiner.name,
        companyName: examiner.companyName || '',
      },
    });

    console.log('[policy-analysis][POST] Post created successfully:', post._id);

    // 게시글 작성 활동 기록
    if (examiner && examiner._id) {
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/examiners/${examiner._id.toString()}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityType: 'postCreated', increment: 1 })
        });

        if (response.ok) {
          console.log('[policy-analysis][POST] Post creation activity recorded for examiner:', examiner.name);
        } else {
          console.error('[policy-analysis][POST] Failed to record activity:', await response.text());
        }
      } catch (activityError) {
        console.error('[policy-analysis][POST] Error recording activity:', activityError);
        // 활동 기록 실패해도 게시글 작성은 성공으로 처리
      }
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[policy-analysis][POST] Error details:', error);

    // 인증/권한 에러 처리
    const authError = handleAuthError(error);
    if (authError) return authError;

    const errorMessage = error instanceof Error ? error.message : '정책분석 게시글을 저장하는 중 오류가 발생했습니다.';
    return NextResponse.json(
      { message: errorMessage, error: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}



