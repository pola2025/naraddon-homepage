'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import './PolicyNewsEditor.css';

/**
 * 정책소식 본문 에디터 (ReactQuill 래퍼)
 *
 * @purpose 와이어 ③ 사양 — 폰트 크기/정렬/이미지 업로드/인용/목록/색상/이미지 리사이즈
 * @context PolicyNewsWrite 의 textarea + 마크다운 입력을 대체
 * @decision react-quill v2 채택 (이미 dependency, SSR 비호환이라 dynamic import)
 * @note 이미지는 본문 커서 위치에 직접 삽입되며, 업로드는 /api/policy-news/upload-image 가 webp 변환
 *       quill-resize-image 모듈로 마우스 드래그 핸들 + 정렬 메뉴 제공
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
  // Quill 사용자 모듈(resize 등) 등록 완료 여부
  // @bug Quill 인스턴스 생성 시점에 'modules/resize' 가 아직 등록되지 않으면
  //      "moduleClass is not a constructor" 가 발생 (특히 수정 페이지에서 재현)
  // @fix 등록이 끝난 뒤에만 ReactQuill 을 마운트하여 레이스 제거
  const [isReady, setIsReady] = useState(false);

  /**
   * Quill 모듈 정의 (도구바 + 이미지 업로드 + 리사이즈)
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
           * @purpose 파일 선택 → R2 업로드(webp 변환) → 본문 커서 위치 삽입
           *          삽입 직후 width:100% 인라인 style 적용 (기본 콘텐츠 풀 폭)
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

                quill.deleteText(range.index, placeholderText.length);

                if (!response.ok) {
                  const err = await response.json().catch(() => ({}));
                  throw new Error(err.message || '이미지 업로드 실패');
                }

                const data = await response.json();
                if (!data.url) throw new Error('업로드 응답에 URL 없음');

                quill.insertEmbed(range.index, 'image', data.url, 'user');
                quill.setSelection(range.index + 1, 0);

                /**
                 * 삽입 직후 이미지 기본 크기 = 콘텐츠 폭 100% 강제
                 * @decision 기본은 풀폭, 사용자가 원하면 quill-resize-image 핸들로 축소
                 */
                requestAnimationFrame(() => {
                  const editorRoot = quill.root as HTMLElement;
                  const imgs = editorRoot.querySelectorAll(`img[src="${data.url}"]`);
                  imgs.forEach((img) => {
                    const el = img as HTMLImageElement;
                    if (!el.style.width) el.style.width = '100%';
                  });
                });
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
      /**
       * 이미지 리사이즈 — quill-resize-image
       * @purpose 본문 이미지 클릭 시 모서리 핸들로 크기 조정 + 정렬 메뉴 (가운데/왼쪽/오른쪽)
       */
      resize: {
        locale: {
          center: '가운데',
          left: '왼쪽',
          right: '오른쪽',
          floatLeft: '글자 감싸기 왼쪽',
          floatRight: '글자 감싸기 오른쪽',
          restore: '원래 크기',
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
      'width',
      'height',
      'style',
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
   *   3) Resize 모듈: quill-resize-image (이미지 크기 조정 핸들)
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ default: Quill }, ResizeModule] = await Promise.all([
        import('react-quill').then((m) => ({ default: m.default.Quill })),
        import('quill-resize-image').then((m) => m.default || m),
      ]);
      if (!mounted) return;

      // 폰트 크기 — style attributor + px whitelist
      const Size = Quill.import('attributors/style/size');
      Size.whitelist = FONT_SIZES;
      Quill.register(Size, true);

      // 정렬 — style attributor (HTML 출력: style="text-align: center" 등)
      const Align = Quill.import('attributors/style/align');
      Quill.register(Align, true);

      // 이미지 리사이즈 모듈 등록
      try {
        Quill.register('modules/resize', ResizeModule);
      } catch (err) {
        console.warn('[PolicyNewsEditor] resize module register skipped:', err);
      }

      if (mounted) setIsReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={`policy-news-editor${hasError ? ' has-error' : ''}`}>
      {isReady ? (
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      ) : (
        <div className="policy-news-editor-loading">에디터를 불러오는 중...</div>
      )}
    </div>
  );
}
