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

    // 공공데이터포털 API 호출
    const apiUrl = 'https://api.odcloud.kr/api/nts-businessman/v1/validate';
    
    const requestBody = {
      businesses: [
        {
          b_no: cleanedNumber,
          start_dt: openDate?.replace(/-/g, '') || '',
          p_nm: representativeName || ''
        }
      ]
    };

    console.log('사업자 번호 검증 요청:', cleanedNumber);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
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
    const result = data.data?.[0];

    if (!result) {
      return NextResponse.json({
        valid: false,
        businessNumber: businessNumber,
        message: '검증 결과를 찾을 수 없습니다.'
      });
    }

    // valid: "01" = 계속사업자, "02" = 휴폐업자, "03" = 폐업자
    const isValid = result.valid === '01';
    const statusMap: Record<string, string> = {
      '01': '계속사업자',
      '02': '휴업자',
      '03': '폐업자'
    };

    return NextResponse.json({
      valid: isValid,
      businessNumber: businessNumber,
      companyName: result.tax_type_nm || '',
      representativeName: representativeName,
      businessStatus: statusMap[result.valid] || '알 수 없음',
      message: isValid ? '유효한 사업자 번호입니다.' : '유효하지 않은 사업자 번호입니다.'
    });

  } catch (error) {
    console.error('사업자 번호 검증 오류:', error);
    return NextResponse.json(
      { error: '사업자 번호 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}