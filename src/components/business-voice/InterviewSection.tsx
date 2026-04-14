import { cache } from 'react';
import InterviewVideoGrid from './InterviewVideoGrid';
import connectDB from '@/lib/mongodb';
import NaraddonTubeEntry from '@/models/NaraddonTubeEntry';
import './interview-admin-board.css';

/**
 * Business Voice - 인터뷰 섹션 (서버 컴포넌트)
 *
 * @purpose 나라똔 튜브 영상 목록을 서버에서 미리 fetch하여 SSR 제공
 * @context 초기 로딩 속도 개선 및 SEO 최적화
 * @note 서버에서 MongoDB 직접 연결하여 데이터 페칭 (API 경유 불필요)
 */

interface NaraddonTubeVideo {
  title: string;
  description?: string;
  youtubeId: string;
  url: string;
  customThumbnail?: string;
}

interface InterviewVideo {
  _id: string;
  youtubeUrl: string;
  youtubeId?: string;
  displayThumbnail?: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  author?: string;
  company?: string;
  amount?: string;
  views?: number;
}

/**
 * 나라똔 튜브 영상 데이터 fetch (서버에서 실행)
 *
 * @purpose MongoDB에서 공개된 영상 목록 직접 조회
 * @context 서버 사이드에서 실행되어 초기 HTML에 데이터 포함
 * @note React cache()로 요청 중복 제거, 빌드 타임에 자동 캐싱
 */
const fetchVideos = cache(async (): Promise<InterviewVideo[]> => {
  try {
    // MongoDB 직접 연결 (API 경유하지 않음 - 환경변수 문제 해결)
    await connectDB();

    const entries = await NaraddonTubeEntry.find({ isPublished: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    if (!entries || entries.length === 0) {
      return [];
    }

    // NaraddonTubeEntry를 InterviewVideo 형식으로 변환
    const convertedVideos: InterviewVideo[] = entries.map((entry: any) => {
      const video = entry.videos[0];
      return {
        _id: entry._id.toString(),
        youtubeUrl: video.url,
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.customThumbnail,
        displayThumbnail:
          video.customThumbnail || `https://img.youtube.com/vi/${video.youtubeId}/sddefault.jpg`,
      };
    });

    return convertedVideos;
  } catch (error) {
    console.error('Failed to fetch videos from MongoDB:', error);
    return [];
  }
});

/**
 * 인터뷰 섹션 서버 컴포넌트
 *
 * @purpose Business Voice 페이지의 영상 섹션 렌더링
 * @context 서버에서 MongoDB 직접 조회하여 초기 로딩 속도 개선
 */
export default async function InterviewSection() {
  const videos = await fetchVideos();

  return (
    <section id="interview-section" className="interview-section-new">
      <div className="section-header">
        <h2>
          <i className="fas fa-video"></i> 대표님 인터뷰
        </h2>
        <p>나라똔과 함께한 대표님들의 생생한 후기입니다.</p>
      </div>

      <div className="interview-videos-container">
        <InterviewVideoGrid videos={videos} initialLimit={3} />
      </div>
    </section>
  );
}
