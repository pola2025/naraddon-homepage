const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function addSuccessCases() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('MongoDB 연결 성공');

    const db = client.db('naraddon');
    const experts = db.collection('experts');

    // 전기홍 행정사의 성공 케이스 추가
    const result = await experts.updateOne(
      { _id: new ObjectId('68d00d0db18b2f31b7860be1') },
      {
        $set: {
          successCases: [
            {
              title: '중소 제조업체 특허청 인허가 성공',
              category: '제조업 인허가',
              description: '경기도 소재 정밀기계 제조업체의 특허청 인허가 절차 전담. 복잡한 서류 작업을 체계적으로 정리하여 예상 기간보다 2주 단축하여 승인 완료. 고객사의 신속한 사업 개시에 기여.',
              result: '인허가 기간 2주 단축, 100% 승인',
              period: '2024년 상반기'
            },
            {
              title: '스타트업 법인 설립 및 각종 인허가 일괄 처리',
              category: '법인 설립',
              description: 'IT 스타트업의 법인 설립부터 통신판매업 신고, 개인정보보호 인증까지 원스톱 서비스 제공. 창업 초기 대표가 사업에 집중할 수 있도록 행정 업무 전담 처리.',
              result: '법인 설립 후 3일 내 영업 개시',
              period: '2023년 하반기'
            },
            {
              title: '건설업 면허 취득 및 경영상태 평가 개선',
              category: '건설업 인허가',
              description: '신규 건설업체의 종합건설업 면허 취득 지원. 경영상태 평가 점수를 최대한 높이기 위한 전략적 자문 제공. 입찰 참여 자격 조건을 충족시켜 사업 확장 기회 창출.',
              result: '종합건설업 면허 1회 합격, 경영평가 우수 등급',
              period: '2024년 초'
            },
            {
              title: '외국인 투자기업 사업자등록 및 체류자격 변경',
              category: '외국인 투자',
              description: '베트남 투자자의 한국 법인 설립 및 D-8 비자 취득 전담. 법무부, 출입국관리사무소, 세무서 등 여러 기관과의 협력을 통해 원활한 절차 진행. 언어 장벽 해소 및 문화적 차이 극복 지원.',
              result: '법인 설립 및 D-8 비자 동시 취득 성공',
              period: '2023년 상반기'
            },
            {
              title: '식품 제조업체 HACCP 인증 취득 지원',
              category: '식품 인허가',
              description: '중소 식품 제조업체의 HACCP 인증 취득을 위한 서류 작성 및 현장 점검 대응 컨설팅. 식품안전관리 시스템 구축부터 최종 인증까지 전 과정 밀착 지원.',
              result: 'HACCP 인증 1회 통과',
              period: '2023년 하반기'
            }
          ],
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ 전기홍 행정사 성공 케이스 추가 완료');
      console.log('   - 5개 성공 케이스 추가됨');
    } else {
      console.log('⚠️  업데이트 실패 또는 이미 데이터가 존재합니다');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
    console.log('MongoDB 연결 종료');
  }
}

addSuccessCases();
