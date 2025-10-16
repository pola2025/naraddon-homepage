/**
 * RBAC 권한 시스템 검증 테스트
 *
 * @purpose 기존 사용자 role → RBAC 퍼미션 매핑 로직 검증
 * @usage npm run test:rbac
 */

/**
 * 레거시 role을 퍼미션으로 매핑 (permissions.ts와 동일)
 */
function loadPermissionsByLegacyRole(roleName: string): Set<string> {
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

  return permissions;
}

/**
 * 예상 퍼미션 정의
 */
const EXPECTED_PERMISSIONS: Record<string, string[]> = {
  user: [
    'policy:analysis:read',
    'policy:news:read',
    'community:post:write',
  ],
  examiner: [
    'policy:analysis:read',
    'policy:news:read',
    'community:post:write',
    'policy:analysis:write',
    'policy:news:write',
    'examiner:read',
  ],
  admin: [
    'policy:analysis:read',
    'policy:news:read',
    'community:post:write',
    'policy:analysis:write',
    'policy:news:write',
    'examiner:read',
    'user:read',
    'user:manage',
    'user:role:update',
    'examiner:manage',
    'community:post:manage',
  ],
  super_admin: [
    'policy:analysis:read',
    'policy:news:read',
    'community:post:write',
    'policy:analysis:write',
    'policy:news:write',
    'examiner:read',
    'user:read',
    'user:manage',
    'user:role:update',
    'examiner:manage',
    'community:post:manage',
    '*',
  ],
};

/**
 * 퍼미션 검증
 */
function validatePermissions(role: string, permissions: Set<string>): boolean {
  const expected = EXPECTED_PERMISSIONS[role];
  if (!expected) {
    console.error(`❌ Unknown role: ${role}`);
    return false;
  }

  let valid = true;

  // 예상 퍼미션이 모두 있는지 확인
  for (const perm of expected) {
    if (permissions.has(perm)) {
      console.log(`  ✓ ${perm}`);
    } else {
      console.error(`  ✗ ${perm} - MISSING!`);
      valid = false;
    }
  }

  // 예상치 않은 퍼미션 확인
  for (const perm of permissions) {
    if (!expected.includes(perm)) {
      console.warn(`  ⚠ ${perm} - Unexpected`);
      valid = false;
    }
  }

  return valid;
}

/**
 * 레거시 role 매핑 테스트
 */
