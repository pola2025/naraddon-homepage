/**
 * 분석 및 전환 추적 라이브러리
 *
 * @purpose 사용자 행동 및 전환 이벤트를 추적하여 마케팅 분석 데이터 수집
 * @context 전환 퍼널, 캠페인 성과, 사용자 여정 분석에 사용
 */

/**
 * 전환 이벤트 타입
 */
export type ConversionType =
  | 'page_view'           // 페이지 조회
  | 'consultation_start'  // 상담신청 시작 (페이지 진입)
  | 'consultation_submit' // 상담신청 완료
  | 'signup'              // 회원가입
  | 'video_watch'         // 나라돈 튜브 영상 시청 (30초 이상)
  | 'policy_view'         // 정책분석 조회
  | 'policy_download'     // 정책 자료 다운로드
  | 'expert_view'         // 전문가 프로필 조회
  | 'ttontok_post'        // 똔톡 게시글 작성
  | 'search'              // 검색 사용
  | 'newsletter_signup';  // 뉴스레터 구독

/**
 * 전환 이벤트 데이터
 */
export interface ConversionEvent {
  sessionId: string;
  userId?: string;
  conversionType: ConversionType;
  value?: number;        // 전환 가치 (원 단위)
  metadata?: {           // 추가 메타데이터
    [key: string]: any;
  };
  funnelStep?: string;   // 퍼널 단계 (예: 'step_1_landing')
  timestamp: Date;
}

/**
 * 전환 이벤트 추적
 *
 * @purpose 사용자의 전환 행동을 MongoDB에 저장
 * @context 비동기로 실행되며, 실패해도 사용자 경험에 영향 없음
 */
export async function trackConversion(
  conversionType: ConversionType,
  options: {
    sessionId?: string;
    userId?: string;
    value?: number;
    metadata?: { [key: string]: any };
    funnelStep?: string;
  } = {}
): Promise<boolean> {
  try {
    // 세션 ID 가져오기
    const sessionId = options.sessionId ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem('naraddon_session_id') || ''
        : '');

    if (!sessionId) {
      console.warn('[Analytics] No session ID found, skipping conversion tracking');
      return false;
    }

    const response = await fetch('/api/analytics/conversions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        userId: options.userId,
        conversionType,
        value: options.value,
        metadata: options.metadata,
        funnelStep: options.funnelStep,
        timestamp: new Date(),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Analytics] Conversion tracking failed:', error);
    return false;
  }
}

/**
 * 퍼널 단계 추적
 *
 * @purpose 전환 퍼널의 각 단계를 추적
 * @context 상담신청 퍼널: landing → form_start → form_submit → complete
 */
export async function trackFunnelStep(
  funnelName: string,
  stepName: string,
  metadata?: { [key: string]: any }
): Promise<boolean> {
  return trackConversion('page_view', {
    funnelStep: `${funnelName}_${stepName}`,
    metadata,
  });
}

/**
 * 사용자 여정 이벤트 추적
 *
 * @purpose 사용자의 페이지 이동 경로를 추적
 */
export async function trackUserJourney(
  fromPage: string,
  toPage: string,
  action?: string
): Promise<boolean> {
  return trackConversion('page_view', {
    metadata: {
      from: fromPage,
      to: toPage,
      action,
    },
  });
}

/**
 * 세션 ID 가져오기
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('naraddon_session_id') || '';
}

/**
 * 사용자 ID 설정
 */
export function setUserId(userId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('naraddon_user_id', userId);
}

/**
 * 사용자 ID 가져오기
 */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('naraddon_user_id');
}
