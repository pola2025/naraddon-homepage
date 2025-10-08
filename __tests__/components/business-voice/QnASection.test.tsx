/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QnASection from '@/components/business-voice/QnASection';

// Mock fetch API
global.fetch = jest.fn();

describe('QnASection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and display questions from API', async () => {
    const mockApiResponse = {
      questions: [
        {
          id: '1',
          title: '사업자등록 후 첫 세금신고는 언제 해야 하나요?',
          content: '사업자등록을 처음 했는데 세금신고가 헷갈립니다.',
          category: 'tax',
          author: {
            nickname: '파란하늘',
            businessType: '소매업',
            region: '서울',
            yearsInBusiness: 1,
          },
          metrics: {
            viewCount: 234,
            commentCount: 2,
            scrapCount: 5,
          },
          flags: {
            needsExpertReply: false,
            needsExaminerReply: false,
          },
          sources: [],
          answers: [
            {
              role: 'examiner',
              displayName: '박현숙',
              organization: 'KPJ',
              content:
                '사업자등록 후 부가가치세는 일반과세자의 경우 분기별로 신고합니다.',
              isPinned: true,
              sources: [],
              helpfulCount: 15,
              answeredAt: '2025-10-08T10:00:00.000Z',
            },
          ],
          createdAt: '2025-10-08T08:00:00.000Z',
          updatedAt: '2025-10-08T10:00:00.000Z',
        },
      ],
      count: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<QnASection />);

    // 로딩 상태 확인
    expect(screen.getByText('묻고 답하기')).toBeInTheDocument();

    // API 호출 확인
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/business-voice/questions?limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    // 질문 제목이 렌더링되었는지 확인
    await waitFor(() => {
      expect(
        screen.getByText('사업자등록 후 첫 세금신고는 언제 해야 하나요?')
      ).toBeInTheDocument();
    });

    // 답변이 렌더링되었는지 확인
    await waitFor(() => {
      expect(
        screen.getByText(/사업자등록 후 부가가치세는 일반과세자의 경우/)
      ).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<QnASection />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Q&A 데이터 로딩 실패:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('should display loading skeleton initially', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ questions: [], count: 0 }),
            });
          }, 100);
        })
    );

    render(<QnASection />);

    // 스켈레톤 로더 확인
    const skeletons = document.querySelectorAll('.qna-skeleton-item');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should not use hardcoded data', async () => {
    const mockApiResponse = {
      questions: [
        {
          id: 'test-1',
          title: 'API에서 가져온 질문',
          content: 'API 테스트',
          category: 'test',
          author: {
            nickname: 'API사용자',
            businessType: '테스트',
            region: '테스트',
            yearsInBusiness: 0,
          },
          metrics: {
            viewCount: 1,
            commentCount: 0,
            scrapCount: 0,
          },
          flags: {
            needsExpertReply: false,
            needsExaminerReply: false,
          },
          sources: [],
          answers: [],
          createdAt: '2025-10-08T08:00:00.000Z',
          updatedAt: '2025-10-08T08:00:00.000Z',
        },
      ],
      count: 1,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    render(<QnASection />);

    // API에서 가져온 데이터가 렌더링되는지 확인
    await waitFor(() => {
      expect(screen.getByText('API에서 가져온 질문')).toBeInTheDocument();
    });

    // 하드코딩된 데이터가 나타나지 않는지 확인
    expect(screen.queryByText('파란하늘')).not.toBeInTheDocument();
  });
});
