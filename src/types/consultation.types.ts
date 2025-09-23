// 상담 관련 타입 정의

// 상담 신청 경로
export enum ConsultationSource {
  WEB_FORM = 'web_form',           // 웹사이트 신청폼
  ADMIN_DIRECT = 'admin_direct',   // 관리자 직접 입력
  PHONE_INQUIRY = 'phone_inquiry', // 전화 문의
  REFERRAL = 'referral'            // 추천
}

// 고객 유형
export enum CustomerType {
  MEMBER = 'member',               // 회원
  NON_MEMBER = 'non_member'        // 비회원 (관리자 직접 입력)
}

// 상담 상태
export enum ConsultationStatus {
  PENDING = 'pending',           // 접수 대기
  ASSIGNED = 'assigned',         // 담당자 배정됨
  IN_PROGRESS = 'in_progress',   // 상담 진행중
  CONTRACTED = 'contracted',     // 계약 체결됨
  COMPLETED = 'completed',       // 상담 완료
  CANCELLED = 'cancelled'        // 취소됨
}

// 상담 단계
export enum ConsultationPhase {
  PHONE = 'phone',               // 1차 통화상담
  MEETING = 'meeting',           // 2차 대면상담
  CONTRACT = 'contract',         // 계약 체결
  HAPPY_CALL = 'happy_call'      // 3차 해피콜
}

// 통화 결과
export enum CallResult {
  SUCCESS = 'success',           // 통화 성공
  NO_ANSWER = 'no_answer',       // 부재
  BUSY = 'busy',                 // 통화중
  REJECTED = 'rejected',         // 거절
  RESCHEDULED = 'rescheduled'   // 일정 재조정
}

// 메모 타입
export enum MemoType {
  PHONE_CONSULTATION = 'phone_consultation',       // 통화상담
  MEETING_CONSULTATION = 'meeting_consultation',   // 대면상담
  FOLLOW_UP = 'follow_up',                        // 후속 진행건
  CONTRACT = 'contract'                           // 계약
}

// 담당자 역할
export enum StaffRole {
  AUDITOR = 'auditor',           // 기업심사관
  ADMIN = 'admin',               // 관리자
  SUPER_ADMIN = 'super_admin'    // 최고 관리자
}

// 계약 정보
export interface ContractInfo {
  id: string;
  consultationId: string;
  contractNumber: string;         // 계약번호
  contractDate: Date;            // 계약일
  contractAmount: number;         // 계약금액
  contractType: string;          // 계약 유형
  paymentMethod: string;         // 결제 방법
  startDate: Date;               // 서비스 시작일
  endDate?: Date;                // 서비스 종료일
  isActive: boolean;             // 계약 유효 여부
  attachments?: string[];        // 계약서 첨부파일
  signedBy: string;              // 계약 체결 담당자
  createdAt: Date;
  updatedAt: Date;
}

// 고객관리 카드 (기업심사관용)
export interface CustomerCard {
  id: string;
  consultationId?: string;         // 상담 신청 ID (웹폼 신청인 경우)
  customerType: CustomerType;      // 고객 유형 (회원/비회원)
  customerId?: string;             // 고객 ID (회원인 경우)
  source: ConsultationSource;      // 유입 경로

  // 고객 정보
  customerName: string;            // 고객명
  companyName: string;             // 회사명
  businessNumber: string;          // 사업자번호
  phoneNumber: string;             // 연락처
  email: string;                   // 이메일
  address?: string;                // 주소
  businessType?: string;           // 업종
  employeeCount?: number;          // 직원수
  annualRevenue?: number;          // 연매출

  // 담당자 정보
  assignedStaffId: string;         // 담당 기업심사관 ID
  assignedStaffName: string;       // 담당 기업심사관 이름
  assignedBy: string;              // 배정한 관리자 ID
  assignedByName: string;          // 배정한 관리자 이름
  assignedAt: Date;                // 배정 일시

  // 상담 상태
  currentPhase: ConsultationPhase; // 현재 단계
  status: ConsultationStatus;      // 상태

  // 계약 정보
  contractInfo?: ContractInfo;     // 계약 정보
  hasContract: boolean;            // 계약 체결 여부

  // 메모 리스트
  memos: CustomerMemo[];           // 고객 관리 메모

  // 일정
  nextScheduledDate?: Date;        // 다음 예정일
  lastContactDate?: Date;          // 마지막 연락일

  // 관리자 메모 (최초 전달 시)
  adminInitialNote?: string;       // 관리자 초기 전달 메모

  createdAt: Date;
  updatedAt: Date;
}

