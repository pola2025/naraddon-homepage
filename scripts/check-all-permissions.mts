import { glob } from 'glob';
import fs from 'fs';

/**
 * 모든 API 라우트의 권한 검증 로직 분석
 */
async function checkAllPermissions() {
  const apiFiles = await glob('app/api/**/route.ts', {
    ignore: ['**/node_modules/**', '**/.next/**']
  });

  console.log('========================================');
  console.log(`총 ${apiFiles.length}개 API 라우트 발견`);
  console.log('========================================\n');

  const results: Record<string, any> = {
    adminOnly: [],          // admin/super_admin/examiner만
    authenticated: [],      // 로그인만 필요
    publicRead: [],         // GET은 공개, POST는 제한
    noRestriction: [],      // 제한 없음
    unknown: []             // 권한 로직 불명확
  };

  for (const file of apiFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const route = file.replace('app/api/', '/api/').replace('/route.ts', '');

    const analysis = {
      path: route,
      hasSession: content.includes('getServerSession'),
      hasVerifyAdmin: content.includes('verifyAdminRole'),
      hasRoleCheck: /userRole\s*[!=]=/.test(content),
      hasGET: content.includes('export async function GET'),
      hasPOST: content.includes('export async function POST'),
      hasPUT: content.includes('export async function PUT'),
      hasDELETE: content.includes('export async function DELETE'),
    };

    const methods = [];
    if (analysis.hasGET) methods.push('GET');
    if (analysis.hasPOST) methods.push('POST');
    if (analysis.hasPUT) methods.push('PUT');
    if (analysis.hasDELETE) methods.push('DELETE');

    // 분류
    if (analysis.hasVerifyAdmin || analysis.hasRoleCheck) {
      results.adminOnly.push({ ...analysis, methods: methods.join(', ') });
    } else if (analysis.hasSession) {
      results.authenticated.push({ ...analysis, methods: methods.join(', ') });
    } else if (analysis.hasGET && !analysis.hasPOST && !analysis.hasPUT && !analysis.hasDELETE) {
      results.publicRead.push({ ...analysis, methods: methods.join(', ') });
    } else if (!analysis.hasSession && !analysis.hasRoleCheck) {
      if (analysis.hasPOST || analysis.hasPUT || analysis.hasDELETE) {
        results.unknown.push({ ...analysis, methods: methods.join(', ') });
      } else {
        results.noRestriction.push({ ...analysis, methods: methods.join(', ') });
      }
    }
  }

  // 결과 출력
  console.log('\n📊 권한 체계 분석 결과\n');

  console.log('🔐 관리자 전용 (admin/examiner):', results.adminOnly.length);
  for (const a of results.adminOnly) {
    console.log(`  - ${a.path}`);
    console.log(`    Methods: ${a.methods}`);
  }

  console.log('\n🔑 로그인 필요:', results.authenticated.length);
  for (const a of results.authenticated) {
    console.log(`  - ${a.path}`);
    console.log(`    Methods: ${a.methods}`);
  }

  console.log('\n⚠️  권한 로직 불명확 (보안 위험!):', results.unknown.length);
  for (const a of results.unknown) {
    console.log(`  - ${a.path}`);
    console.log(`    Methods: ${a.methods}`);
  }

  console.log('\n📖 공개 읽기:', results.publicRead.length);
  for (const a of results.publicRead) {
    console.log(`  - ${a.path}`);
  }

  console.log('\n✅ 제한 없음 (공개):', results.noRestriction.length);

  // 중요: 묻고답하기, 똔톡 확인
  console.log('\n\n🎯 주요 게시판 권한 상세 확인:\n');

  const qnaFiles = apiFiles.filter(f => f.includes('business-voice') || f.includes('qna'));
  const ttontokFiles = apiFiles.filter(f => f.includes('ttontok') || f.includes('ddontalk'));

  console.log('📝 묻고답하기 (Q&A) & Business Voice:');
  for (const file of qnaFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const route = file.replace('app/api/', '/api/').replace('/route.ts', '');
    const hasAuth = content.includes('getServerSession');
    const hasAdminCheck = content.includes('verifyAdminRole') || /admin|examiner|super_admin/.test(content);
    console.log(`  ${route}`);
    console.log(`    로그인 체크: ${hasAuth ? '✅ YES' : '❌ NO'}`);
    console.log(`    관리자 전용: ${hasAdminCheck ? '⚠️  YES' : '✅ NO (일반 사용자도 가능)'}`);
  }

  console.log('\n💬 똔톡 (TTonTok/DDonTalk):');
  for (const file of ttontokFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const route = file.replace('app/api/', '/api/').replace('/route.ts', '');
    const hasAuth = content.includes('getServerSession');
    const hasAdminCheck = content.includes('verifyAdminRole') || /userRole.*admin|examiner|super_admin/.test(content);
    console.log(`  ${route}`);
    console.log(`    로그인 체크: ${hasAuth ? '✅ YES' : '❌ NO'}`);
    console.log(`    관리자 전용: ${hasAdminCheck ? '⚠️  YES' : '✅ NO (일반 사용자도 가능)'}`);
  }

  console.log('\n\n========================================');
  console.log('분석 완료');
  console.log('========================================');
}

checkAllPermissions().catch(console.error);
