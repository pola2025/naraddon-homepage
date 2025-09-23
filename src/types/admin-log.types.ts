// 관리자 활동 로그 타입 정의

export enum AdminActionType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  VIEW_PAGE = 'view_page',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ROLE_CHANGE = 'role_change',
  SETTINGS_CHANGE = 'settings_change',
  USER_MANAGEMENT = 'user_management',
  DATA_EXPORT = 'data_export',
  SYSTEM_CHANGE = 'system_change'
}

export enum AdminLogSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

export interface AdminAccessLog {
  id?: string;

  // 관리자 정보
  adminId: string;
  adminEmail: string;
  adminName: string;
  adminRole: string;
  provider: string; // 로그인 제공자 (naver, kakao 등)

  // 활동 정보
  action: AdminActionType;
  description: string;
  details?: any; // 추가 상세 정보
  targetResource?: string; // 대상 리소스 (user, consultation 등)
  targetId?: string; // 대상 ID

  // IP 및 위치 정보
  ipAddress: string;
  previousIpAddress?: string; // 이전 IP (변경된 경우)
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };

  // 보안 정보
  severity: AdminLogSeverity;
  isNewIp?: boolean; // 새로운 IP에서 접속
  isNewDevice?: boolean; // 새로운 기기에서 접속
  sessionId?: string;

  // 시간 정보
  timestamp: Date;
  duration?: number; // 활동 소요 시간 (ms)
}

export interface AdminSession {
  id: string;
  adminId: string;
  adminEmail: string;

  // 세션 정보
  sessionToken: string;
  refreshToken?: string;

  // IP 정보
  ipAddress: string;
  ipHistory: {
    ip: string;
    timestamp: Date;
    location?: string;
  }[];

  // 기기 정보
  userAgent: string;
  deviceFingerprint?: string;

  // 시간 정보
  startedAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;

  // 상태
  isActive: boolean;
  terminatedReason?: string;
}

export interface AdminRoleUpgrade {
  id?: string;

  // 요청 정보
  userId: string;
  userEmail: string;
  userName: string;

  // 역할 변경
  fromRole: string;
  toRole: string;

  // 승인자 정보
  upgradedBy: string;
  upgradedByName: string;
  upgradedByEmail: string;

  // 사유 및 메모
  reason: string;
  notes?: string;

  // 권한 설정
  permissions?: string[]; // 부여할 권한 목록
  restrictions?: string[]; // 제한사항
  expiresAt?: Date; // 관리자 권한 만료일 (임시 승격인 경우)

  // IP 정보 (보안)
  requestIp: string;

  // 시간 정보
  requestedAt: Date;
  approvedAt: Date;

  // 상태
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface AdminActivitySummary {
  adminId: string;
  adminEmail: string;

  // 활동 통계
  totalActions: number;
  actionsByType: Record<AdminActionType, number>;

  // IP 통계
  uniqueIpCount: number;
  ipAddresses: string[];

  // 시간 통계
  firstActivity: Date;
  lastActivity: Date;
  totalActiveTime: number; // 총 활동 시간 (분)

  // 보안 이벤트
  suspiciousActivities: number;
  criticalActions: number;

  // 기간별 통계
  period: 'daily' | 'weekly' | 'monthly';
  date: Date;
}