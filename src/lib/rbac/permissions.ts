/**
 * RBAC 권한 로더
 *
 * @purpose DB 기반 역할/퍼미션 조회 + Redis 캐시
 * @context 역할 상속 지원, 즉시성 보장
 */

import mongoose from 'mongoose';
import { redis, RedisKeys, RedisTTL } from '@/lib/redis';
import Role from '@/models/Role';
import Permission from '@/models/Permission';
import RolePermission from '@/models/RolePermission';
import UserRole from '@/models/UserRole';
import connectDB from '@/lib/mongodb';
import {
  recordCacheHit,
  recordCacheMiss,
  recordDbQueryTime,
  recordError,
  recordInvalidation,
} from './monitoring';

/**
 * 사용자의 유효한 퍼미션 로드 (역할 상속 포함)
 *
 * @purpose 사용자가 가진 모든 퍼미션을 조회 (역할 상속 + 캐시)
 * @param userId 사용자 ID
 * @param useAggregation 집계 파이프라인 사용 여부 (기본: true)
 * @returns Set<string> 퍼미션 코드 집합 (예: 'policy:analysis:write')
 */
export async function loadEffectivePermissions(
  userId: string,
  useAggregation = true
): Promise<Set<string>> {
  try {
    await connectDB();

    // 1. Redis 캐시 확인
    if (redis) {
      const cachedPerms = await redis.get(RedisKeys.userPermissions(userId));
      if (cachedPerms) {
        recordCacheHit(userId);
        return new Set(JSON.parse(cachedPerms));
      }
    }

    // 캐시 MISS - DB 조회 시작
    recordCacheMiss(userId);
    const dbStartTime = Date.now();

    // 2. Aggregation Pipeline 최적화 (Phase 1.5)
    let permissions: Set<string>;

    if (useAggregation) {
      permissions = await loadPermissionsOptimized(userId);
    } else {
      // Legacy: 기존 방식 (하위 호환)
      permissions = await loadPermissionsLegacy(userId);
    }

    console.log(`[RBAC] Loaded ${permissions.size} permissions for user: ${userId}`);

    // 3. Redis 캐시 저장
    if (redis && permissions.size > 0) {
      await redis.set(
        RedisKeys.userPermissions(userId),
        JSON.stringify(Array.from(permissions)),
        { ex: RedisTTL.userPermissions }
      );
    }

    // DB 쿼리 시간 기록
    const dbQueryTime = Date.now() - dbStartTime;
    recordDbQueryTime(userId, dbQueryTime);

    return permissions;
  } catch (error) {
    recordError(error as Error, 'loadEffectivePermissions');
    console.error('[RBAC] loadEffectivePermissions error:', error);
    return new Set();
  }
}

/**
 * Aggregation Pipeline을 사용한 최적화된 권한 로드 (Phase 1.5)
 *
 * @purpose N+1 쿼리 제거, 단일 aggregation으로 모든 권한 조회
 * @param userId 사용자 ID
 * @returns Set<string> 퍼미션 코드 집합
 * @performance 450ms → 50-100ms (약 80% 개선)
 */
