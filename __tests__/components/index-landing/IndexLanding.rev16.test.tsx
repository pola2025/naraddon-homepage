/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import IndexLanding from '@/components/index-landing/IndexLanding';

/**
 * 인덱스 16차 시안 반영 검증
 *
 * @purpose 14차~16차 시안에서 확정한 값이 운영 소스에 그대로 들어갔는지 확인한다
 * @context 기준 파일은 docs/wireframes/naraddon-index-header-footer-chat-20261002-rev16.html 과
 *          naraddon-index-mobile-20261002-rev16.html 이다
 * @note jsdom 은 미디어쿼리를 적용하지 않으므로, 화면 폭별 값은 CSS 파일 내용을 읽어 확인한다
 */

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/components/loading', () => ({
  MotionLoader: () => null,
}));

const css = fs.readFileSync(
  path.join(process.cwd(), 'src/components/index-landing/IndexLanding.css'),
  'utf8'
);

// 중괄호 짝을 맞춰 규칙 하나의 본문을 꺼낸다(미디어쿼리처럼 안에 규칙이 더 있어도 끝까지 읽는다).
function blockOf(source: string, head: string): string {
  const start = source.indexOf(head);
  if (start === -1) throw new Error(`규칙을 찾지 못했습니다: ${head}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`규칙이 닫히지 않았습니다: ${head}`);
}

const mobile = blockOf(css, '@media (max-width: 520px)');
const tablet = blockOf(css, '@media (max-width: 768px)');

describe('인덱스 16차 시안 반영', () => {
  describe('14차: 검색창·소식 박스·푸터 배경', () => {
    it('검색 중 바깥 연녹색 음영을 3.5px 로 줄인다', () => {
      expect(blockOf(css, '.nx-search:focus-within')).toContain(
        'box-shadow: 0 0 0 3.5px rgba(17, 151, 45, 0.1)'
      );
    });

    it('소식 박스의 안쪽 여백과 줄 간격을 줄인다', () => {
      expect(blockOf(css, '.nx-news-inner')).toContain(
        'padding: var(--m-news-pad-top, 5px) 16px var(--m-news-pad-bottom, 5px)'
      );
      const list = blockOf(css, '.nx-news-list');
      expect(list).toContain('gap: 1px');
      expect(list).toContain('line-height: 1.4');
    });

    it('모바일 소식 박스의 안쪽 여백과 제목 줄 간격을 줄인다', () => {
      const inner = blockOf(tablet, '.nx-news-inner');
      expect(inner).toContain('gap: 4px 8px');
      expect(inner).toContain(
        'padding: var(--m-news-pad-top, 6px) 12px var(--m-news-pad-bottom, 6px)'
      );
    });

    it('푸터 배경을 흰색으로 바꾼다', () => {
      expect(blockOf(css, '.nx-footer {')).toContain('background: #fff');
    });
  });

  describe('15차: 모바일 챗봇 버튼 위치', () => {
    it('버튼 크기 50px, 오른쪽 40px, 아래 105px 로 둔다', () => {
      const entry = blockOf(mobile, '.nx-chat-entry');
      expect(entry).toContain('--chat-size: 50px');
      expect(entry).toContain('right: 40px');
      expect(entry).toContain('bottom: 105px');
    });

    it('상담창이 화면 밖으로 나가지 않도록 폭을 줄인다', () => {
      const panel = blockOf(mobile, '.nx-chat-panel');
      expect(panel).toContain('bottom: 60px');
      expect(panel).toContain('width: min(336px, calc(100vw - 52px))');
    });
  });

  describe('16차: 푸터 파트너십 줄', () => {
    it('PC 는 파트너십 줄만 9.5px 로 키운다', () => {
      // 회사 정보와 묶인 8px 규칙 뒤에 오는 파트너십 전용 규칙에서 9.5px 로 덮는다.
      expect(blockOf(css, '.nx-footer-partnership {\n  padding-top')).toContain('font-size: 9.5px');
      expect(blockOf(css, '.nx-footer-company,\n.nx-copyright,\n.nx-footer-partnership')).toContain(
        'font-size: 8px'
      );
    });

    it('모바일은 빈 줄을 없애고 파트너십 줄을 13px 로 키우며 회사 정보는 연하게 한다', () => {
      expect(blockOf(mobile, '.nx-footer-container')).toContain('gap: 0');
      expect(blockOf(mobile, '.nx-footer-partnership {')).toContain('font-size: 13px');
      expect(blockOf(mobile, '.nx-copyright')).toContain('color: #858b87');
      expect(mobile).toMatch(/\.nx-footer-company,\s*\.nx-copyright\s*\{/);
    });
  });

  describe('파트너십 문의 문구', () => {
    it('PC 에서는 "파트너십 제휴 문의" 전체 문구를 유지한다', () => {
      const { container } = render(<IndexLanding />);
      const line = container.querySelector('.nx-footer-partnership');
      expect(line).toHaveTextContent('파트너십 제휴 문의: jjk-biz@naver.com');
    });

    it('"제휴" 글자만 모바일에서 숨길 수 있도록 따로 감싼다', () => {
      const { container } = render(<IndexLanding />);
      const word = container.querySelector('.nx-footer-partnership .nx-footer-partnership-pc-only');
      expect(word).toHaveTextContent('제휴');
      expect(blockOf(mobile, '.nx-footer-partnership-pc-only')).toContain('display: none');
    });

    it('"제휴" 글자를 PC·태블릿에서는 숨기지 않는다', () => {
      const outsideMobile = css.replace(mobile, '');
      expect(outsideMobile).not.toContain('.nx-footer-partnership-pc-only');
    });
  });
});
