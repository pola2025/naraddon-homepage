import InterviewVideoGrid from './InterviewVideoGrid';
import './interview-admin-board.css';

/**
 * Business Voice - 인터뷰 섹션 (서버 컴포넌트)
 *
 * @purpose 나라똔 튜브 영상 목록을 서버에서 미리 fetch하여 SSR 제공
 * @context 초기 로딩 속도 개선 및 SEO 최적화
 * @note 서버에서 데이터 페칭 후 클라이언트 컴포넌트로 전달
 */

interface NaraddonTubeVideo {
  title: string;
  description?: string;
  youtubeId: string;
  url: string;
  customThumbnail?: string;
}

interface NaraddonTubeEntry {
  _id: string;
  videos: NaraddonTubeVideo[];
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
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
 * @purpose MongoDB에서 공개된 영상 목록 조회
 * @context 서버 사이드에서 실행되어 초기 HTML에 데이터 포함
 * @note 5분 캐시 (revalidate: 300)
 */
async function fetchVideos(): Promise<InterviewVideo[]> {
  try {
    // 서버에서 실행: 절대 URL 필요
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/naraddon-tube`, {
      next: { revalidate: 300 }, // 5분 캐시
    });

    if (!response.ok) {
      console.error(`Failed to fetch videos: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.entries || !Array.isArray(data.entries)) {
      return [];
    }

    // NaraddonTubeEntry를 InterviewVideo 형식으로 변환
    const convertedVideos: InterviewVideo[] = data.entries.map((entry: NaraddonTubeEntry) => {
      const video = entry.videos[0];
      return {
        _id: entry._id,
        youtubeUrl: video.url,
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.customThumbnail,
        displayThumbnail: video.customThumbnail || `https://img.youtube.com/vi/${video.youtubeId}/sddefault.jpg`,
      };
    });

    return convertedVideos;
  } catch (error) {
    console.error('Failed to fetch videos:', error);
    return [];
  }
}

/**
 * 인터뷰 섹션 서버 컴포넌트
 *
 * @purpose Business Voice 페이지의 영상 섹션 렌더링
 * @context 서버에서 데이터를 미리 fetch하여 초기 로딩 속도 개선
 */
export default async function InterviewSection() {
  // 서버에서 실행: YouTube 썸네일 CDN preconnect
  // Note: 서버 컴포넌트에서는 document 접근 불가하므로 제거

  const videos = await fetchVideos();

  return (
    <section id="interview-section" className="interview-section-new">
      <div className="section-header">
        <h2>나라똔과 함께한 대표님 인터뷰</h2>
        <p>인증 기업심사관과 함께한 대표님들의 생생한 후기입니다.</p>
      </div>

      <div className="interview-videos-container">
        <InterviewVideoGrid videos={videos} />
      </div>
    </section>
  );
}
