// Legal content for terms and privacy policy

export type LegalModalType = 'terms' | 'privacy';

export interface LegalSection {
  title: string;
  description: string;
  bullets?: string[];
}

export const LEGAL_BUSINESS_INFO = [
  { label: '상호명:', value: '나라똔' },
  { label: '대표자:', value: '대표자명' },
  { label: '사업자등록번호:', value: '123-45-67890' },
  { label: '주소:', value: '서울특별시' },
  { label: '고객센터:', value: '1588-0000' },
];

export const LEGAL_EFFECTIVE_DATE = '2024년 1월 1일';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '제1조 (목적)',
    description: '이 약관은 나라똔(이하 "회사")이 제공하는 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.',
  },
  {
    title: '제2조 (정의)',
    description: '이 약관에서 사용하는 용어의 정의는 다음과 같습니다.',
    bullets: [
      '"서비스"란 회사가 제공하는 정책 정보, 상담 서비스 등을 말합니다.',
      '"회원"이란 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결한 자를 말합니다.',
      '"소셜 로그인"이란 네이버, 카카오 등 외부 서비스 계정을 통한 인증을 말합니다.',
    ],
  },
  {
    title: '제3조 (약관의 효력 및 변경)',
    description: '회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지됩니다.',
  },
  {
    title: '제4조 (서비스의 제공)',
    description: '회사는 다음과 같은 서비스를 제공합니다.',
    bullets: [
      '정책 정보 제공 서비스',
      '전문가 상담 서비스',
      '맞춤형 정책 추천 서비스',
      '기타 회사가 정하는 서비스',
    ],
  },
  {
    title: '제5조 (회원가입)',
    description: '서비스를 이용하고자 하는 자는 소셜 로그인을 통해 회원가입을 할 수 있습니다.',
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. 수집하는 개인정보',
    description: '나라똔은 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.',
    bullets: [
      '소셜 로그인 정보 (이메일, 닉네임, 프로필 사진)',
      '서비스 이용 기록',
      '상담 신청 정보',
      '접속 IP, 쿠키, 서비스 이용 기록',
    ],
  },
  {
    title: '2. 개인정보의 수집 및 이용목적',
    description: '수집한 개인정보는 다음의 목적을 위해 활용됩니다.',
    bullets: [
      '회원제 서비스 제공',
      '맞춤형 정책 정보 제공',
      '상담 서비스 제공',
      '서비스 개선 및 신규 서비스 개발',
    ],
  },
  {
    title: '3. 개인정보의 보유 및 이용기간',
    description: '회사는 개인정보 수집 및 이용목적이 달성된 후에는 예외 없이 해당 정보를 지체 없이 파기합니다.',
  },
  {
    title: '4. 개인정보의 제3자 제공',
    description: '회사는 회원의 동의 없이 개인정보를 외부에 제공하지 않습니다.',
  },
  {
    title: '5. 개인정보의 안전성 확보조치',
    description: '회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.',
    bullets: [
      '개인정보 암호화',
      '해킹 등에 대비한 보안 시스템 구축',
      '개인정보 접근 권한 관리',
      '개인정보 취급 직원의 교육',
    ],
  },
  {
    title: '6. 개인정보 보호책임자',
    description: '개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.',
  },
];