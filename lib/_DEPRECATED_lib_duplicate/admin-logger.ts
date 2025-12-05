// 관리자 활동 자동 로깅 유틸리티

import { AdminActionType, AdminLogSeverity } from '@/types/admin-log.types';

export class AdminLogger {
  private static sessionId: string | null = null;

  // 세션 ID 생성/관리
  static getSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }

  // 관리자 활동 로그 전송
  static async log(
    action: AdminActionType,
    description: string,
    details?: any,
    severity: AdminLogSeverity = AdminLogSeverity.INFO
  ) {
    try {
      const response = await fetch('/api/admin/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          description,
          details,
          severity,
          sessionId: this.getSessionId(),
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        console.error('Failed to log admin activity:', await response.text());
      }

      return response.json();
    } catch (error) {
      console.error('Error logging admin activity:', error);
    }
  }

  // 페이지 접근 로그
  static async logPageView(pagePath: string, pageTitle?: string) {
    return this.log(
      AdminActionType.VIEW_PAGE,
      `페이지 접근: ${pageTitle || pagePath}`,
      { pagePath, pageTitle }
    );
  }

  // 데이터 조회 로그
  static async logDataAccess(resource: string, resourceId?: string, action?: string) {
    return this.log(
      AdminActionType.VIEW_PAGE,
      `데이터 조회: ${resource}${resourceId ? ` (${resourceId})` : ''}`,
      { resource, resourceId, action }
    );
  }

  // 생성 작업 로그
  static async logCreate(resource: string, resourceId: string, data?: any) {
    return this.log(
      AdminActionType.CREATE,
      `생성: ${resource} (${resourceId})`,
      { resource, resourceId, data },
      AdminLogSeverity.INFO
    );
  }

  // 수정 작업 로그
  static async logUpdate(resource: string, resourceId: string, changes?: any) {
    return this.log(
      AdminActionType.UPDATE,
      `수정: ${resource} (${resourceId})`,
      { resource, resourceId, changes },
      AdminLogSeverity.INFO
    );
  }

  // 삭제 작업 로그
  static async logDelete(resource: string, resourceId: string, reason?: string) {
    return this.log(
      AdminActionType.DELETE,
      `삭제: ${resource} (${resourceId})`,
      { resource, resourceId, reason },
      AdminLogSeverity.WARNING
    );
  }

  // 역할 변경 로그
  static async logRoleChange(
    targetUser: string,
    fromRole: string,
    toRole: string,
    reason?: string
  ) {
    return this.log(
      AdminActionType.ROLE_CHANGE,
      `역할 변경: ${targetUser} (${fromRole} → ${toRole})`,
      { targetUser, fromRole, toRole, reason },
      AdminLogSeverity.CRITICAL
    );
  }

  // 설정 변경 로그
  static async logSettingsChange(setting: string, oldValue: any, newValue: any) {
    return this.log(
      AdminActionType.SETTINGS_CHANGE,
      `설정 변경: ${setting}`,
      { setting, oldValue, newValue },
      AdminLogSeverity.WARNING
    );
  }

  // 데이터 내보내기 로그
  static async logDataExport(dataType: string, recordCount: number, format: string) {
    return this.log(
      AdminActionType.DATA_EXPORT,
      `데이터 내보내기: ${dataType} (${recordCount}건, ${format})`,
      { dataType, recordCount, format },
      AdminLogSeverity.WARNING
    );
  }

  // 보안 이벤트 로그
  static async logSecurityEvent(eventType: string, details: any, severity = AdminLogSeverity.CRITICAL) {
    return this.log(
      AdminActionType.SYSTEM_CHANGE,
      `보안 이벤트: ${eventType}`,
      details,
      severity
    );
  }

  // 로그인 로그
  static async logLogin(provider: string) {
    return this.log(
      AdminActionType.LOGIN,
      `관리자 로그인 (${provider})`,
      { provider },
      AdminLogSeverity.INFO
    );
  }

  // 로그아웃 로그
  static async logLogout() {
    const result = await this.log(
      AdminActionType.LOGOUT,
      '관리자 로그아웃',
      { sessionDuration: Date.now() }
    );
    this.sessionId = null; // 세션 ID 초기화
    return result;
  }
}

// React Hook for admin logging
export function useAdminLogger() {
  return AdminLogger;
}