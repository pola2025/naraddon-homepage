/**
 * 특정 사용자의 권한 테스트
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// MongoDB URI 확인
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

console.log('✅ MONGODB_URI:', process.env.MONGODB_URI?.substring(0, 50) + '...\n');

import { loadEffectivePermissions } from '../src/lib/rbac/permissions';

const userId = '68d2cf4069b693baa8e5102e'; // framei@naver.com

async function testUserPermission() {
  console.log('🔍 사용자 권한 확인 중...\n');
  console.log(`사용자 ID: ${userId}`);
  console.log(`이메일: framei@naver.com`);
  console.log(`역할: admin\n`);

  try {
    const permissions = await loadEffectivePermissions(userId);

    console.log('✅ 로드된 권한:');
    console.log('='.repeat(60));

    if (permissions.size === 0) {
      console.log('⚠️  권한이 없습니다!');
    } else {
      Array.from(permissions).sort().forEach((perm, index) => {
        console.log(`  ${index + 1}. ${perm}`);
      });
    }

    console.log('='.repeat(60));
    console.log(`\n총 ${permissions.size}개의 권한\n`);

    // 정책분석 작성 권한 체크
    const canWritePolicyAnalysis = permissions.has('policy:analysis:write');
    console.log('📝 정책분석 작성 권한:', canWritePolicyAnalysis ? '✅ 있음' : '❌ 없음');

    const canWritePolicyNews = permissions.has('policy:news:write');
    console.log('📰 정책뉴스 작성 권한:', canWritePolicyNews ? '✅ 있음' : '❌ 없음');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  }

  process.exit(0);
}

testUserPermission();