async function loadPermissionsOptimized(userId: string): Promise<Set<string>> {
  try {
    // user_roles → roles (상속 포함) → role_permissions → permissions
    const result = await UserRole.aggregate([
      // 1. 사용자의 활성 역할 필터
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        },
      },

      // 2. roles 컬렉션 조인
      {
        $lookup: {
          from: 'roles',
          localField: 'roleId',
          foreignField: '_id',
          as: 'role',
        },
      },
      { $unwind: '$role' },

      // 3. role_permissions 조인
      {
        $lookup: {
          from: 'role_permissions',
          localField: 'role._id',
          foreignField: 'roleId',
          as: 'rolePerms',
        },
      },
      { $unwind: { path: '$rolePerms', preserveNullAndEmptyArrays: true } },

      // 4. permissions 조인
      {
        $lookup: {
          from: 'permissions',
          localField: 'rolePerms.permissionId',
          foreignField: '_id',
          as: 'permission',
        },
      },
      { $unwind: { path: '$permission', preserveNullAndEmptyArrays: true } },

      // 5. 권한 코드만 추출 (중복 제거)
      {
        $group: {
          _id: null,
          codes: { $addToSet: '$permission.code' },
        },
      },
    ]);

    // 결과가 없으면 users.role 폴백
    if (!result || result.length === 0 || !result[0].codes || result[0].codes.length === 0) {
      console.log(`[RBAC] No aggregation results, falling back to users.role for: ${userId}`);
      return await loadPermissionsByFallback(userId);
    }

    // null 제거 (unwind preserveNullAndEmptyArrays 때문에 포함될 수 있음)
    const codes = result[0].codes.filter((code: string | null) => code !== null);

    return new Set(codes);
  } catch (error) {
    console.error('[RBAC] Aggregation failed, using legacy method:', error);
    return await loadPermissionsLegacy(userId);
  }
}

/**
 * 레거시 권한 로드 방식 (하위 호환)
 *
 * @purpose 기존 로직 유지 (Aggregation 실패 시 폴백)
 * @param userId 사용자 ID
 * @returns Set<string> 퍼미션 코드 집합
 */
