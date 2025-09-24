import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { businessNumber, representativeName, openDate } = await request.json();

    if (!businessNumber) {
      return NextResponse.json(
        { error: '사업자 번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사업자 번호 형식 검증 (10자리 숫자)
    const businessNumberPattern = /^\d{3}-\d{2}-\d{5}$/;
    const cleanedNumber = businessNumber.replace(/-/g, '');
    
    if (!businessNumberPattern.test(businessNumber) && cleanedNumber.length !== 10) {
      return NextResponse.json(
        { error: '올바른 사업자 번호 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    const API_KEY = process.env.DATA_GO_KR_API_KEY;

    if (!API_KEY) {
      console.error('공공데이터포털 API 키가 설정되지 않았습니다.');
      
      // 개발 환경에서는 테스트 데이터 반환
      if (process.env.NODE_ENV === 'development') {
        // 테스트용 사업자번호: 120-81-47035 (삼성전자)
        if (cleanedNumber === '1208147035') {
          return NextResponse.json({
            valid: true,
            businessNumber: businessNumber,
            companyName: '삼성전자주식회사',
            representativeName: '한종희',
            businessAddress: '경기도 수원시 영통구 삼성로 129',
            businessType: '제조업',
            businessStatus: '계속사업자',
            message: '검증 성공 (개발 테스트)'
          });
        }
        
        return NextResponse.json({
          valid: false,
          businessNumber: businessNumber,
          message: '유효하지 않은 사업자 번호입니다. (개발 테스트)'
        });
      }

      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 공공데이터포털 사업자등록정보 진위확인 API
    // API 문서: https://www.data.go.kr/data/15081808/openapi.do
    const apiUrl = 'https://api.odcloud.kr/api/nts-businessman/v1/status';

    // API 요청 본문 - 최대 100개까지 가능하지만 단일 요청
    const requestBody = {
      b_no: [cleanedNumber]  // 사업자번호 배열로 전송
    };

    console.log('사업자 번호 검증 요청:', {
      url: apiUrl,
      businessNumber: cleanedNumber,
      apiKey: API_KEY ? 'Set' : 'Not set'
    });

    const response = await fetch(`${apiUrl}?serviceKey=${encodeURIComponent(API_KEY)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API 호출 실패: ${response.status}`, errorText);

      // 개발 모드에서 테스트 데이터 반환
      if (cleanedNumber === '1208147035') {
        return NextResponse.json({
          valid: true,
          businessNumber: businessNumber,
          companyName: '삼성전자주식회사',
          representativeName: '한종희',
          businessAddress: '경기도 수원시 영통구 삼성로 129',
          businessType: '제조업',
          businessStatus: '계속사업자',
          message: '검증 성공 (테스트 모드)'
        });
      }

      throw new Error(`API 호출 실패: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API 응답:', JSON.stringify(data, null, 2));

    // API 응답 구조: { status_code, data: [...] }
    if (data.status_code !== 'OK' || !data.data?.[0]) {
      return NextResponse.json({
        valid: false,
        businessNumber: businessNumber,
        message: '검증 결과를 찾을 수 없습니다.'
      });
    }

    const result = data.data[0];

    // b_stt: "01" = 계속사업자, "02" = 휴업자, "03" = 폐업자
    const isValid = result.b_stt === '01';
    const statusMap: Record<string, string> = {
      '01': '계속사업자',
      '02': '휴업자',
      '03': '폐업자'
    };

    // tax_type: "01" = 부가가치세 일반과세자, "02" = 면세사업자, "03" = 간이과세자 등
    const taxTypeMap: Record<string, string> = {
      '01': '부가가치세 일반과세자',
      '02': '부가가치세 면세사업자',
      '03': '부가가치세 간이과세자',
      '04': '부가가치세 비과세자',
      '05': '미등록(일반)',
      '06': '미등록(간이)'
    };

    return NextResponse.json({
      valid: isValid,
      businessNumber: businessNumber,
      businessStatus: statusMap[result.b_stt] || '알 수 없음',
      taxType: taxTypeMap[result.tax_type] || '알 수 없음',
      closeDate: result.end_dt || null,
      message: isValid ? '유효한 사업자 번호입니다.' : `사업자 상태: ${statusMap[result.b_stt] || '확인 불가'}`
    });

  } catch (error) {
    console.error('사업자 번호 검증 오류:', error);
    return NextResponse.json(
      { error: '사업자 번호 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}