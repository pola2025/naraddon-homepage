import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Short from '@/models/Short';

// PUT: 쇼츠 수정
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const updates = await req.json();
    const short = await Short.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!short) {
      return NextResponse.json({ error: '쇼츠를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      message: '쇼츠가 수정되었습니다.',
      short,
    });
  } catch (error) {
    console.error('Shorts PUT error:', error);
    return NextResponse.json({ error: '쇼츠 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// DELETE: 쇼츠 삭제
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const short = await Short.findByIdAndDelete(params.id);

    if (!short) {
      return NextResponse.json({ error: '쇼츠를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({
      message: '쇼츠가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Shorts DELETE error:', error);
    return NextResponse.json({ error: '쇼츠 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
