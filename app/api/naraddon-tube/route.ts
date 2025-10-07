import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import NaraddonTubeEntry from '@/models/NaraddonTubeEntry';

// API Route를 동적으로 설정 (환경변수 문제 해결)
export const dynamic = 'force-dynamic';

const DEFAULT_SORT = { sortOrder: 1, createdAt: -1 } as const;

type IncomingVideoPayload = {
  title?: string;
  youtubeUrl?: string;
  url?: string;
  youtubeId?: string;
  customThumbnail?: string;
};

type NaraddonTubePayload = {
  password?: string;
  title?: string;
  description?: string;
  youtubeUrl?: string;
  customThumbnail?: string;
  isPublished?: boolean;
  sortOrder?: number;
};

const extractYoutubeId = (value: string) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (url.hostname === 'youtu.be') {
      const candidate = url.pathname.replace('/', '').trim();
      return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
    }

    if (url.hostname.includes('youtube.com')) {
      if (url.searchParams.has('v')) {
        const candidate = url.searchParams.get('v')?.trim();
        return candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
      }

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments[0] === 'embed' && segments[1]) {
        const candidate = segments[1].trim();
        return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
      }
    }
  } catch (error) {
    // invalid URL -> fallthrough
  }

  return null;
};

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const includeDraft = searchParams.get('includeDraft') === 'true';

    const query = includeDraft ? {} : { isPublished: true };
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    const entriesQuery = NaraddonTubeEntry.find(query).sort(DEFAULT_SORT).lean();
    if (limit && !Number.isNaN(limit)) {
      entriesQuery.limit(limit);
    }

    const entries = await entriesQuery;

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('[naraddon-tube][GET]', error);
    return NextResponse.json({ message: '영상 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NaraddonTubePayload;
    const { password, title, description, youtubeUrl, customThumbnail, isPublished, sortOrder } = body;

    // 비밀번호 확인 (있으면 환경변수와 비교, 없으면 통과)
    const adminPassword = process.env.NARADDON_TUBE_PASSWORD;
    if (password && adminPassword && password !== adminPassword) {
      return NextResponse.json({ message: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ message: '영상 제목을 입력해주세요.' }, { status: 400 });
    }

    if (!youtubeUrl || !youtubeUrl.trim()) {
      return NextResponse.json({ message: 'YouTube URL을 입력해주세요.' }, { status: 400 });
    }

    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) {
      return NextResponse.json({ message: '올바른 YouTube URL이 아닙니다.' }, { status: 400 });
    }

    await connectDB();

    const entry = await NaraddonTubeEntry.create({
      videos: [
        {
          title: title.trim(),
          description: description?.trim() || undefined,
          youtubeId,
          url: `https://www.youtube.com/watch?v=${youtubeId}`,
          customThumbnail: customThumbnail?.trim() || undefined,
        },
      ],
      isPublished: typeof isPublished === 'boolean' ? isPublished : true,
      sortOrder: typeof sortOrder === 'number' && Number.isFinite(sortOrder) ? sortOrder : 0,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('videos 배열은 정확히 1개')) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error('[naraddon-tube][POST]', error);
    return NextResponse.json({ message: '영상 정보를 저장하지 못했습니다.' }, { status: 500 });
  }
}
