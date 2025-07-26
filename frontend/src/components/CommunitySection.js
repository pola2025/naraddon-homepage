import React, { useState, useRef, useEffect } from 'react';
import './CommunitySection.css';

function CommunitySection() {
  // 정책분석 게시판 데이터 (조회수순 정렬)
  const policyPosts = [
    {
      id: 1,
      image: `${process.env.PUBLIC_URL}/images/board/2024-sme-rd-support.jpg`,
      title: '2024년 중소기업 R&D 지원사업 완전정복',
      excerpt: '정부에서 발표한 중소기업 R&D 지원사업의 핵심 포인트와 신청 전략을 상세히 분석했습니다. 최대 5억원까지 지원받을 수 있는 기회를 놓치지 마세요.',
      date: '2024.07.25',
      category: 'R&D지원',
      views: 1234,
      isBest: true,
      bestRank: 2
    },
    {
      id: 6,
      image: `${process.env.PUBLIC_URL}/images/board/small-business-rent-support.jpg`,
      title: '소상공인 임대료 지원사업 안내',
      excerpt: '코로나19 장기화로 어려움을 겪는 소상공인을 위한 임대료 지원사업의 신청 조건과 방법을 상세히 안내합니다.',
      date: '2024.07.20',
      category: '소상공인',
      views: 1456,
      isBest: true,
      bestRank: 1
    },
    {
      id: 2,
      image: `${process.env.PUBLIC_URL}/images/board/startup-tax-guide.jpg`,
      title: '스타트업 세무처리 가이드북',
      excerpt: '창업 초기부터 알아야 할 세무 상식과 절세 방법을 정리했습니다. 복잡한 세무 업무를 쉽게 이해할 수 있도록 단계별로 설명드립니다.',
      date: '2024.07.24',
      category: '세무/회계',
      views: 987,
      isBest: true,
      bestRank: 3
    },
    {
      id: 5,
      image: `${process.env.PUBLIC_URL}/images/board/government-startup-funding-2024.jpg`,
      title: '정부 창업지원금 신청 가이드 2024',
      excerpt: '창업을 준비하는 예비 사장님들을 위한 정부 창업지원금 신청 방법과 필수 조건들을 알기 쉽게 정리했습니다.',
      date: '2024.07.21',
      category: '창업지원',
      views: 892
    },
    {
      id: 3,
      image: `${process.env.PUBLIC_URL}/images/board/export-voucher-2024.jpg`,
      title: '수출바우처 2024년 하반기 신청 가이드',
      excerpt: '수출 기업을 위한 정부 지원사업 수출바우처의 2024년 하반기 신청 방법과 주요 변경사항을 알아보세요.',
      date: '2024.07.23',
      category: '수출지원',
      views: 756
    },
    {
      id: 4,
      image: `${process.env.PUBLIC_URL}/images/board/startup-tax-guide-2.jpg`,
      title: '벤처기업 인증 받는 방법',
      excerpt: '벤처기업 인증을 통해 받을 수 있는 혜택과 인증 절차, 필요 서류를 상세히 안내합니다.',
      date: '2024.07.22',
      category: '인증/평가',
      views: 643
    }
  ];

  // 사업자 목소리 데이터
  const businessVoices = [
    {
      id: 1,
      title: '나라똔 덕분에 R&D 과제 선정됐어요! 정말 감사합니다',
      author: '김○○ 대표',
      company: '테크스타트',
      date: '2024.07.25',
      likes: 24
    },
    {
      id: 2,
      title: '세무 상담 받고 절세 효과 월 200만원! 완전 대만족',
      author: '이○○ 사장',
      company: '제조업체',
      date: '2024.07.24',
      likes: 18
    },
    {
      id: 3,
      title: '수출바우처 신청했는데 3주만에 승인났네요',
      author: '박○○ 대표',
      company: '무역회사',
      date: '2024.07.23',
      likes: 15
    },
    {
      id: 4,
      title: '벤처기업 인증 받고 세제혜택까지, 일석이조!',
      author: '최○○ 사장',
      company: '소프트웨어',
      date: '2024.07.22',
      likes: 12
    },
    {
      id: 5,
      title: '나라똔 전문가 상담 정말 꼼꼼하고 친절해요',
      author: '정○○ 대표',
      company: '바이오업체',
      date: '2024.07.21',
      likes: 9
    },
    {
      id: 6,
      title: '정부지원금 신청 과정이 이렇게 쉬울 줄 몰랐어요',
      author: '윤○○ 사장',
      company: '스타트업',
      date: '2024.07.20',
      likes: 16
    },
    {
      id: 7,
      title: '청년창업지원 받을 수 있을지 몰랐는데 성공했어요',
      author: '장○○ 대표',
      company: 'IT솔루션',
      date: '2024.07.19',
      likes: 21
    },
    {
      id: 8,
      title: '인증심사관님이 정말 세심하게 도와주셨어요',
      author: '신○○ 사장',
      company: '유통업체',
      date: '2024.07.18',
      likes: 14
    }
  ];

  // 나라똔Tube 데이터
  const tubeVideos = [
    {
      id: 1,
      videoId: 'gId4FD7ESSs',
      thumbnail: 'https://img.youtube.com/vi/gId4FD7ESSs/maxresdefault.jpg',
      title: '2024년 중소기업 정책자금 활용 전략',
      channel: '나라똔Tube',
      views: '15.2만',
      duration: '12:45',
      uploadDate: '3일 전',
      url: 'https://youtu.be/gId4FD7ESSs'
    },
    {
      id: 2,
      videoId: 'kiJ4XHJ_aXQ',
      thumbnail: 'https://img.youtube.com/vi/kiJ4XHJ_aXQ/maxresdefault.jpg',
      title: 'R&D 과제 선정 성공 사례 분석',
      channel: '나라똔 정책채널',
      views: '8.7만',
      duration: '8:15',
      uploadDate: '1주 전',
      url: 'https://youtu.be/kiJ4XHJ_aXQ'
    },
    {
      id: 3,
      videoId: 'P60GUAk8RCY',
      thumbnail: 'https://img.youtube.com/vi/P60GUAk8RCY/maxresdefault.jpg',
      title: '스타트업 세무처리 완벽 가이드',
      channel: '나라똔Tube',
      views: '12.3만',
      duration: '15:30',
      uploadDate: '2주 전',
      url: 'https://youtu.be/P60GUAk8RCY'
    },
    {
      id: 4,
      videoId: '-AdxSL6B31M',
      thumbnail: 'https://img.youtube.com/vi/-AdxSL6B31M/maxresdefault.jpg',
      title: '수출바우처 신청부터 활용까지',
      channel: '나라똔 정책채널',
      views: '6.4만',
      duration: '10:22',
      uploadDate: '3주 전',
      url: 'https://youtu.be/-AdxSL6B31M'
    },
    {
      id: 5,
      videoId: '9HjUN2jmZME',
      thumbnail: 'https://img.youtube.com/vi/9HjUN2jmZME/maxresdefault.jpg',
      title: '벤처기업 인증 절차 상세 안내',
      channel: '나라똔Tube',
      views: '9.1만',
      duration: '18:07',
      uploadDate: '1개월 전',
      url: 'https://youtu.be/9HjUN2jmZME'
    },
    {
      id: 6,
      videoId: '8BJITYY5uDQ',
      thumbnail: 'https://img.youtube.com/vi/8BJITYY5uDQ/maxresdefault.jpg',
      title: '소상공인 임대료 지원사업 총정리',
      channel: '나라똔 정책채널',
      views: '20.5만',
      duration: '9:20',
      uploadDate: '1개월 전',
      url: 'https://youtu.be/8BJITYY5uDQ'
    }
  ];

  const [currentPage, setCurrentPage] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videoTrackRef = useRef(null);
  
  const videosPerPage = 6;
  const totalPages = Math.ceil(tubeVideos.length / videosPerPage);

  useEffect(() => {
    if (videoTrackRef.current) {
      const translateX = -(currentPage * 100);
      videoTrackRef.current.style.transform = `translateX(${translateX}%)`;
    }
  }, [currentPage]);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const openVideoModal = (video) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  // 인디케이터 클릭 핸들러
  const handleIndicatorClick = (pageIndex) => {
    setCurrentPage(pageIndex);
  };

  return (
    <section className="community-section">
      <div className="container">
        {/* 섹션 헤더 */}
        <div className="section-header">
          <h2>나라똔 커뮤니티</h2>
          <p>전문가 정책분석 내용과 사장님들의 고충을 이야기합니다</p>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="community-content">
          {/* 왼쪽: 정책분석 게시판 */}
          <div className="policy-board">
            <div className="board-header">
              <h3>
                <i className="fas fa-chart-line"></i>
                정책분석 게시판
              </h3>
              <button className="more-btn">더보기 <i className="fas fa-arrow-right"></i></button>
            </div>
            <div className="policy-posts">
              {policyPosts.map((post) => (
                <div key={post.id} className={`policy-post ${post.isBest ? 'best-post' : ''}`}>
                  <div className="post-image">
                    <img src={post.image} alt={post.title} />
                    <div className="post-category">{post.category}</div>
                    {post.isBest && (
                      <div className="best-badge">
                        <i className="fas fa-crown"></i>
                        <span>BEST</span>
                        <div className="best-rank">{post.bestRank}</div>
                      </div>
                    )}
                  </div>
                  <div className="post-content">
                    <h4>{post.title}</h4>
                    <div className="post-meta">
                      <span className="date">{post.date}</span>
                      <span className="views">
                        <i className="fas fa-eye"></i> {post.views.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 오른쪽: 사업자 목소리 */}
          <div className="business-voice">
            <div className="board-header">
              <h3>
                <i className="fas fa-comments"></i>
                사업자 목소리
              </h3>
              <button className="more-btn">더보기 <i className="fas fa-arrow-right"></i></button>
            </div>
            <div className="voice-list">
              {businessVoices.map((voice) => (
                <div key={voice.id} className="voice-item">
                  <div className="voice-content">
                    <h4>{voice.title}</h4>
                    <div className="voice-meta">
                      <span className="author">{voice.author} ({voice.company})</span>
                      <span className="date">{voice.date}</span>
                      <span className="likes">
                        <i className="fas fa-heart"></i> {voice.likes}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
      
      {/* 나라똔Tube 영역 */}
      <div className="naraddon-tube">
        <div className="tube-header">
          <h3>
            <i className="fab fa-youtube"></i>
            나라똔Tube
          </h3>
          <p>정책 전문가들이 직접 설명하는 영상 콘텐츠</p>
        </div>
          
        {/* 태블릿 프레임 */}
        <div className="tablet-frame">
          <div className="tablet-screen">
            <div className="video-carousel">
              <button 
                className="carousel-control prev" 
                onClick={prevPage}
                disabled={currentPage === 0}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <div className="video-slider">
                <div className="video-track" ref={videoTrackRef}>
                  {tubeVideos.map((video, index) => (
                    <div 
                      key={video.id} 
                      className="video-card"
                      onClick={() => openVideoModal(video)}
                    >
                      <div className="video-thumbnail">
                        <img src={video.thumbnail} alt={video.title} />
                        <div className="play-overlay">
                          <i className="fas fa-play-circle"></i>
                        </div>
                        <div className="video-duration">{video.duration}</div>
                      </div>
                      <div className="video-info">
                        <h5>{video.title}</h5>
                        <div className="video-meta">
                          <span className="channel">{video.channel}</span>
                          <span className="views">{video.views}회 • {video.uploadDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                className="carousel-control next" 
                onClick={nextPage}
                disabled={currentPage === totalPages - 1}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            
            {/* 인디케이터 */}
            <div className="video-indicators">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  className={`indicator ${index === currentPage ? 'active' : ''}`}
                  onClick={() => handleIndicatorClick(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

        {/* 비디오 모달 */}
        {showVideoModal && selectedVideo && (
          <div className="video-modal" onClick={() => setShowVideoModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowVideoModal(false)}>
                <i className="fas fa-times"></i>
              </button>
              <div className="modal-video">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="modal-info">
                <h4>{selectedVideo.title}</h4>
                <div className="modal-meta">
                  <span className="channel">{selectedVideo.channel}</span>
                  <span className="views">조회수 {selectedVideo.views}회</span>
                  <span className="date">{selectedVideo.uploadDate}</span>
                </div>
              </div>
            </div>
          </div>
        )}      
    </section>
  );
}

export default CommunitySection;