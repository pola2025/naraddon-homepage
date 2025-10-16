/**
 * RBAC Audit Log System
 *
 * @purpose 역할 변경에 대한 불변 감사 로그 기록
 * @security 누가, 언제, 무엇을, 왜 변경했는지 추적
 * @compliance GDPR, ISO27001 등 규정 준수
 */

import { ClientSession } from 'mongodb';
import clientPromise from '@/lib/mongodb-client';
import mongoose from 'mongoose';

/**
 * Audit 로그 액션 타입
 */
export type AuditAction =
  | 'role_change'    // 역할 변경
  | 'role_add'       // 역할 추가
  | 'role_remove'    // 역할 제거
  | 'permission_deny' // 권한 거부 (보안 이벤트)
  | 'cache_invalidate' // 캐시 무효화
  | 'bulk_invalidate'; // 대량 캐시 무효화

/**
 * Audit 로그 항목
 */
export interface AuditLogEntry {
  action: AuditAction;
  userId: string; // 작업을 수행한 사용자 (관리자)
  targetUserId?: string; // 작업 대상 사용자
  targetEmail?: string; // 작업 대상 이메일
  ipAddress?: string; // 요청 IP 주소
  userAgent?: string; // 요청 User-Agent
  details: Record<string, any>; // 추가 상세 정보
  timestamp: Date;
}

/**
 * Audit 로그 생성 옵션
 */
interface CreateAuditLogOptions {
  session?: ClientSession; // MongoDB 트랜잭션 세션
}

/**
 * Audit 로그 기록
 *
 * @purpose 역할 변경 등 중요한 보안 이벤트 기록
 * @param entry Audit 로그 항목
 * @param options 옵션 (트랜잭션 세션 등)
 */
export async function createAuditLog(
  entry: AuditLogEntry,
  options?: CreateAuditLogOptions
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    // Audit 로그 컬렉션에 삽입 (불변)
    await db.collection('audit_logs').insertOne(
      {
        ...entry,
        userId: entry.userId ? new mongoose.Types.ObjectId(entry.userId) : null,
        targetUserId: entry.targetUserId
          ? new mongoose.Types.ObjectId(entry.targetUserId)
          : null,
        createdAt: new Date(),
      },
      options?.session ? { session: options.session } : undefined
    );

    console.log(
      `[Audit] ${entry.action} by ${entry.userId?.substring(0, 8)}... for ${entry.targetUserId?.substring(0, 8)}...`
    );
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error);
    // Audit 로그 실패는 주요 작업을 막지 않음 (로그만 기록)
    // 하지만 트랜잭션 내에서는 롤백됨
    if (options?.session) {
      throw error; // 트랜잭션 롤백을 위해 에러 전파
    }
  }
}

/**
 * Audit 로그 조회
 *
 * @purpose 특정 사용자의 Audit 로그 조회 (관리자용)
 * @param targetUserId 조회할 대상 사용자 ID
 * @param limit 최대 조회 개수 (기본 100)
 */
export async function getAuditLogs(
  targetUserId: string,
  limit = 100
): Promise<AuditLogEntry[]> {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    const logs = await db
      .collection('audit_logs')
      .find({ targetUserId: new mongoose.Types.ObjectId(targetUserId) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return logs.map((log) => ({
      action: log.action,
      userId: log.userId?.toString(),
      targetUserId: log.targetUserId?.toString(),
      targetEmail: log.targetEmail,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      details: log.details,
      timestamp: log.timestamp,
    }));
  } catch (error) {
    console.error('[Audit] Failed to get audit logs:', error);
    return [];
  }
}

/**
 * 최근 보안 이벤트 조회
 *
 * @purpose permission_deny 등 보안 이벤트 모니터링
 * @param hours 조회할 시간 범위 (기본 24시간)
 */
export async function getRecentSecurityEvents(hours = 24): Promise<AuditLogEntry[]> {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const logs = await db
      .collection('audit_logs')
      .find({
        action: 'permission_deny',
        timestamp: { $gte: since },
      })
      .sort({ timestamp: -1 })
      .limit(1000)
      .toArray();

    return logs.map((log) => ({
      action: log.action,
      userId: log.userId?.toString(),
      targetUserId: log.targetUserId?.toString(),
      targetEmail: log.targetEmail,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      details: log.details,
      timestamp: log.timestamp,
    }));
  } catch (error) {
    console.error('[Audit] Failed to get security events:', error);
    return [];
  }
}

/**
 * Audit 로그 통계
 *
 * @purpose 관리자 대시보드용 통계 제공
 */
export async function getAuditLogStats(
  hours = 24
): Promise<{ action: string; count: number }[]> {
  try {
    const client = await clientPromise;
    const db = client.db('naraddon');

    const since = new Date();
    since.setHours(since.getHours() - hours);

    const stats = await db
      .collection('audit_logs')
      .aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    return stats.map((stat) => ({
      action: stat._id,
      count: stat.count,
    }));
  } catch (error) {
    console.error('[Audit] Failed to get audit log stats:', error);
    return [];
  }
}
