import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfileCard from '@/components/profile/ProfileCard';
import { User, UserRole, UserStatus } from '@/types/user.types';

const user = {
  id: 'user-1',
  name: '테스트 회원',
  email: 'member@example.com',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  profile: {},
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as User;

const examiner = (index: number, name = `심사관 ${index}`, companyName = '테스트 회사') => ({
  _id: String(index),
  name,
  companyName,
});

/**
 * 등급 변경 모달의 심사관·전문가 선택 목록
 *
 * @context /api/admin/examiners 는 한 번에 최대 50명만 돌려준다. 첫 페이지만 읽으면
 *          이름순 51번째 이후 심사관(유현서·윤성일 등)이 선택 목록에서 빠져 계정을 연결할 수 없다.
 */
describe('회원 등급 변경 모달', () => {
  const openExaminerSelect = () => {
    render(<ProfileCard user={user} mode="admin" onRoleChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '등급 변경' }));
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: UserRole.EXAMINER } });
  };

  it('다음 페이지의 심사관까지 선택 목록에 표시한다', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => examiner(index + 1));
    const secondPage = [
      examiner(51, '유현서', '세진컴퍼니'),
      examiner(54, '윤성일', '리치웨이 파트너스'),
    ];
    const fetchMock = jest.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => {
        if (url.startsWith('/api/admin/experts')) {
          return { experts: [], hasMore: false, nextCursor: null };
        }
        return url.includes('cursor=')
          ? { examiners: secondPage, hasMore: false, nextCursor: null }
          : { examiners: firstPage, hasMore: true, nextCursor: 'next-page' };
      },
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    openExaminerSelect();

    await waitFor(() =>
      expect(screen.getByRole('option', { name: '유현서 - 세진컴퍼니' })).toBeInTheDocument()
    );
    expect(screen.getByRole('option', { name: '윤성일 - 리치웨이 파트너스' })).toBeInTheDocument();
    // 안내 문구 1개 + 심사관 52명
    expect(screen.getAllByRole('combobox')[1].querySelectorAll('option')).toHaveLength(53);

    const examinerCalls = fetchMock.mock.calls
      .map(([url]) => url as string)
      .filter((url) => url.startsWith('/api/admin/examiners'));
    expect(examinerCalls).toHaveLength(2);
    expect(examinerCalls[1]).toContain('cursor=next-page');
  });

  it('다음 페이지 조회가 실패하면 일부만 담긴 목록을 보여주지 않는다', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => examiner(index + 1));
    const fetchMock = jest.fn().mockImplementation(async (url: string) => {
      if (url.startsWith('/api/admin/experts')) {
        return { ok: true, json: async () => ({ experts: [], hasMore: false, nextCursor: null }) };
      }
      return url.includes('cursor=')
        ? { ok: false, json: async () => ({ error: 'Failed to fetch examiners' }) }
        : {
            ok: true,
            json: async () => ({ examiners: firstPage, hasMore: true, nextCursor: 'next-page' }),
          };
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    openExaminerSelect();

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(screen.getAllByRole('combobox')[1].querySelectorAll('option')).toHaveLength(1);
    consoleError.mockRestore();
  });
});
