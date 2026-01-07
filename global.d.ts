/**
 * Google Analytics gtag.js 타입 선언
 * GA4 이벤트 추적을 위한 전역 타입 정의
 */

interface GtagEventParams {
  event_category?: string;
  event_label?: string;
  form_name?: string;
  page_path?: string;
  page_title?: string;
  value?: number;
  currency?: string;
  [key: string]: string | number | boolean | undefined;
}

interface Window {
  gtag: (
    command: 'event' | 'config' | 'js' | 'set',
    targetId: string | Date,
    params?: GtagEventParams | { [key: string]: unknown }
  ) => void;
  dataLayer: unknown[];
}