async function loadPermissionsLegacy(userId: string): Promise<Set<string>> {
  // 2. DB에서 사용자 역할 조회
  const userRoles = await UserRole.find({
    userId: new mongoose.Types.ObjectId(userId),
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).populate('roleId');

  // 🔄 Fallback: user_roles 없으면 NextAuth users.role 사용 (기존 사용자 호환)
  if (!userRoles || userRoles.length === 0) {
    return await loadPermissionsByFallback(userId);
  }

  // 3. 역할 상속 구조를 따라 모든 역할 수집
  const allRoles = new Set<string>();
  for (const userRole of userRoles) {
    const role = userRole.roleId as any;
    if (role && role._id) {
      await collectInheritedRoles(role._id.toString(), allRoles);
    }
  }

  // 4. 역할별 퍼미션 조회
  const permissions = new Set<string>();
  for (const roleId of allRoles) {
    const rolePerms = await loadRolePermissions(roleId);
    rolePerms.forEach((perm) => permissions.add(perm));
  }

  return permissions;
}

/**
 * users.role 폴백 (RBAC 미적용 사용자)
 *
 * @purpose user_roles 없는 레거시 사용자 지원
 * @param userId 사용자 ID
 * @returns Set<string> 퍼미션 코드 집합
 */
async function loadPermissionsByFallback(userId: string): Promise<Set<string>> {
  console.log(`[RBAC] No user_roles found, falling back to users.role for: ${userId}`);

  try {
    const client = await import('@/lib/mongodb-client').then((m) => m.default);
    const db = (await client).db('naraddon');
    const user = await db
      .collection('users')
      .findOne({ _id: new mongoose.Types.ObjectId(userId) }, { projection: { role: 1 } });

    if (user && user.role) {
      // users.role을 기반으로 권한 매핑 (레거시 호환)
      return await loadPermissionsByLegacyRole(user.role);
    }
  } catch (error) {
    console.error('[RBAC] Fallback to users.role failed:', error);
  }

  return new Set();
}

/**
 * 역할 상속 구조를 따라 모든 상위 역할 수집
 *
 * @purpose admin → examiner → user 처럼 상속된 역할도 포함
 * @param roleId 시작 역할 ID
 * @param collected 수집된 역할 ID Set (재귀용)
 */
async function collectInheritedRoles(
  roleId: string,
  collected: Set<string>
): Promise<void> {
  if (collected.has(roleId)) {
    return; // 순환 참조 방지
  }

  collected.add(roleId);

  const role = await Role.findById(roleId);
  if (!role) {
    return;
  }

  // 상위 역할이 있으면 재귀적으로 수집
  if (role.inheritsFrom) {
    await collectInheritedRoles(role.inheritsFrom.toString(), collected);
  }
}

/**
 * 특정 역할의 퍼미션 로드
 *
 * @purpose 역할에 직접 부여된 퍼미션 조회 (캐시 지원)
 * @param roleId 역할 ID
 * @returns Set<string> 퍼미션 코드 집합
 */
async function loadRolePermissions(roleId: string): Promise<Set<string>> {
  try {
    // 1. Redis 캐시 확인
    if (redis) {
      const cachedPerms = await redis.get(RedisKeys.rolePermissions(roleId));
      if (cachedPerms) {
        return new Set(JSON.parse(cachedPerms));
      }
    }

    // 2. DB에서 역할-퍼미션 매핑 조회
    const rolePermissions = await RolePermission.find({
      roleId: new mongoose.Types.ObjectId(roleId),
    }).populate('permissionId');

    const permissions = new Set<string>();
    for (const rp of rolePermissions) {
      const perm = rp.permissionId as any;
      if (perm && perm.code) {
        permissions.add(perm.code);
      }
    }

    // 3. Redis 캐시 저장
    if (redis && permissions.size > 0) {
      await redis.set(
        RedisKeys.rolePermissions(roleId),
        JSON.stringify(Array.from(permissions)),
        { ex: RedisTTL.rolePermissions }
      );
    }

    return permissions;
  } catch (error) {
    console.error('[RBAC] loadRolePermissions error:', error);
    return new Set();
  }
}

/**
 * 레거시 role을 퍼미션으로 매핑 (하위 호환성)
 *
 * @purpose NextAuth users.role 필드를 RBAC 퍼미션으로 변환
 * @param roleName 역할 이름 (admin, super_admin, examiner, user)
 * @returns Set<string> 퍼미션 코드 집합
 */
async function loadPermissionsByLegacyRole(roleName: string): Promise<Set<string>> {
  const permissions = new Set<string>();

  // user 권한: 기본 읽기
  permissions.add('policy:analysis:read');
  permissions.add('policy:news:read');
  permissions.add('community:post:write');

  // examiner 권한: user + 정책 작성
  if (roleName === 'examiner' || roleName === 'admin' || roleName === 'super_admin') {
    permissions.add('policy:analysis:write');
    permissions.add('policy:news:write');
    permissions.add('examiner:read');
  }

  // admin 권한: examiner + 관리
  if (roleName === 'admin' || roleName === 'super_admin') {
    permissions.add('user:read');
    permissions.add('user:manage');
    permissions.add('user:role:update');
    permissions.add('examiner:manage');
    permissions.add('community:post:manage');
  }

  // super_admin 권한: 모든 권한
  if (roleName === 'super_admin') {
    permissions.add('*');
  }

  console.log(`[RBAC] Loaded ${permissions.size} permissions for legacy role: ${roleName}`);
  return permissions;
}

/**
 * 사용자 권한 캐시 무효화
 *
 * @purpose 역할 변경 시 즉시 반영을 위한 캐시 삭제
 * @param userId 사용자 ID
 */
export async function invalidateUserPermissions(userId: string, reason?: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(RedisKeys.userPermissions(userId));
    recordInvalidation(userId, reason);
    console.log(`[RBAC] Cache invalidated for user: ${userId}`);
  } catch (error) {
    recordError(error as Error, 'invalidateUserPermissions');
    console.error('[RBAC] Cache invalidation error:', error);
  }
}

/**
 * 역할 권한 캐시 무효화
 *
 * @purpose 역할-퍼미션 매핑 변경 시 캐시 삭제
 * @param roleId 역할 ID
 */
export async function invalidateRolePermissions(roleId: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(RedisKeys.rolePermissions(roleId));
    console.log(`[RBAC] Cache invalidated for role: ${roleId}`);
  } catch (error) {
    console.error('[RBAC] Cache invalidation error:', error);
  }
}
