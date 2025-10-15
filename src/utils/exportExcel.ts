/**
 * 엑셀 내보내기 유틸리티
 *
 * @purpose 심사관 목록을 엑셀 파일로 내보내기
 * @context xlsx 라이브러리를 사용하여 클라이언트 사이드에서 엑셀 생성
 * @note 브라우저에서만 동작하므로 'use client' 컴포넌트에서만 사용
 */

import * as XLSX from 'xlsx';

/**
 * 심사관 데이터 인터페이스
 */
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

/**
 * 엑셀 내보내기용 데이터 행 인터페이스
 */
interface ExcelRow {
  순서: number;
  이름: string;
  직책: string;
  회사명: string;
  카테고리: string;
  전문분야: string;
  '이미지 URL': string;
  '사용자 연결': string;
  공개여부: string;
  생성일: string;
  수정일: string;
}

/**
 * 카테고리를 한글로 변환
 *
 * @purpose 엑셀 파일의 가독성 향상
 */
function getCategoryLabel(category: string): string {
  const categoryMap: Record<string, string> = {
    funding: '자금지원',
    consulting: '컨설팅',
    legal: '법률/특허',
    marketing: '마케팅',
    tech: '기술',
  };
  return categoryMap[category] || category;
}

/**
 * 날짜를 한국 시간 형식으로 변환
 *
 * @purpose 엑셀에서 읽기 쉬운 날짜 형식으로 변환
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * 심사관 목록을 엑셀 파일로 내보내기
 *
 * @param examiners 심사관 목록
 * @returns Blob 객체 (엑셀 파일)
 *
 * @example
 * const blob = await exportExaminersToExcel(examiners);
 * const url = URL.createObjectURL(blob);
 * const link = document.createElement('a');
 * link.href = url;
 * link.download = '심사관_목록.xlsx';
 * link.click();
 */
export async function exportExaminersToExcel(
  examiners: Examiner[]
): Promise<Blob> {
  // 엑셀 데이터 행 생성
  const excelData: ExcelRow[] = examiners.map((examiner, index) => ({
    순서: index + 1,
    이름: examiner.name,
    직책: examiner.position,
    회사명: examiner.companyName,
    카테고리: getCategoryLabel(examiner.category),
    전문분야: examiner.specialties.join(', ') || '없음',
    '이미지 URL': examiner.imageUrl || '없음',
    '사용자 연결': examiner.userId ? '연결됨' : '미연결',
    공개여부: examiner.isPublished ? '공개' : '비공개',
    생성일: formatDate(examiner.createdAt),
    수정일: formatDate(examiner.updatedAt),
  }));

  // 워크시트 생성
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // 컬럼 너비 설정
  const columnWidths = [
    { wch: 6 },  // 순서 (1~23 정도이므로 좁게)
    { wch: 12 }, // 이름
    { wch: 20 }, // 직책
    { wch: 20 }, // 회사명
    { wch: 12 }, // 카테고리
    { wch: 30 }, // 전문분야
    { wch: 40 }, // 이미지 URL
    { wch: 12 }, // 사용자 연결
    { wch: 10 }, // 공개여부
    { wch: 18 }, // 생성일
    { wch: 18 }, // 수정일
  ];
  worksheet['!cols'] = columnWidths;

  // 워크북 생성
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '심사관 목록');

  // 엑셀 파일 생성
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  // Blob 객체 생성
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return blob;
}

/**
 * 엑셀 파일 다운로드 함수
 *
 * @purpose 생성된 엑셀 Blob을 파일로 다운로드
 * @param blob 엑셀 파일 Blob
 * @param filename 다운로드할 파일명 (기본값: 현재 날짜시간)
 */
export function downloadExcelFile(blob: Blob, filename?: string): void {
  const defaultFilename = generateExcelFilename();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 엑셀 파일명 생성
 *
 * @returns 날짜/시간 포함된 파일명
 * @example 심사관_목록_20251015_143022.xlsx
 */
export function generateExcelFilename(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `심사관_목록_${dateStr}_${timeStr}.xlsx`;
}

/**
 * 심사관 목록을 엑셀로 내보내기 (다운로드 포함)
 *
 * @purpose 엑셀 생성과 다운로드를 한 번에 처리
 * @param examiners 심사관 목록
 * @param filename 선택적 파일명
 */
export async function exportAndDownloadExaminers(
  examiners: Examiner[],
  filename?: string
): Promise<void> {
  try {
    const blob = await exportExaminersToExcel(examiners);
    downloadExcelFile(blob, filename);
  } catch (error) {
    console.error('[Excel Export] Error:', error);
    throw new Error('엑셀 파일 생성에 실패했습니다.');
  }
}
