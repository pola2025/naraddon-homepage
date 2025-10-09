// 회원 타입 정의

export enum UserRole {
  ADMIN = 'admin',           // 관리자
  EXAMINER = 'examiner',     // 기업심사관
  EXPERT = 'expert',         // 전문가
  USER = 'user'             // 일반 회원 (기업회원 포함)
}

export enum UserStatus {
  ACTIVE = 'active',         // 활성
  INACTIVE = 'inactive',     // 비활성
  SUSPENDED = 'suspended',   // 정지
  PENDING = 'pending'        // 승인 대기
}

export enum LoginProvider {
  GOOGLE = 'google',
  NAVER = 'naver',
  KAKAO = 'kakao',
  EMAIL = 'email'
}

export interface User {
  id: string;
  email: string;
  name: string;
  mobile?: string;  // 네이버 OAuth에서 받은 전화번호
  role: UserRole;
  status: UserStatus;
  provider: LoginProvider;
  providerId?: string;

  // 프로필 정보
  profile: UserProfile;

  // 프로필 완성도
  profileComplete?: boolean;   // 모든 필수 정보 입력 완료 여부

  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;

  // 권한 관련
  permissions?: Permission[];

  // 승격 관련
  roleHistory?: RoleChange[];
}

export interface UserProfile {
  avatar?: string;
  phone?: string;

  // 필수 입력 정보
  nickname?: string;           // 닉네임 (필수)
  company?: string;            // 상호명 (필수)
  businessNumber?: string;     // 사업자 번호 (필수)
  businessAddress?: string;    // 사업장 소재지 (필수)
  businessVerified?: boolean;  // 사업자 번호 검증 여부

  position?: string;
  department?: string;
  introduction?: string;       // 자기소개

  // 전문가/심사관 전용 필드
  specialty?: string[];        // 전문 분야
  certifications?: string[];   // 자격증
  experience?: number;         // 경력 년수
  rating?: number;            // 평점

  // 소셜 링크
  linkedin?: string;
  website?: string;

  // 주소 정보
  address?: {
    zipCode?: string;
    address1?: string;
    address2?: string;
  };
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface RoleChange {
  fromRole: UserRole;
  toRole: UserRole;
  changedBy: string;        // 변경한 관리자 ID
  changedAt: Date;
  reason?: string;          // 변경 사유
}

// 회원 승격 요청
export interface RoleUpgradeRequest {
  userId: string;
  currentRole: UserRole;
  requestedRole: UserRole;
  reason: string;
  documents?: string[];     // 증빙 서류
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNote?: string;
}

// 사업자 번호 검증 응답
export interface BusinessVerification {
  valid: boolean;
  businessNumber: string;
  companyName?: string;
  representativeName?: string;
  businessAddress?: string;
  businessType?: string;
  businessStatus?: string;
  message?: string;
}

// 프로필 완성도 체크
export function isProfileComplete(profile: UserProfile): boolean {
  // 닉네임과 회사명만 필수
  // 사업자 정보는 선택사항 (예비창업회원 고려)
  return Boolean(
    profile.nickname &&
    profile.company
  );
}