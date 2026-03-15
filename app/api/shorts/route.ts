import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Short from '@/models/Short';

// GET: 활성 쇼츠 목록 (프론트용) 또는 전체 목록 (관리자용)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const all = searchParams.get('all'); // 관리자용 전체 조회

    const query: any = all ? {} : { isActive: true };
    const shorts = await Short.find(query).sort({ sortOrder: 1, createdAt: -1 }).lean();

    return NextResponse.json({ shorts });
  } catch (error) {
    console.error('Shorts GET error:', error);
    return NextResponse.json({ error: '쇼츠 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST: 새 쇼츠 등록
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { title, youtubeUrl, thumbnailUrl, sortOrder } = await req.json();

    if (!youtubeUrl || !thumbnailUrl) {
      return NextResponse.json({ error: '유튜브 URL과 썸네일은 필수입니다.' }, { status: 400 });
    }

    // 제목이 없으면 URL에서 자동 생성
    const autoTitle = title || `쇼츠 ${new Date().toLocaleDateString('ko-KR')}`;

    const short = await Short.create({
      title: autoTitle,
      youtubeUrl,
      thumbnailUrl,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json(
      {
        message: '쇼츠가 등록되었습니다.',
        short,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Shorts POST error:', error);
    return NextResponse.json({ error: '쇼츠 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
