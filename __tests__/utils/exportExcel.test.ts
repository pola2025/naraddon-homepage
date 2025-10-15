/**
 * 엑셀 내보내기 유틸리티 테스트
 *
 * @purpose TDD 방식으로 심사관 목록 엑셀 내보내기 기능 테스트
 * @context RED 단계: 실패하는 테스트를 먼저 작성
 */

import { exportExaminersToExcel } from '@/utils/exportExcel';

interface Examiner {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  category: string;
  specialties: string[];
  imageUrl: string;
  userId: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

describe('exportExaminersToExcel', () => {
  const mockExaminers: Examiner[] = [
    {
      _id: '1',
      name: '백경우',
      position: '인증 기업심사관',
      companyName: '나라똔',
      category: 'funding',
      specialties: ['자금지원', '정책분석'],
      imageUrl: 'https://example.com/image.jpg',
      userId: 'user1',
      isPublished: true,
      sortOrder: 10,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
    },
    {
      _id: '2',
      name: '성민석',
      position: '인증 기업심사관',
      companyName: '나라똔',
      category: 'consulting',
      specialties: ['컨설팅'],
      imageUrl: '',
      userId: null,
      isPublished: false,
      sortOrder: 20,
      createdAt: '2025-01-03T00:00:00.000Z',
      updatedAt: '2025-01-04T00:00:00.000Z',
    },
  ];

  it('exportExaminersToExcel 함수가 정의되어야 함', () => {
    expect(exportExaminersToExcel).toBeDefined();
    expect(typeof exportExaminersToExcel).toBe('function');
  });

  it('심사관 데이터를 엑셀로 내보내야 함', async () => {
    const result = await exportExaminersToExcel(mockExaminers);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Blob);
  });

  it('빈 배열이 전달되어도 엑셀 파일을 생성해야 함', async () => {
    const result = await exportExaminersToExcel([]);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Blob);
  });

  it('엑셀 파일명이 생성되어야 함', () => {
    const filename = getExcelFilename();
    expect(filename).toMatch(/심사관_목록_\d{8}_\d{6}\.xlsx/);
  });
});

/**
 * 엑셀 파일명 생성 함수 테스트
 */
function getExcelFilename(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `심사관_목록_${dateStr}_${timeStr}.xlsx`;
}
