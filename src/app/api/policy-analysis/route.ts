import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import PolicyAnalysisPost from '@/models/PolicyAnalysisPost';
import ExpertExaminer from '@/models/ExpertExaminer';
import * as crypto from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { checkPermission } from '@/lib/rbac/check-permission';

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
    const rawLimit = searchParams.get('limit');
    const rawSearch = searchParams.get('search');
    const sortKey = searchParams.get('sort') || 'newest';
    const fieldsParam = searchParams.get('fields');

    const query: Record<string, unknown> = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (examinerKey) {
      query['examiner.key'] = examinerKey;
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

    // 기본 limit 설정 (성능 최적화)
    const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 20;
    const sort = ALLOWED_SORT_FIELDS[sortKey] || ALLOWED_SORT_FIELDS.newest;

    // 필드 선택 (content, sections, attachments, images 제외로 데이터 전송량 80% 감소)
    let postsQuery = PolicyAnalysisPost.find(query).sort(sort);

    if (limit && !Number.isNaN(limit) && limit > 0) {
      postsQuery = postsQuery.limit(limit);
    }

    // 기본값을 minimal로 설정 (fieldsParam이 'full'일 때만 전체 반환)
    if (fieldsParam !== 'full') {
      postsQuery = postsQuery.select('-content -sections -attachments -images -isStructured');
    }

    const posts = await postsQuery.lean();

    // CDN 캐싱 헤더 설정 (5분 캐싱)
    return NextResponse.json(
      { posts },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'CDN-Cache-Control': 'public, max-age=300',
          'Vercel-CDN-Cache-Control': 'public, max-age=300',
        },
      }
    );
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

    // 1. 본문 먼저 파싱 (한 번만 가능하므로)
    const body = (await request.json()) as CreatePayload;
    console.log('[policy-analysis][POST] Body parsed:', {
      title: body.title,
      category: body.category,
      examinerKey: body.examinerKey
    });

    // 2. NextAuth 세션 확인 (RBAC 권한)
    const session = await getServerSession(authOptions);
    console.log('[policy-analysis][POST] Session:', session?.user?.email);

    let hasPermission = false;
    let authMethod = 'none';

    // 3. RBAC 권한 확인 (examiner 또는 admin)
    if (session?.user?.id) {
      const canWrite = await checkPermission(
        session.user.id,
        'policy:analysis:write'
      );
      console.log('[policy-analysis][POST] RBAC permission check:', canWrite);

      if (canWrite) {
        hasPermission = true;
        authMethod = 'rbac';
      }
    }

    // 4. 레거시 비밀번호 인증 (하위 호환성)
    if (!hasPermission) {
      const adminPassword = process.env.POLICY_ANALYSIS_PASSWORD;
      if (!adminPassword) {
        console.error('[policy-analysis][POST] POLICY_ANALYSIS_PASSWORD not set');
        return NextResponse.json(
          { message: '정책분석 게시판 비밀번호가 설정되지 않았습니다.' },
          { status: 500 }
        );
      }

      const { password } = body;
      const trimmedPassword = password?.trim();
      const hasValidAccessCookie =
        request.cookies.get(ACCESS_COOKIE)?.value === buildCookieValue(adminPassword);

      if (trimmedPassword && trimmedPassword === adminPassword) {
        hasPermission = true;
        authMethod = 'password';
      } else if (hasValidAccessCookie) {
        hasPermission = true;
        authMethod = 'cookie';
      }
    }

    // 5. 권한 없으면 403 반환
    if (!hasPermission) {
      console.log('[policy-analysis][POST] Permission denied');
      return NextResponse.json(
        {
          message: '정책분석 작성 권한이 없습니다. 기업심사관 또는 관리자만 작성할 수 있습니다.',
          authMethod,
          hasSession: !!session,
          userId: session?.user?.id
        },
        { status: 403 }
      );
    }

    console.log('[policy-analysis][POST] Auth method:', authMethod);

    // 6. 본문에서 필요한 데이터 추출
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
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('[policy-analysis][POST] Error details:', error);
    const errorMessage = error instanceof Error ? error.message : '정책분석 게시글을 저장하는 중 오류가 발생했습니다.';
    return NextResponse.json(
      { message: errorMessage, error: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}