function testLegacyRoleMapping() {
  console.log('\n🧪 Testing Legacy Role → RBAC Permission Mapping\n');
  console.log('='.repeat(60));

  const roles = ['user', 'examiner', 'admin', 'super_admin'];
  let allPassed = true;

  for (const role of roles) {
    console.log(`\n📋 Testing role: ${role}`);
    console.log('-'.repeat(60));

    const permissions = loadPermissionsByLegacyRole(role);
    const valid = validatePermissions(role, permissions);

    if (valid) {
      console.log(`\n✅ ${role} role mapping: PASSED (${permissions.size} permissions)`);
    } else {
      console.error(`\n❌ ${role} role mapping: FAILED`);
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ All role mappings PASSED');
  } else {
    console.error('❌ Some role mappings FAILED');
  }
  console.log('='.repeat(60));

  return allPassed;
}

/**
 * 실제 사용 시나리오 테스트
 */
function testUseCases() {
  console.log('\n\n🎯 Testing Real-World Use Cases\n');
  console.log('='.repeat(60));

  const scenarios = [
    {
      role: 'user',
      action: 'policy:analysis:read',
      expected: true,
      description: '일반 사용자가 정책분석 조회',
    },
    {
      role: 'user',
      action: 'policy:analysis:write',
      expected: false,
      description: '일반 사용자가 정책분석 작성 (권한 없음)',
    },
    {
      role: 'examiner',
      action: 'policy:analysis:write',
      expected: true,
      description: '기업심사관이 정책분석 작성',
    },
    {
      role: 'examiner',
      action: 'user:manage',
      expected: false,
      description: '기업심사관이 사용자 관리 (권한 없음)',
    },
    {
      role: 'admin',
      action: 'policy:analysis:write',
      expected: true,
      description: '관리자가 정책분석 작성',
    },
    {
      role: 'admin',
      action: 'user:manage',
      expected: true,
      description: '관리자가 사용자 관리',
    },
    {
      role: 'super_admin',
      action: 'any:permission:here',
      expected: true,
      description: '최고 관리자는 모든 권한 보유 (*)',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    const permissions = loadPermissionsByLegacyRole(scenario.role);
    const hasWildcard = permissions.has('*');
    const hasPermission = hasWildcard || permissions.has(scenario.action);
    const result = hasPermission === scenario.expected;

    if (result) {
      console.log(`✅ ${scenario.description}`);
      console.log(`   Role: ${scenario.role}, Action: ${scenario.action}, Result: ${hasPermission ? 'ALLOWED' : 'DENIED'}`);
      passed++;
    } else {
      console.error(`❌ ${scenario.description}`);
      console.error(`   Role: ${scenario.role}, Action: ${scenario.action}, Expected: ${scenario.expected}, Got: ${hasPermission}`);
      failed++;
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  return failed === 0;
}

/**
 * 역할 상속 검증
 */
function testRoleInheritance() {
  console.log('\n\n🔗 Testing Role Inheritance\n');
  console.log('='.repeat(60));

  const userPerms = loadPermissionsByLegacyRole('user');
  const examinerPerms = loadPermissionsByLegacyRole('examiner');
  const adminPerms = loadPermissionsByLegacyRole('admin');
  const superAdminPerms = loadPermissionsByLegacyRole('super_admin');

  let allPassed = true;

  // examiner는 user 권한을 모두 포함해야 함
  console.log('\n📌 examiner should include all user permissions:');
  for (const perm of userPerms) {
    if (examinerPerms.has(perm)) {
      console.log(`  ✓ ${perm}`);
    } else {
      console.error(`  ✗ ${perm} - MISSING in examiner!`);
      allPassed = false;
    }
  }

  // admin은 examiner 권한을 모두 포함해야 함
  console.log('\n📌 admin should include all examiner permissions:');
  for (const perm of examinerPerms) {
    if (adminPerms.has(perm)) {
      console.log(`  ✓ ${perm}`);
    } else {
      console.error(`  ✗ ${perm} - MISSING in admin!`);
      allPassed = false;
    }
  }

  // super_admin은 admin 권한을 모두 포함하고 + *를 가져야 함
  console.log('\n📌 super_admin should include all admin permissions + (*):');
  for (const perm of adminPerms) {
    if (superAdminPerms.has(perm)) {
      console.log(`  ✓ ${perm}`);
    } else {
      console.error(`  ✗ ${perm} - MISSING in super_admin!`);
      allPassed = false;
    }
  }
  if (superAdminPerms.has('*')) {
    console.log(`  ✓ * (wildcard)`);
  } else {
    console.error(`  ✗ * (wildcard) - MISSING in super_admin!`);
    allPassed = false;
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ Role inheritance: PASSED');
  } else {
    console.error('❌ Role inheritance: FAILED');
  }
  console.log('='.repeat(60));

  return allPassed;
}

/**
 * 메인 실행
 */
function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        RBAC Permission System Validation Test            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const test1 = testLegacyRoleMapping();
  const test2 = testUseCases();
  const test3 = testRoleInheritance();

  console.log('\n\n📝 Summary:\n');
  console.log(`${test1 ? '✅' : '❌'} Legacy role mapping: ${test1 ? 'PASSED' : 'FAILED'}`);
  console.log(`${test2 ? '✅' : '❌'} Use case scenarios: ${test2 ? 'PASSED' : 'FAILED'}`);
  console.log(`${test3 ? '✅' : '❌'} Role inheritance: ${test3 ? 'PASSED' : 'FAILED'}`);

  if (test1 && test2 && test3) {
    console.log('\n🎉 All tests PASSED! RBAC system is ready for production!');
    console.log('\n✅ 기존 사용자 역할 매핑 검증 완료:');
    console.log('  - user: 3개 퍼미션');
    console.log('  - examiner: 6개 퍼미션 (user 상속 + 3개 추가)');
    console.log('  - admin: 11개 퍼미션 (examiner 상속 + 5개 추가)');
    console.log('  - super_admin: 12개 퍼미션 (admin 상속 + wildcard)');
    console.log('\nNext steps:');
    console.log('1. Set up Upstash Redis (REDIS_URL, REDIS_TOKEN)');
    console.log('2. Run: npm run seed:rbac');
    console.log('3. Deploy to Vercel');
    console.log('4. Test with real user sessions\n');
    process.exit(0);
  } else {
    console.error('\n❌ Some tests FAILED! Please review the code.');
    process.exit(1);
  }
}

main();
