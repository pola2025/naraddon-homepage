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

/**
 * 사용자의 유효한 퍼미션 로드 (역할 상속 포함)
 *
 * @purpose 사용자가 가진 모든 퍼미션을 조회 (역할 상속 + 캐시)
 * @param userId 사용자 ID
 * @returns Set<string> 퍼미션 코드 집합 (예: 'policy:analysis:write')
 */
export async function loadEffectivePermissions(
  userId: string
): Promise<Set<string>> {
  try {
    await connectDB();

    // 1. Redis 캐시 확인
    if (redis) {
      const cachedPerms = await redis.get(RedisKeys.userPermissions(userId));
      if (cachedPerms) {
        console.log(`[RBAC] Cache HIT - userId: ${userId}`);
        return new Set(JSON.parse(cachedPerms));
      }
    }

    // 2. DB에서 사용자 역할 조회
    const userRoles = await UserRole.find({
      userId: new mongoose.Types.ObjectId(userId),
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    }).populate('roleId');

    if (!userRoles || userRoles.length === 0) {
      console.log(`[RBAC] No roles found for user: ${userId}`);
      return new Set();
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

    console.log(`[RBAC] Loaded ${permissions.size} permissions for user: ${userId}`);

    // 5. Redis 캐시 저장
    if (redis && permissions.size > 0) {
      await redis.set(
        RedisKeys.userPermissions(userId),
        JSON.stringify(Array.from(permissions)),
        { ex: RedisTTL.userPermissions }
      );
    }

    return permissions;
  } catch (error) {
    console.error('[RBAC] loadEffectivePermissions error:', error);
    return new Set();
  }
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
 * 사용자 권한 캐시 무효화
 *
 * @purpose 역할 변경 시 즉시 반영을 위한 캐시 삭제
 * @param userId 사용자 ID
 */
export async function invalidateUserPermissions(userId: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(RedisKeys.userPermissions(userId));
    console.log(`[RBAC] Cache invalidated for user: ${userId}`);
  } catch (error) {
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
