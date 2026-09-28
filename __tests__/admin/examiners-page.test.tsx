import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ExaminersPage from '../../app/admin/examiners/page';

jest.mock('@/utils/exportExcel', () => ({
  exportAndDownloadExaminers: jest.fn(),
}));

const examiner = (index: number) => ({
  _id: String(index),
  name: `심사관 ${index}`,
  position: '인증 기업심사관',
  companyName: '테스트 회사',
  category: 'funding',
  specialties: [],
  imageUrl: '',
  userId: null,
  isPublished: true,
  sortOrder: index,
  createdAt: '',
  updatedAt: '',
});

describe('관리자 심사관 목록', () => {
  it('다음 페이지까지 불러와 전체 인원과 행을 표시한다', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => examiner(index + 1));
    const secondPage = Array.from({ length: 35 }, (_, index) => examiner(index + 51));
    const fetchMock = jest.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('cursor=')
          ? { examiners: secondPage, hasMore: false, nextCursor: null }
          : { examiners: firstPage, hasMore: true, nextCursor: 'next-page' },
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ExaminersPage />);

    await waitFor(() => expect(screen.getByText('85명')).toBeInTheDocument());
    expect(screen.getAllByRole('row')).toHaveLength(86);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('cursor=next-page');
  });
});
