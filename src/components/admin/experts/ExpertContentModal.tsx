'use client';

import { useEffect, useState } from 'react';

/**
 * 전문가 회사정보(콘텐츠) 통합 편집 모달
 *
 * @purpose Expert 도큐먼트의 회사소개·서비스·갤러리·경력·성공케이스를 한 모달에서 직접 편집
 * @context /admin/experts 의 카드별 "회사정보" 버튼이 본 모달 호출.
 *          이전 ExaminerBrandModal 은 ExpertExaminer.brandPage 매칭이라 잘못된 가정이었음.
 *          실제 detail 페이지(/expert-services/[id]) 가 Expert 컬렉션 자체의 필드를 사용하므로
 *          같은 도큐먼트를 PUT /api/experts 로 업데이트.
 * @decision
 *   - 좌측 섹션 메뉴 / 우측 폼 (Examiner 모달과 동일한 UX 패턴 유지)
 *   - 갤러리/카드 이미지 등 R2 업로드는 기존 /api/upload 재사용
 *   - 경력은 단순 string[] (Expert.career 가 string[] 구조)
 *   - 성공케이스는 Expert detail 의 SuccessCase 형식 {title, category, description, result, period}
 */

interface SuccessCase {
  title: string;
  category: string;
  description: string;
  result: string;
  period: string;
}

export interface ExpertContent {
  introduction?: string;
  detailedIntro?: string;
  services?: string[];
  career?: string[];
  successCases?: SuccessCase[];
  galleryImages?: string[];
  certifications?: string[];
}

