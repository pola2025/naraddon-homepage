import { NextRequest, NextResponse } from 'next/server';

import connectDB from '@/lib/mongodb';
import BusinessVoiceInterviewVideo from '@/models/BusinessVoiceInterviewVideo';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.BUSINESS_VOICE_INTERVIEW_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error('BUSINESS_VOICE_INTERVIEW_PASSWORD environment variable is not set.');
}

interface RouteParams {
  params: {
    id: string;
  };
}

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      password,
      youtubeUrl,
      title,
      description,
      author,
      company,
      amount,
      thumbnailUrl,
      clearThumbnail,
    } = body ?? {};

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, message: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (typeof title === 'string') {
      updateData.title = title;
    }
    if (typeof description === 'string') {
      updateData.description = description;
    }
    if (typeof author === 'string') {
      updateData.author = author;
    }
    if (typeof company === 'string') {
      updateData.company = company;
    }
    if (typeof amount === 'string') {
      updateData.amount = amount;
    }

    if (typeof youtubeUrl === 'string' && youtubeUrl.trim().length > 0) {
      const trimmedUrl = youtubeUrl.trim();
      const youtubeId = extractYouTubeId(trimmedUrl);
      if (!youtubeId) {
        return NextResponse.json(
          { success: false, message: '올바른 YouTube URL이 아닙니다.' },
          { status: 400 }
        );
      }
      updateData.youtubeUrl = trimmedUrl;
      updateData.youtubeId = youtubeId;
    }

    if (typeof thumbnailUrl === 'string' && thumbnailUrl.trim().length > 0) {
      updateData.thumbnailUrl = thumbnailUrl.trim();
    } else if (clearThumbnail) {
      updateData.thumbnailUrl = '';
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: '업데이트할 항목이 없습니다.' },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedVideo = await BusinessVoiceInterviewVideo.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedVideo) {
      return NextResponse.json(
        { success: false, message: '해당 인터뷰를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      video: updatedVideo,
    });
  } catch (error) {
    console.error('[interview-videos][PATCH]', error);
    return NextResponse.json(
      { success: false, message: '영상 정보를 수정하지 못했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({ password: undefined }));
    const { password } = body ?? {};

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, message: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    await connectDB();

    const deleted = await BusinessVoiceInterviewVideo.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: '이미 삭제되었거나 존재하지 않는 인터뷰입니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[interview-videos][DELETE]', error);
    return NextResponse.json(
      { success: false, message: '영상 정보를 삭제하지 못했습니다.' },
      { status: 500 }
    );
  }
}