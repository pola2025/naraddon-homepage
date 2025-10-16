/**
 * RBAC 초기 데이터 시딩 스크립트
 *
 * @purpose 역할, 퍼미션, 역할-퍼미션 매핑 초기 데이터 생성
 * @usage npm run seed:rbac
 * @security 환경변수만 사용, 하드코딩 없음
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import Role from '@/models/Role';
import Permission from '@/models/Permission';
import RolePermission from '@/models/RolePermission';

// ⚠️ 보안: 환경변수 필수
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

async function seedRBAC() {
  try {
    console.log('🔗 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // 1. 역할 생성
    console.log('\n📝 역할 생성 중...');

    const userRole = await Role.findOneAndUpdate(
      { name: 'user' },
      {
        name: 'user',
        displayName: '일반회원',
        description: '기본 사용자 역할',
        inheritsFrom: null,
        isSystem: true,
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ user 역할 생성/업데이트');

    const examinerRole = await Role.findOneAndUpdate(
      { name: 'examiner' },
      {
        name: 'examiner',
        displayName: '기업심사관',
        description: '정책분석 및 정책뉴스 작성 권한',
        inheritsFrom: userRole._id,
        isSystem: true,
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ examiner 역할 생성/업데이트');

    const adminRole = await Role.findOneAndUpdate(
      { name: 'admin' },
      {
        name: 'admin',
        displayName: '관리자',
        description: '전체 관리 권한',
        inheritsFrom: examinerRole._id,
        isSystem: true,
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ admin 역할 생성/업데이트');

    const superAdminRole = await Role.findOneAndUpdate(
      { name: 'super_admin' },
      {
        name: 'super_admin',
        displayName: '최고 관리자',
        description: '모든 권한 포함',
        inheritsFrom: adminRole._id,
        isSystem: true,
      },
      { upsert: true, new: true }
    );
    console.log('  ✓ super_admin 역할 생성/업데이트');

    // 2. 퍼미션 생성
    console.log('\n🔑 퍼미션 생성 중...');

    const permissions = [
      // 정책 분석 퍼미션
      {
        resource: 'policy',
        action: 'analysis:read',
        code: 'policy:analysis:read',
        displayName: '정책분석 조회',
        description: '정책분석 게시글 조회 권한',
      },
      {
        resource: 'policy',
        action: 'analysis:write',
        code: 'policy:analysis:write',
        displayName: '정책분석 작성',
        description: '정책분석 게시글 작성/수정/삭제 권한',
      },
      // 정책 뉴스 퍼미션
      {
        resource: 'policy',
        action: 'news:read',
        code: 'policy:news:read',
        displayName: '정책뉴스 조회',
        description: '정책뉴스 게시글 조회 권한',
      },
      {
        resource: 'policy',
        action: 'news:write',
        code: 'policy:news:write',
        displayName: '정책뉴스 작성',
        description: '정책뉴스 게시글 작성/수정/삭제 권한',
      },
      // 사용자 관리 퍼미션
      {
        resource: 'user',
        action: 'read',
        code: 'user:read',
        displayName: '사용자 조회',
        description: '사용자 정보 조회 권한',
      },
      {
        resource: 'user',
        action: 'manage',
        code: 'user:manage',
        displayName: '사용자 관리',
        description: '사용자 정보 수정/삭제 권한',
      },
      {
        resource: 'user',
        action: 'role:update',
        code: 'user:role:update',
        displayName: '역할 변경',
        description: '사용자 역할 부여/회수 권한',
      },
      // 심사관 관리 퍼미션
      {
        resource: 'examiner',
        action: 'read',
        code: 'examiner:read',
        displayName: '심사관 조회',
        description: '심사관 정보 조회 권한',
      },
      {
        resource: 'examiner',
        action: 'manage',
        code: 'examiner:manage',
        displayName: '심사관 관리',
        description: '심사관 등록/수정/삭제 권한',
      },
      // 커뮤니티 퍼미션
      {
        resource: 'community',
        action: 'post:write',
        code: 'community:post:write',
        displayName: '게시글 작성',
        description: '커뮤니티 게시글 작성 권한',
      },
      {
        resource: 'community',
        action: 'post:manage',
        code: 'community:post:manage',
        displayName: '게시글 관리',
        description: '모든 게시글 수정/삭제 권한',
      },
    ];

    const createdPermissions: any = {};
    for (const perm of permissions) {
      const permission = await Permission.findOneAndUpdate(
        { code: perm.code },
        { ...perm, isSystem: true },
        { upsert: true, new: true }
      );
      createdPermissions[perm.code] = permission;
      console.log(`  ✓ ${perm.code} 퍼미션 생성/업데이트`);
    }

    // 3. 역할-퍼미션 매핑
    console.log('\n🔗 역할-퍼미션 매핑 중...');

    // user 역할: 기본 읽기 권한
    const userPermissions = [
      'policy:analysis:read',
      'policy:news:read',
      'community:post:write',
    ];

    for (const permCode of userPermissions) {
      await RolePermission.findOneAndUpdate(
        {
          roleId: userRole._id,
          permissionId: createdPermissions[permCode]._id,
        },
        {
          roleId: userRole._id,
          permissionId: createdPermissions[permCode]._id,
          grantedBy: null,
          grantedAt: new Date(),
        },
        { upsert: true }
      );
    }
    console.log('  ✓ user 역할 퍼미션 매핑 완료');

    // examiner 역할: 정책 작성 권한 (user 권한 상속)
    const examinerPermissions = [
      'policy:analysis:write',
      'policy:news:write',
      'examiner:read',
    ];

    for (const permCode of examinerPermissions) {
      await RolePermission.findOneAndUpdate(
        {
          roleId: examinerRole._id,
          permissionId: createdPermissions[permCode]._id,
        },
        {
          roleId: examinerRole._id,
          permissionId: createdPermissions[permCode]._id,
          grantedBy: null,
          grantedAt: new Date(),
        },
        { upsert: true }
      );
    }
    console.log('  ✓ examiner 역할 퍼미션 매핑 완료');

    // admin 역할: 관리 권한 (examiner 권한 상속)
    const adminPermissions = [
      'user:read',
      'user:manage',
      'user:role:update',
      'examiner:manage',
      'community:post:manage',
    ];

    for (const permCode of adminPermissions) {
      await RolePermission.findOneAndUpdate(
        {
          roleId: adminRole._id,
          permissionId: createdPermissions[permCode]._id,
        },
        {
          roleId: adminRole._id,
          permissionId: createdPermissions[permCode]._id,
          grantedBy: null,
          grantedAt: new Date(),
        },
        { upsert: true }
      );
    }
    console.log('  ✓ admin 역할 퍼미션 매핑 완료');

    // super_admin 역할: 모든 권한 (admin 권한 상속)
    console.log('  ✓ super_admin 역할 퍼미션 매핑 완료 (admin 상속)');

    console.log('\n✅ RBAC 초기 데이터 시딩 완료!');
    console.log('\n📊 생성된 데이터:');
    console.log(`  - 역할: 4개 (user, examiner, admin, super_admin)`);
    console.log(`  - 퍼미션: ${permissions.length}개`);
    console.log(`  - 역할-퍼미션 매핑 완료`);

  } catch (error) {
    console.error('❌ 시딩 실패:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB 연결 종료');
  }
}

// 실행
seedRBAC();