// 고객 관리 메모
export interface CustomerMemo {
  id: string;
  customerCardId: string;
  type: MemoType;                  // 메모 타입
  title: string;                   // 제목
  content: string;                 // 내용
  date: Date;                      // 작성일
  staffId: string;                 // 작성자 ID
  staffName: string;               // 작성자 이름
  staffRole: StaffRole;            // 작성자 역할

  // 통화상담 관련
  callDuration?: number;           // 통화 시간(분)
  callResult?: CallResult;         // 통화 결과

  // 대면상담 관련
  meetingLocation?: string;        // 미팅 장소
  meetingDuration?: number;        // 미팅 시간(분)
  attendees?: string[];            // 참석자

  // 계약 관련
  contractChecked?: boolean;       // 계약 체결 체크
  contractAmount?: number;         // 계약 금액

  // 후속 조치
  followUpRequired?: boolean;      // 후속 조치 필요 여부
  followUpDate?: Date;             // 후속 조치 예정일
  followUpNotes?: string;          // 후속 조치 내용

  attachments?: string[];          // 첨부파일
  createdAt: Date;
  updatedAt: Date;
}

// 상담 신청 정보 (웹폼 신청)
export interface ConsultationRequest {
  id: string;
  source: ConsultationSource;      // 신청 경로
  customerType: CustomerType;      // 고객 유형

  // 신청자 정보
  userId?: string;                 // 신청자 ID (회원인 경우)
  userName: string;                // 신청자 이름
  userEmail: string;               // 신청자 이메일
  userPhone: string;               // 신청자 연락처
  companyName: string;             // 회사명
  businessNumber: string;          // 사업자번호

  // 상담 정보
  consultationType: string;        // 상담 유형
  message: string;                 // 상담 내용
  preferredDate?: Date;            // 희망 일자
  preferredTime?: string;          // 희망 시간

  // 상태 정보
  status: ConsultationStatus;      // 상태
  currentPhase?: ConsultationPhase; // 현재 단계
  assignedStaffId?: string;        // 배정된 담당자 ID
  assignedStaffName?: string;      // 배정된 담당자 이름
  assignedAt?: Date;               // 배정 일시
  customerCardId?: string;         // 고객관리카드 ID

  createdAt: Date;                 // 신청 일시
  updatedAt: Date;                 // 수정 일시
}

// 관리자 직접 고객카드 생성 요청
export interface DirectCustomerCardRequest {
  // 고객 정보
  customerName: string;
  companyName: string;
  businessNumber: string;
  phoneNumber: string;
  email: string;
  address?: string;
  businessType?: string;
  employeeCount?: number;
  annualRevenue?: number;

  // 상담 정보
  consultationType?: string;
  message?: string;

  // 배정 정보
  assignToStaffId: string;         // 배정할 기업심사관 ID
  adminNote?: string;              // 관리자 전달 메모

  // 일정
  scheduledDate?: Date;            // 첫 상담 예정일
}

// 상담 기록
export interface ConsultationRecord {
  id: string;
  consultationId?: string;         // 상담 신청 ID (웹폼인 경우)
  customerCardId: string;          // 고객관리카드 ID
  staffId: string;                 // 담당자 ID
  staffName: string;               // 담당자 이름
  staffRole: StaffRole;            // 담당자 역할
  phase: ConsultationPhase;        // 상담 단계
  scheduledDate?: Date;            // 예정일
  contactedAt?: Date;              // 실제 연락 일시
  callResult?: CallResult;         // 통화 결과
  duration?: number;               // 상담 시간(분)
  summary?: string;                // 상담 요약 (고객 표시용)
  internalNotes?: string;          // 내부 메모 (관리자용)
  nextAction?: string;             // 다음 액션
  nextScheduledDate?: Date;        // 다음 예정일

  // 계약 체결 정보
  contractChecked?: boolean;       // 계약 체결 체크
  contractId?: string;             // 계약 ID

  attachments?: string[];          // 첨부 파일
  createdAt: Date;                 // 기록 생성일
  updatedAt: Date;                 // 기록 수정일
}

// 상담 히스토리 (사용자에게 보여줄 정보 - 회원만)
export interface ConsultationHistory {
  id: string;
  consultationId: string;
  phase: ConsultationPhase;
  phaseLabel: string;              // "1차 통화상담" 등
  status: string;                  // "진행중", "완료" 등
  staffName: string;               // 담당자명
  scheduledDate?: Date;            // 예정일
  completedDate?: Date;            // 완료일
  message?: string;                // 사용자에게 전달할 메시지
  isCompleted: boolean;            // 완료 여부
  hasContract?: boolean;           // 계약 체결 여부
}

// 담당자 통계
export interface StaffStats {
  staffId: string;
  staffName: string;
  role: StaffRole;

