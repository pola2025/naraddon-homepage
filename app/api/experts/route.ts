import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Expert from '@/models/Expert';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // 관리자 권한이 있으면 모든 전문가, 없으면 활성화된 전문가만
    const adminAuth = request.headers.get('x-admin-auth');
    const query = adminAuth === 'true' ? {} : { isActive: true };

    const experts = await Expert.find(query)
      .sort({ order: 1, createdAt: -1 })
      .select('-__v');

    // Transform to include imageUrl
    const transformedExperts = experts.map((expert) => {
      const expertObj = expert.toObject();
      return {
        ...expertObj,
        imageUrl: expertObj.imageUrl || `/images/examiners/${expertObj.imageKey}.png`,
        imageAlt: `${expertObj.name} 전문가 사진`,
      };
    });

    return NextResponse.json({ success: true, experts: transformedExperts });
  } catch (error) {
    console.error('Error fetching experts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch experts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, ...expertData } = body;

    // Check admin auth header or password
    const adminAuth = request.headers.get('x-admin-auth');
    if (adminAuth !== 'true' && password !== process.env.EXPERT_SERVICES_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get the highest order number
    const lastExpert = await Expert.findOne({}).sort({ order: -1 });
    const newOrder = lastExpert ? lastExpert.order + 1 : 0;

    const expert = await Expert.create({
      ...expertData,
      order: newOrder,
      isActive: true,
    });

    return NextResponse.json({ success: true, expert });
  } catch (error) {
    console.error('Error creating expert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expert' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, id, ...updateData } = body;

    // Check admin auth header or password
    const adminAuth = request.headers.get('x-admin-auth');
    if (adminAuth !== 'true' && password !== process.env.EXPERT_SERVICES_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expert ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const expert = await Expert.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!expert) {
      return NextResponse.json(
        { success: false, error: 'Expert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, expert });
  } catch (error) {
    console.error('Error updating expert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expert' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const password = searchParams.get('password');

    // Check admin auth header or password
    const adminAuth = request.headers.get('x-admin-auth');
    if (adminAuth !== 'true' && password !== process.env.EXPERT_SERVICES_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expert ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const expert = await Expert.findByIdAndDelete(id);

    if (!expert) {
      return NextResponse.json(
        { success: false, error: 'Expert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Expert deleted successfully' });
  } catch (error) {
    console.error('Error deleting expert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expert' },
      { status: 500 }
    );
  }
}