interface ExpertContentModalProps {
  expertId: string | null;
  expertName: string;
  expertCompany?: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const SECTIONS = [
  { id: 'about', label: '회사소개 · 서비스' },
  { id: 'gallery', label: '정보(갤러리)' },
  { id: 'career', label: '경력' },
  { id: 'cases', label: '성공케이스' },
  { id: 'certs', label: '자격증' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

const EMPTY_CASE: SuccessCase = {
  title: '',
  category: '',
  description: '',
  result: '',
  period: '',
};

export default function ExpertContentModal({
  expertId,
  expertName,
  expertCompany,
  open,
  onClose,
  onSaved,
}: ExpertContentModalProps) {
  const [content, setContent] = useState<ExpertContent>({});
  const [activeSection, setActiveSection] = useState<SectionId>('about');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  /**
   * 모달 열릴 때 Expert 도큐먼트 fetch
   * @endpoint GET /api/experts/[id] — Expert collection 직접 read
   */
  useEffect(() => {
    if (!open || !expertId) return;

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/experts/${expertId}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('전문가 정보를 불러오지 못했습니다.');
        const data = await response.json();
        if (cancelled) return;
        const e = data.expert || {};
        setContent({
          introduction: e.introduction || '',
          detailedIntro: e.detailedIntro || '',
          services: Array.isArray(e.services) ? e.services : [],
          career: Array.isArray(e.career) ? e.career : [],
          successCases: Array.isArray(e.successCases) ? e.successCases : [],
          galleryImages: Array.isArray(e.galleryImages) ? e.galleryImages : [],
          certifications: Array.isArray(e.certifications) ? e.certifications : [],
        });
      } catch (err) {
        if (!cancelled) {
          console.error('[ExpertContentModal] load failed:', err);
          setError('전문가 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, expertId]);

  if (!open) return null;

  /**
   * 회사정보 일괄 저장 (PUT /api/experts)
   * @decision Expert 도큐먼트의 콘텐츠 필드만 보내고 메타(name/email 등)는 건드리지 않음
   */
  const handleSave = async () => {
    if (!expertId) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/experts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: expertId,
          introduction: content.introduction || '',
          detailedIntro: content.detailedIntro || '',
          services: content.services || [],
          career: content.career || [],
          successCases: content.successCases || [],
          galleryImages: content.galleryImages || [],
          certifications: content.certifications || [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || '저장 실패');
      }
      alert('회사정보가 저장되었습니다.');
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('[ExpertContentModal] save failed:', err);
      alert(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  /** 갤러리 이미지 업로드 (다중 가능) */
  const handleGalleryUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (d.success && d.url) uploaded.push(d.url);
      }
      setContent((prev) => ({
        ...prev,
        galleryImages: [...(prev.galleryImages || []), ...uploaded],
      }));
    } catch (err) {
      console.error('[ExpertContentModal] gallery upload failed:', err);
      alert('갤러리 이미지 업로드 실패');
    } finally {
      setIsUploading(false);
    }
  };

  /* ===== 섹션 렌더 ===== */
  const renderAbout = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="회사 소개 (메인)" hint="detail 페이지의 '회사소개' 탭 본문에 노출됩니다.">
        <textarea
          rows={4}
          value={content.introduction || ''}
          onChange={(e) => setContent((prev) => ({ ...prev, introduction: e.target.value }))}
          placeholder="회사의 핵심 소개를 2~3 문장으로 작성하세요."
          style={txt}
        />
      </Field>
      <Field label="상세 소개 (보조)" hint="메인 소개 아래 한 단락 더 추가 (선택)">
        <textarea
          rows={3}
          value={content.detailedIntro || ''}
          onChange={(e) => setContent((prev) => ({ ...prev, detailedIntro: e.target.value }))}
          style={txt}
        />
      </Field>
      <ListField
        label="핵심 서비스"
        hint="detail 페이지 '회사소개' 탭의 핵심 서비스 목록"
        values={content.services || []}
        onChange={(arr) => setContent((prev) => ({ ...prev, services: arr }))}
        placeholder="예: 정책자금 신청 컨설팅"
      />
    </div>
  );

  const renderGallery = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={hint}>detail 페이지의 '정보' 탭에 그리드로 표시됩니다.</div>
      <label
        style={{
          display: 'block',
          padding: '24px',
          border: '2px dashed #cbd5e1',
          borderRadius: 10,
          textAlign: 'center',
          cursor: 'pointer',
          background: '#f8fafc',
          color: '#475569',
          fontSize: 13,
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handleGalleryUpload(e.target.files)}
          style={{ display: 'none' }}
        />
        {isUploading ? '업로드 중...' : '클릭 또는 드래그로 이미지 선택 (여러 장)'}
      </label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {(content.galleryImages || []).map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
            }}
          >
            <img
              src={url}
              alt={`gallery ${idx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              type="button"
              onClick={() =>
                setContent((prev) => ({
                  ...prev,
                  galleryImages: (prev.galleryImages || []).filter((_, i) => i !== idx),
                }))
              }
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                lineHeight: 1,
              }}
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCareer = () => (
    <ListField
      label="경력"
      hint="detail 페이지 '경력' 탭에 타임라인으로 표시됩니다. 연도(예: 2020년)를 줄 앞에 적으면 자동 추출됩니다."
      values={content.career || []}
      onChange={(arr) => setContent((prev) => ({ ...prev, career: arr }))}
      placeholder="예: 2020년 ○○ 컨설팅 팀장"
    />
  );

  const renderCases = () => {
    const cases = content.successCases || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={hint}>detail 페이지 '성공케이스' 탭에 카드로 표시됩니다.</div>
          <button
            type="button"
            onClick={() =>
              setContent((prev) => ({
                ...prev,
                successCases: [...(prev.successCases || []), { ...EMPTY_CASE }],
              }))
            }
            style={{ ...btnSecondary, padding: '6px 10px' }}
          >
            + 케이스 추가
          </button>
        </div>
        {cases.length === 0 && <div style={{ ...emptyBox }}>등록된 성공케이스가 없습니다.</div>}
        {cases.map((c, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <div
              style={{
                gridColumn: 'span 2',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <strong style={{ fontSize: 12, color: '#475569' }}>케이스 #{idx + 1}</strong>
              <button
                type="button"
                style={{ ...btnSecondary, color: '#b91c1c', borderColor: '#fecaca' }}
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    successCases: (prev.successCases || []).filter((_, i) => i !== idx),
                  }))
                }
              >
                삭제
              </button>
            </div>
            <Field label="제목">
              <input
                value={c.title}
                onChange={(e) => updateCase(idx, 'title', e.target.value)}
                style={inp}
              />
            </Field>
            <Field label="카테고리">
              <input
                value={c.category}
                onChange={(e) => updateCase(idx, 'category', e.target.value)}
                placeholder="예: 정책자금"
                style={inp}
              />
            </Field>
            <Field label="설명" wide>
              <textarea
                rows={2}
                value={c.description}
                onChange={(e) => updateCase(idx, 'description', e.target.value)}
                style={txt}
              />
            </Field>
            <Field label="성과">
              <input
                value={c.result}
                onChange={(e) => updateCase(idx, 'result', e.target.value)}
                placeholder="예: 5억 원 자금 확보"
                style={inp}
              />
            </Field>
            <Field label="기간">
              <input
                value={c.period}
                onChange={(e) => updateCase(idx, 'period', e.target.value)}
                placeholder="예: 2024.03 - 2024.06"
                style={inp}
              />
            </Field>
          </div>
        ))}
      </div>
    );
  };

  const updateCase = (idx: number, key: keyof SuccessCase, value: string) => {
    setContent((prev) => {
      const next = [...(prev.successCases || [])];
      next[idx] = { ...next[idx], [key]: value };
      return { ...prev, successCases: next };
    });
  };

  const renderCerts = () => (
    <ListField
      label="자격증"
      hint="자격증/인증 목록 (선택)"
      values={content.certifications || []}
      onChange={(arr) => setContent((prev) => ({ ...prev, certifications: arr }))}
      placeholder="예: 경영지도사, 세무사"
    />
  );

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={modalHead}>
          <div>
            <div style={{ fontSize: 11, color: '#047857', fontWeight: 700 }}>
              회사정보 편집 (Expert content)
            </div>
            <h2 style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 800 }}>
              {expertName}
              {expertCompany && (
                <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b', marginLeft: 8 }}>
                  · {expertCompany}
                </span>
              )}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>
              취소
            </button>
            <button
              type="button"
              disabled={!expertId || isSaving || isLoading}
              onClick={handleSave}
              style={{ ...btnPrimary, opacity: !expertId || isSaving || isLoading ? 0.6 : 1 }}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '180px 1fr', flex: 1, overflow: 'hidden' }}
        >
          <aside style={sideMenu}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '0.08em',
                padding: '0 12px 8px',
              }}
            >
              EDIT SECTIONS
            </div>
            {SECTIONS.map((s) => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: active ? '#ecfdf5' : 'transparent',
                    color: active ? '#047857' : '#475569',
                    fontWeight: active ? 700 : 500,
                    border: 'none',
                    borderLeft: active ? '2px solid #16a34a' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </aside>

          <div style={{ padding: 20, overflowY: 'auto' }}>
            {error && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '8px 12px',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                불러오는 중...
              </div>
            ) : (
              <>
                {activeSection === 'about' && renderAbout()}
                {activeSection === 'gallery' && renderGallery()}
                {activeSection === 'career' && renderCareer()}
                {activeSection === 'cases' && renderCases()}
                {activeSection === 'certs' && renderCerts()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== 헬퍼 컴포넌트 ===== */
function Field({
  label,
  hint,
  children,
  wide,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        gridColumn: wide ? 'span 2' : 'auto',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</span>}
      {children}
    </label>
  );
}

function ListField({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{label}</div>
          {hint && <div style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</div>}
        </div>
        <button
          type="button"
          onClick={() => onChange([...values, ''])}
          style={{ ...btnSecondary, padding: '4px 8px' }}
        >
          + 추가
        </button>
      </div>
      {values.length === 0 && <div style={emptyBox}>등록된 항목이 없습니다.</div>}
      {values.map((v, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 6 }}>
          <input
            value={v}
            onChange={(e) => {
              const next = [...values];
              next[idx] = e.target.value;
              onChange(next);
            }}
            placeholder={placeholder}
            style={{ ...inp, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, i) => i !== idx))}
            style={{ ...btnSecondary, color: '#b91c1c', borderColor: '#fecaca' }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/* ===== 인라인 스타일 토큰 ===== */
const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 1000,
};
const modal: React.CSSProperties = {
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  width: '100%',
  maxWidth: 880,
  maxHeight: '92vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};
const modalHead: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 18px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f8fafc',
};
const sideMenu: React.CSSProperties = {
  borderRight: '1px solid #e5e7eb',
  background: '#f8fafc',
  padding: '12px 0',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
};
const btnPrimary: React.CSSProperties = {
  height: 34,
  padding: '0 16px',
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  height: 30,
  padding: '0 12px',
  background: '#fff',
  color: '#475569',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
const inp: React.CSSProperties = {
  width: '100%',
  height: 34,
  padding: '0 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 13,
  outline: 'none',
};
const txt: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
  resize: 'vertical',
};
const hint: React.CSSProperties = { fontSize: 11, color: '#94a3b8' };
const emptyBox: React.CSSProperties = {
  padding: '12px 14px',
  background: '#f8fafc',
  border: '1px dashed #cbd5e1',
  borderRadius: 6,
  fontSize: 12,
  color: '#94a3b8',
  textAlign: 'center',
};
