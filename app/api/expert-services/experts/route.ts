import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Expert from '@/models/Expert';

export async function GET() {
  try {
    await dbConnect();

    const experts = await Expert.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('-__v');

    // Transform data to match ExaminerProfile format
    const transformedExperts = experts.map((expert) => ({
      _id: expert._id.toString(),
      name: expert.name,
      position: expert.position,
      companyName: expert.companyName,
      category: 'expert',
      specialties: expert.specialties,
      imageUrl: `/images/examiners/${expert.imageKey}.png`,
      imageAlt: `${expert.name} 전문가 사진`,
      sortOrder: expert.order,
      legacyKey: expert.imageKey,
      isPublished: expert.isActive,
    }));

    return NextResponse.json({
      success: true,
      experts: transformedExperts
    });
  } catch (error) {
    console.error('Error fetching experts:', error);

    // Return fallback data if database error
    const fallbackExperts = [
      {
        _id: 'expert-baek-kyung-woo',
        name: '백경우',
        position: '변리사',
        companyName: '백경특허법률사무소',
        category: 'intellectual_property',
        specialties: ['특허', '상표', '디자인'],
        imageUrl: '/images/examiners/baek-kyung-woo.png',
        imageAlt: '백경우 전문가 사진',
        sortOrder: 1,
        legacyKey: 'baek-kyung-woo',
        isPublished: true,
      },
      {
        _id: 'expert-sung-min-seok',
        name: '성민석',
        position: '세무사',
        companyName: '세무법인 우진',
        category: 'tax',
        specialties: ['세무조사', '절세전략', '기업자문'],
        imageUrl: '/images/examiners/sung-min-seok.png',
        imageAlt: '성민석 전문가 사진',
        sortOrder: 2,
        legacyKey: 'sung-min-seok',
        isPublished: true,
      },
      {
        _id: 'expert-jeon-ki-hong',
        name: '전기홍',
        position: '행정사',
        companyName: '창성',
        category: 'administration',
        specialties: ['인허가', '행정심판', '행정소송'],
        imageUrl: '/images/examiners/jeon-ki-hong.png',
        imageAlt: '전기홍 전문가 사진',
        sortOrder: 3,
        legacyKey: 'jeon-ki-hong',
        isPublished: true,
      },
      {
        _id: 'expert-choi-il-hyun',
        name: '최일현',
        position: '회계사',
        companyName: '우일회계법인',
        category: 'accounting',
        specialties: ['재무제표', '회계감사', '세무조정'],
        imageUrl: '/images/examiners/choi-il-hyun.png',
        imageAlt: '최일현 전문가 사진',
        sortOrder: 4,
        legacyKey: 'choi-il-hyun',
        isPublished: true,
      },
    ];

    return NextResponse.json({
      success: true,
      experts: fallbackExperts
    });
  }
}