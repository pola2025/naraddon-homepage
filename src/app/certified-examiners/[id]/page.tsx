import { Metadata } from 'next';
import ExaminerBrandPage from '@/components/examiner-brand/ExaminerBrandPage';

/**
 * 심사관 브랜드 페이지
 * 
 * @purpose 개별 심사관의 상세 정보 및 브랜드 페이지 표시
 * @context 각 심사관은 본인 페이지를 편집할 수 있으며, 관리자는 모든 페이지 관리 가능
 * @decision URL 직접 접근만 가능 (리스트 페이지에서 '자세히보기' 버튼은 마지막에 추가)
 */

interface PageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // TODO: API에서 심사관 정보 가져와서 메타데이터 생성
  return {
    title: '인증 기업심사관 | 나라똔',
    description: '나라똔 인증 기업심사관과 함께하는 프리미엄 비즈니스 컨설팅',
  };
}

export default function ExaminerPage({ params }: PageProps) {
  return <ExaminerBrandPage examinerId={params.id} />;
}