  // 상담 건수
  totalConsultations: number;      // 총 상담 건수
  activeConsultations: number;     // 진행중인 상담
  completedConsultations: number;  // 완료된 상담
  contractedCount: number;         // 계약 체결 건수

  // 고객 유형별
  memberCustomers: number;         // 회원 고객
  nonMemberCustomers: number;      // 비회원 고객

  // 일정
  todayScheduled: number;          // 오늘 예정된 상담
  weekScheduled: number;           // 이번주 예정 상담

  // 성과 지표
  successRate: number;             // 성공률 (%)
  contractRate: number;            // 계약 체결률 (%)
  averageResponseTime: number;     // 평균 응답 시간(시간)
  averageClosingDays: number;      // 평균 계약 소요일
}

// 상담 필터
export interface ConsultationFilter {
  status?: ConsultationStatus;
  phase?: ConsultationPhase;
  source?: ConsultationSource;
  customerType?: CustomerType;
  staffId?: string;
  hasContract?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

// 대시보드 데이터
export interface ConsultationDashboard {
  // 전체 통계
  totalRequests: number;           // 총 신청 건수
  totalCustomerCards: number;      // 총 고객카드 수

  // 경로별 통계
  webFormRequests: number;         // 웹폼 신청
  adminDirectCards: number;        // 관리자 직접 생성

  // 상태별 통계
  pendingAssignment: number;       // 배정 대기
  inProgress: number;              // 진행중
  contracted: number;              // 계약 체결

  // 기간별 통계
  completedToday: number;          // 오늘 완료
  completedThisWeek: number;       // 이번주 완료
  completedThisMonth: number;      // 이번달 완료
  totalContracts: number;          // 총 계약 건수
  contractsThisMonth: number;      // 이번달 계약

  // 담당자별 실적
  staffPerformance: StaffStats[]; // 담당자별 실적
}

// 알림 설정
export interface NotificationSettings {
  emailEnabled: boolean;           // 이메일 알림
  smsEnabled: boolean;             // SMS 알림
  newAssignment: boolean;          // 새 배정 알림
  scheduleReminder: boolean;       // 일정 리마인더
  statusChange: boolean;           // 상태 변경 알림
  contractAlert: boolean;          // 계약 체결 알림
}

// 상담 배정 요청
export interface AssignmentRequest {
  consultationId?: string;         // 상담 ID (웹폼인 경우)
  customerCardId?: string;         // 고객카드 ID
  staffId: string;                 // 배정할 담당자 ID
  notes?: string;                  // 배정 메모
  scheduledDate?: Date;            // 첫 상담 예정일
}

// 상담 업데이트 요청
export interface ConsultationUpdate {
  status?: ConsultationStatus;
  phase?: ConsultationPhase;
  scheduledDate?: Date;
  callResult?: CallResult;
  summary?: string;
  internalNotes?: string;
  nextAction?: string;
  contractChecked?: boolean;       // 계약 체결 체크
  contractInfo?: Partial<ContractInfo>; // 계약 정보
}

// 상담 단계별 라벨
export const PHASE_LABELS: Record<ConsultationPhase, string> = {
  [ConsultationPhase.PHONE]: '1차 통화상담',
  [ConsultationPhase.MEETING]: '2차 대면상담',
  [ConsultationPhase.CONTRACT]: '계약 체결',
  [ConsultationPhase.HAPPY_CALL]: '3차 해피콜'
};

// 상담 상태 라벨
export const STATUS_LABELS: Record<ConsultationStatus, string> = {
  [ConsultationStatus.PENDING]: '접수 대기',
  [ConsultationStatus.ASSIGNED]: '담당자 배정',
  [ConsultationStatus.IN_PROGRESS]: '진행중',
  [ConsultationStatus.CONTRACTED]: '계약 체결',
  [ConsultationStatus.COMPLETED]: '완료',
  [ConsultationStatus.CANCELLED]: '취소'
};

// 메모 타입 라벨
export const MEMO_TYPE_LABELS: Record<MemoType, string> = {
  [MemoType.PHONE_CONSULTATION]: '통화상담',
  [MemoType.MEETING_CONSULTATION]: '대면상담',
  [MemoType.FOLLOW_UP]: '후속 진행건',
  [MemoType.CONTRACT]: '계약'
};

// 고객 유형 라벨
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  [CustomerType.MEMBER]: '회원',
  [CustomerType.NON_MEMBER]: '비회원'
};

// 신청 경로 라벨
export const SOURCE_LABELS: Record<ConsultationSource, string> = {
  [ConsultationSource.WEB_FORM]: '웹사이트 신청',
  [ConsultationSource.ADMIN_DIRECT]: '관리자 직접 입력',
  [ConsultationSource.PHONE_INQUIRY]: '전화 문의',
  [ConsultationSource.REFERRAL]: '추천'
};