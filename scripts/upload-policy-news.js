// 정책 뉴스 자동 등록 스크립트
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 정책 관련 이미지 URL (정부 공식 자료)
const policyImages = {
  funding: [
    'https://www.kosmes.or.kr/images/common/logo.png',
    'https://www.mss.go.kr/images/common/logo.png'
  ],
  education: [
    'https://www.hrd.go.kr/images/common/logo.png',
    'https://www.korcham.net/images/common/logo.png'
  ],
  support: [
    'https://www.semas.or.kr/images/common/logo.png',
    'https://www.sbiz.or.kr/images/common/logo.png'
  ],
  youth: [
    'https://www.youthcenter.go.kr/images/common/logo.png',
    'https://www.k-startup.go.kr/images/common/logo.png'
  ],
  green: [
    'https://www.me.go.kr/images/common/logo.png',
    'https://www.keiti.re.kr/images/common/logo.png'
  ],
  default: [
    'https://www.korea.kr/images/common/logo.png'
  ]
};

// 기업심사관 목록 (랜덤 선택용)
const examiners = [
  { name: '김태수', position: '기술금융 전문가' },
  { name: '권혁중', position: '수출지원 전문가' },
  { name: '김수빈', position: '기업인증 전문가' },
  { name: '박민재', position: '제조업 컨설턴트' },
  { name: '태건호', position: '청년창업 멘토' },
  { name: '전예진', position: 'IT/콘텐츠 전문가' },
  { name: '손지숙', position: '서비스업 컨설턴트' },
  { name: '전윤지', position: '농식품산업 전문가' },
  { name: '박현숙', position: '여성기업 전문가' },
  { name: '이용흔', position: '부동산금융 전문가' }
];

// 랜덤 선택 함수
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 카테고리별 이미지 선택
function getImageForCategory(category) {
  const images = policyImages[category] || policyImages.default;
  return getRandomItem(images);
}

// 정책 뉴스 등록 함수
async function uploadPolicyNews() {
  try {
    // JSON 파일 읽기
    const jsonPath = path.join(__dirname, '..', 'policy-news-2025-09-factchecked.json');
    console.log('📁 JSON 파일 경로:', jsonPath);

    if (!fs.existsSync(jsonPath)) {
      console.error('❌ JSON 파일을 찾을 수 없습니다:', jsonPath);
      return;
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📊 총 ${data.posts?.length || 0}개의 게시글 발견`);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3007';
    console.log('🌐 API URL:', baseUrl);
    console.log('📋 정책 뉴스 등록 시작...\n');

    for (const post of data.posts) {
      // 랜덤 심사관 선택
      const examiner = getRandomItem(examiners);

      // 카테고리별 이미지 선택
      const thumbnailUrl = getImageForCategory(post.category);

      // 등록 데이터 구성
      const postData = {
        ...post,
        thumbnail: thumbnailUrl,
        author: examiner.name,
        authorPosition: examiner.position,
        createdAt: new Date().toISOString()
      };

      console.log(`📝 등록 중: ${post.title}`);
      console.log(`   - 카테고리: ${post.category}`);
      console.log(`   - 심사관: ${examiner.name} (${examiner.position})`);
      console.log(`   - 이미지: ${thumbnailUrl}\n`);

      // API 호출
      const response = await fetch(`${baseUrl}/api/policy-news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ 성공: ID ${result.post._id}\n`);
      } else {
        const error = await response.text();
        console.error(`❌ 실패: ${error}\n`);
      }

      // API 부하 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✨ 모든 정책 뉴스 등록 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 개별 뉴스 등록 함수 (URL 직접 지정)
async function uploadSingleNews(newsData, imageUrl, examinerName = null) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3007';

    // 심사관 선택 (지정하지 않으면 랜덤)
    const examiner = examinerName
      ? examiners.find(e => e.name === examinerName) || getRandomItem(examiners)
      : getRandomItem(examiners);

    const postData = {
      ...newsData,
      thumbnail: imageUrl || getImageForCategory(newsData.category),
      author: examiner.name,
      authorPosition: examiner.position,
      createdAt: new Date().toISOString()
    };

    console.log(`📝 개별 등록: ${newsData.title}`);
    console.log(`   - 심사관: ${examiner.name} (${examiner.position})`);
    console.log(`   - 이미지: ${postData.thumbnail}`);

    const response = await fetch(`${baseUrl}/api/policy-news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ 등록 성공: ID ${result.post._id}`);
      return result.post;
    } else {
      const error = await response.text();
      console.error(`❌ 등록 실패: ${error}`);
      return null;
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    return null;
  }
}

// 스크립트 실행
console.log('🚀 스크립트 시작...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

// Windows 경로 처리
const scriptPath = fileURLToPath(import.meta.url);
const isMainScript = scriptPath === process.argv[1];

if (isMainScript) {
  console.log('✅ 메인 스크립트로 실행됨');
  // 명령줄 인자 확인
  const args = process.argv.slice(2);

  if (args[0] === '--single') {
    // 단일 뉴스 등록 예시
    const sampleNews = {
      title: '테스트 정책 뉴스',
      category: 'funding',
      content: '<p>테스트 내용입니다.</p>',
      description: '테스트 설명',
      tags: ['테스트'],
      badge: 'NEW'
    };

    uploadSingleNews(
      sampleNews,
      'https://example.com/image.jpg',
      '김태수'
    );
  } else {
    // 전체 뉴스 일괄 등록
    uploadPolicyNews();
  }
}

export { uploadPolicyNews, uploadSingleNews };