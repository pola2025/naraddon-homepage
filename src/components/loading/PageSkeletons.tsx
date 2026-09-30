import './PageSkeletons.css';

/**
 * 페이지별 로딩 스켈레톤 4종 (메인 / 무료 심사 신청 / 인증심사관 / 사업자금 뉴스)
 *
 * @purpose 인덱스에서 메뉴를 누른 뒤 페이지가 준비될 때까지, 곧 나타날 화면과 같은 모양의 틀을 보여 준다
 * @context 2026-09-30 공통 회색 틀이 다른 페이지 모양이라 "깨진 화면"처럼 보인다는 지적으로 교체했다(제거가 아니라 모양 맞춤)
 * @note 각 app/<경로>/loading.tsx 에서 쓰고, 사업자금 뉴스는 페이지 자체 로딩 상태에서도 같은 틀을 쓴다
 */

const LOADING_LABEL = '페이지를 불러오는 중';

const Bone = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <span className={`nxs-b ${className}`} style={style} aria-hidden="true" />
);

export function HomeSkeleton() {
  return (
    <div className="nxs-root nxs-home" role="status" aria-label={LOADING_LABEL}>
      <div className="nxs-home-hero">
        <Bone className="nxs-home-l1" />
        <Bone className="nxs-home-l2" />
        <div className="nxs-home-btns">
          <Bone className="nxs-pill nxs-home-btn1" />
          <Bone className="nxs-pill nxs-home-btn2" />
        </div>
        <Bone className="nxs-home-ask" />
        <Bone className="nxs-pill nxs-home-search" />
      </div>
    </div>
  );
}

const CONSULT_FIELDS = 6;
const SUMMARY_LABEL_WIDTHS = [25, 37, 37, 25, 82, 37, 53, 41, 37, 25];

export function ConsultationSkeleton() {
  return (
    <div className="nxs-root nxs-consult" role="status" aria-label={LOADING_LABEL}>
      <div className="nxs-consult-layout">
        <div>
          <div className="nxs-card nxs-consult-progress">
            <div className="nxs-row">
              <Bone style={{ width: 70, height: 16 }} />
              <Bone style={{ width: 34, height: 16 }} />
            </div>
            <div className="nxs-track" />
            <div className="nxs-chips">
              <Bone className="nxs-pill nxs-chip-on" style={{ width: 80, height: 28 }} />
              <Bone className="nxs-pill nxs-line" style={{ width: 80, height: 28 }} />
              <Bone className="nxs-pill nxs-line" style={{ width: 115, height: 28 }} />
            </div>
          </div>
          <div className="nxs-card nxs-consult-form">
            <div className="nxs-form-head">
              <Bone className="nxs-circle" />
              <div>
                <Bone style={{ width: 90, height: 20 }} />
                <Bone style={{ width: 170, height: 13, marginTop: 8 }} />
              </div>
            </div>
            <Bone style={{ width: 140, height: 12, marginTop: 34 }} />
            <div className="nxs-form-grid">
              {Array.from({ length: CONSULT_FIELDS }, (_, i) => (
                <div key={i}>
                  <Bone className="nxs-field-label" />
                  <Bone className="nxs-field-input nxs-line" />
                </div>
              ))}
            </div>
            <div className="nxs-field-full">
              <Bone className="nxs-field-label" style={{ width: 90 }} />
              <Bone className="nxs-field-input nxs-line" />
            </div>
            <Bone className="nxs-pill nxs-next" />
          </div>
        </div>
        <div>
          <div className="nxs-card nxs-consult-summary">
            <Bone style={{ width: 70, height: 11 }} />
            <Bone style={{ width: 120, height: 20, marginTop: 15 }} />
            <div className="nxs-summary-rows">
              {SUMMARY_LABEL_WIDTHS.map((width, i) => (
                <div className="nxs-row" key={i}>
                  <Bone style={{ width, height: 14 }} />
                  <Bone className="nxs-value" />
                </div>
              ))}
            </div>
          </div>
          <div className="nxs-card nxs-consult-info">
            <Bone style={{ width: 60, height: 11 }} />
            <Bone style={{ width: 190, height: 22, marginTop: 24 }} />
            <Bone style={{ width: '92%', height: 12, marginTop: 32 }} />
            <Bone style={{ width: '76%', height: 12, marginTop: 10 }} />
            <Bone style={{ width: '82%', height: 12, marginTop: 38 }} />
            <Bone style={{ width: '82%', height: 12, marginTop: 12 }} />
            <Bone style={{ width: '70%', height: 12, marginTop: 12 }} />
            <Bone className="nxs-hours" />
          </div>
        </div>
      </div>
    </div>
  );
}

const EXAMINER_CARDS = 6;

export function ExaminersSkeleton() {
  return (
    <div className="nxs-root nxs-exam" role="status" aria-label={LOADING_LABEL}>
      <div className="nxs-exam-hero">
        <Bone className="nxs-pill nxs-exam-badge" />
        <Bone className="nxs-exam-l1" />
        <Bone className="nxs-exam-l2" />
        <Bone className="nxs-exam-l3" />
        <Bone className="nxs-exam-l4" />
        <Bone className="nxs-exam-sub1" />
        <Bone className="nxs-exam-sub2" />
      </div>
      <div className="nxs-exam-grid">
        {Array.from({ length: EXAMINER_CARDS }, (_, i) => (
          <div className="nxs-exam-card" key={i}>
            <Bone className="nxs-exam-name" />
            <Bone className="nxs-exam-company" />
          </div>
        ))}
      </div>
    </div>
  );
}

const NEWS_CARDS = 6;

export function PolicyNewsSkeleton() {
  return (
    <div className="nxs-root nxs-news" role="status" aria-label={LOADING_LABEL}>
      <div className="nxs-news-wrap">
        <div className="nxs-crumb">
          <Bone className="nxs-crumb-icon" />
          <Bone style={{ width: 50, height: 12 }} />
          <Bone style={{ width: 64, height: 12 }} />
        </div>
        <div className="nxs-news-title">
          <Bone className="nxs-news-icon" />
          <Bone className="nxs-news-heading" />
        </div>
        <div className="nxs-divider" />
        <div className="nxs-filters">
          {[1, 2, 3, 4].map((n) => (
            <Bone key={n} className={`nxs-pill nxs-f${n} ${n === 1 ? 'nxs-filter-on' : 'nxs-line'}`} />
          ))}
        </div>
        <Bone className="nxs-count" />
        <div className="nxs-news-grid">
          {Array.from({ length: NEWS_CARDS }, (_, i) => (
            <div className="nxs-news-card" key={i}>
              <Bone className="nxs-news-thumb" />
              <div className="nxs-news-body">
                <Bone style={{ width: 50, height: 16 }} />
                <Bone style={{ width: '70%', height: 18, marginTop: 12 }} />
                <Bone style={{ width: 90, height: 12, marginTop: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
