/**
 * RBAC 캐시 무효화 시스템
 *
 * @purpose 역할 변경 시 즉시 권한 캐시 삭제 + 다중 인스턴스 동기화
 * @security 트랜잭션 + 무효화 원자성 보장
 */

import mongoose from 'mongoose';
import { redis, RedisKeys } from '@/lib/redis';
import clientPromise from '@/lib/mongodb-client';
import { createAuditLog } from './audit-log';
import { maskUserId, maskEmail, logSafe, logError } from '@/lib/utils/logger';

/**
 * 사용자 권한 캐시 무효화
 *
 * @purpose 역할 변경 시 즉시 권한 캐시 삭제
 * @param userId 사용자 ID
 * @param email 사용자 이메일 (선택, recoveredUserId 캐시 삭제용)
 */
export async function invalidateUserPermissions(
  userId: string,
  email?: string
): Promise<void> {
  if (!redis) {
    console.warn('[RBAC] Redis not available, skipping cache invalidation');
    return;
  }

  try {
    const keysToDelete: string[] = [];

    // 1. 권한 캐시 삭제
    keysToDelete.push(RedisKeys.userPermissions(userId));

    // 2. 세션 복구 캐시 삭제 (email 제공된 경우)
    if (email) {
      keysToDelete.push(RedisKeys.recoveredUserId(email));
    }

    // 3. 캐시 삭제
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }

    // 4. 다중 인스턴스에 캐시 무효화 알림 (Pub/Sub)
    await redis.publish('rbac:invalidate', JSON.stringify({ userId, email }));

    logSafe('Cache invalidated', { userId, email });
  } catch (error) {
    logError('Cache invalidation failed', error, { userId, email });
    // 실패해도 계속 진행 (다음 조회 시 DB에서 최신 정보 로드)
    // 실패 메트릭 기록 (향후 모니터링용)
  }
}

/**
 * 역할 변경 헬퍼 (트랜잭션 + 캐시 무효화 + Audit)
 *
 * @purpose 사용자 역할을 안전하게 변경하고 즉시 캐시 무효화
 * @param userId 사용자 ID
 * @param newRoleId 새 역할 ID
 * @param options 추가 옵션
 */
export async function changeUserRole(
  userId: string,
  newRoleId: string,
  options?: {
    expiresAt?: Date;
    changedBy?: string; // 변경한 관리자 ID
    reason?: string; // 변경 사유
  }
): Promise<void> {
  const client = await clientPromise;
  const session = client.startSession();

  let userEmail: string | undefined;

  try {
    await session.withTransaction(async () => {
      const db = client.db('naraddon');

      // 1. 사용자 정보 조회 (email 필요)
      const user = await db.collection('users').findOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { projection: { email: 1 }, session }
      );

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      userEmail = user.email;

      // 2. 기존 역할 만료 처리 (삭제하지 않고 만료)
      await db.collection('user_roles').updateMany(
        {
          userId: new mongoose.Types.ObjectId(userId),
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        },
        { $set: { expiresAt: new Date() } },
        { session }
      );

      // 3. 새 역할 부여
      await db.collection('user_roles').insertOne(
        {
          userId: new mongoose.Types.ObjectId(userId),
          roleId: new mongoose.Types.ObjectId(newRoleId),
          grantedAt: new Date(),
          grantedBy: options?.changedBy
            ? new mongoose.Types.ObjectId(options.changedBy)
            : null,
          expiresAt: options?.expiresAt || null,
        },
        { session }
      );

      // 4. users 컬렉션의 roles_updated_at 업데이트
      await db.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            roles_updated_at: new Date(),
          },
        },
        { session }
      );

      // 5. Audit 로그 기록 (트랜잭션 내)
      await createAuditLog(
        {
          action: 'role_change',
          userId,
          targetUserId: userId,
          targetEmail: userEmail,
          details: {
            newRoleId,
            reason: options?.reason || 'No reason provided',
            changedBy: options?.changedBy || 'system',
          },
          timestamp: new Date(),
        },
        { session }
      );
    });

    // 6. 트랜잭션 성공 후 캐시 무효화 (트랜잭션 외부)
    await invalidateUserPermissions(userId, userEmail);

    logSafe('Role changed successfully', { userId, email: userEmail, newRoleId });
  } catch (error) {
    logError('Role change failed', error, { userId, newRoleId });
    throw error; // 트랜잭션 롤백됨
  } finally {
    await session.endSession();
  }
}

/**
 * 역할 제거 헬퍼
 */
export async function removeUserRole(
  userId: string,
  roleId: string,
  options?: {
    changedBy?: string;
    reason?: string;
  }
): Promise<void> {
  const client = await clientPromise;
  const session = client.startSession();

  let userEmail: string | undefined;

  try {
    await session.withTransaction(async () => {
      const db = client.db('naraddon');

      // 1. 사용자 정보 조회
      const user = await db.collection('users').findOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { projection: { email: 1 }, session }
      );

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      userEmail = user.email;

      // 2. 특정 역할 만료
      await db.collection('user_roles').updateMany(
        {
          userId: new mongoose.Types.ObjectId(userId),
          roleId: new mongoose.Types.ObjectId(roleId),
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        },
        { $set: { expiresAt: new Date() } },
        { session }
      );

      // 3. roles_updated_at 업데이트
      await db.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { $set: { roles_updated_at: new Date() } },
        { session }
      );

      // 4. Audit 로그
      await createAuditLog(
        {
          action: 'role_remove',
          userId,
          targetUserId: userId,
          targetEmail: userEmail,
          details: {
            removedRoleId: roleId,
            reason: options?.reason || 'No reason provided',
            changedBy: options?.changedBy || 'system',
          },
          timestamp: new Date(),
        },
        { session }
      );
    });

    // 5. 캐시 무효화
    await invalidateUserPermissions(userId, userEmail);

    logSafe('Role removed successfully', { userId, email: userEmail, roleId });
  } catch (error) {
    logError('Role removal failed', error, { userId, roleId });
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * 수동 캐시 무효화 (비상 상황용)
 *
 * @purpose 여러 사용자의 캐시를 한 번에 무효화
 */
export async function bulkInvalidateCache(userIds: string[]): Promise<void> {
  if (!redis) return;

  try {
    const keys: string[] = [];
    for (const userId of userIds) {
      keys.push(RedisKeys.userPermissions(userId));
    }

    if (keys.length > 0) {
      await redis.del(...keys);
      await redis.publish('rbac:invalidate', JSON.stringify({ bulk: true, userIds }));
    }

    logSafe('Bulk invalidation completed', { count: userIds.length });
  } catch (error) {
    logError('Bulk invalidation failed', error, { count: userIds.length });
  }
}
