'use client';

import { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import './PolicyNewsEditor.css';

/**
 * 정책소식 본문 에디터 (ReactQuill 래퍼)
 *
 * @purpose 와이어 ③ 사양 — 폰트 크기/정렬/이미지 업로드/인용/목록/색상 지원
 * @context PolicyNewsWrite 의 textarea + 마크다운 입력을 대체
 * @decision react-quill v2 채택 (이미 dependency, SSR 비호환이라 dynamic import)
 * @note 이미지는 본문 커서 위치에 직접 삽입되며, 업로드는 /api/policy-news/upload-image 가 webp 변환
 */

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="policy-news-editor-loading">에디터를 불러오는 중...</div>,
});

const FONT_SIZES = ['14px', '16px', '17px', '19px', '22px', '28px', '32px'];

interface PolicyNewsEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

export default function PolicyNewsEditor({
  value,
  onChange,
  placeholder = '본문을 입력하세요. 본문 중간에 이미지를 끼워 넣으려면 도구바의 이미지 버튼을 누르세요.',
  hasError = false,
}: PolicyNewsEditorProps) {
  const quillRef = useRef<any>(null);

  /**
   * Quill 모듈 정의 (도구바 + 이미지 업로드 핸들러)
   *
   * @purpose 와이어 도구바 14항목 매칭
   * @decision useMemo 로 모듈 객체를 한 번만 생성 (Quill 인스턴스 재생성 방지)
   */
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [false, 2, 3, 4] }],
          [{ size: FONT_SIZES }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ align: [] }, { align: 'center' }, { align: 'right' }, { align: 'justify' }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote'],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: {
          /**
           * 이미지 업로드 핸들러
           *
           * @purpose 파일 선택 → R2 업로드 (webp 변환) → 본문 커서 위치에 삽입
           * @decision Quill 기본 image 핸들러는 base64 inline 삽입이라 DB 용량 폭증 → 항상 R2 업로드 경유
           */
          image: () => {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('accept', 'image/*');
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;

              if (file.size > 3 * 1024 * 1024) {
                alert('이미지 파일 크기는 3MB 이하여야 합니다.');
                return;
              }

              const quill = quillRef.current?.getEditor();
              if (!quill) return;

              const range = quill.getSelection(true);
              const placeholderText = '[이미지 업로드 중...]';
              quill.insertText(range.index, placeholderText, 'italic', true);
              quill.setSelection(range.index + placeholderText.length, 0);

              try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/policy-news/upload-image', {
                  method: 'POST',
                  body: formData,
                });

                // 플레이스홀더 제거
                quill.deleteText(range.index, placeholderText.length);

                if (!response.ok) {
                  const err = await response.json().catch(() => ({}));
                  throw new Error(err.message || '이미지 업로드 실패');
                }

                const data = await response.json();
                if (!data.url) throw new Error('업로드 응답에 URL 없음');

                quill.insertEmbed(range.index, 'image', data.url, 'user');
                quill.setSelection(range.index + 1, 0);
              } catch (error) {
                console.error('[PolicyNewsEditor] image upload failed:', error);
                alert(
                  error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.'
                );
              }
            };
            input.click();
          },
        },
      },
      clipboard: {
        // base64 paste 차단 (Word/HWP 붙여넣기 시 용량 폭증 방지)
        matchVisual: false,
      },
    }),
    []
  );

  const formats = useMemo(
    () => [
      'header',
      'size',
      'bold',
      'italic',
      'underline',
      'strike',
      'color',
      'background',
      'align',
      'list',
      'bullet',
      'blockquote',
      'link',
      'image',
    ],
    []
  );

  /**
   * Quill attributor 등록
   *
   * @purpose
   *   1) Size: px 단위 사용 (기본 small/normal/large/huge → px 직접 지정)
   *   2) Align: 인라인 style 방식 (기본 class .ql-align-* → style="text-align:...")
   *      → detail/미리보기 페이지의 CSS specificity 문제 회피, 어디서나 정렬 100% 적용 보장
   * @note Direction/Indent 등 다른 정렬 관련 attributor는 사용 안 함
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const Quill = (await import('react-quill')).default.Quill;
      if (!mounted) return;

      // 폰트 크기 — style attributor + px whitelist
      const Size = Quill.import('attributors/style/size');
      Size.whitelist = FONT_SIZES;
      Quill.register(Size, true);

      // 정렬 — style attributor (HTML 출력: style="text-align: center" 등)
      const Align = Quill.import('attributors/style/align');
      Quill.register(Align, true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={`policy-news-editor${hasError ? ' has-error' : ''}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
