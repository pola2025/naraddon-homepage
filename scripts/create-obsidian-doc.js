/**
 * Obsidian 문서 직접 생성 스크립트
 * @purpose Templater 없이 Claude가 직접 문서 생성
 * @usage node scripts/create-obsidian-doc.js <type> <title>
 */

const http = require('http');
const config = require('../.claude/obsidian-config.json');

const API_URL = new URL(config.api.host);
const API_TOKEN = config.api.token;

/**
 * REST API 호출
 */
async function callAPI(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_URL.hostname,
      port: API_URL.port,
      path: endpoint,
      method,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'text/markdown',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * 트러블슈팅 문서 생성
 */
function createTroubleshootingDoc(metadata) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].slice(0, 5);

  return `---
title: ${metadata.title}
날짜: ${date}
프로젝트: ${metadata.프로젝트}
프로젝트코드: NRDN
카테고리: 트러블슈팅
발생기능: ${metadata.발생기능}
기능모듈: ${metadata.기능모듈}
에러타입: ${metadata.에러타입}
근본원인: ${metadata.근본원인}
심각도: ${metadata.심각도}
해결여부: ${metadata.해결여부}
발생일시: ${date} ${time}
tags:
  - 프로젝트/${metadata.프로젝트}
  - 기능/${metadata.기능모듈}
  - 작업유형/트러블슈팅/버그픽스
  - 상태/${metadata.해결여부 === '해결완료' ? '완료' : '진행중'}
  - 심각도/${metadata.심각도}
---

#${metadata.프로젝트} #트러블슈팅 #${metadata.에러타입}

# ${metadata.title}

## 📋 문제 요약
- **발생 위치**: ${metadata.발생위치 || ''}
- **에러 타입**: ${metadata.에러타입}
- **근본 원인**: ${metadata.근본원인}

## 🔍 상세 상황

### 어떤 문제가 발생했는가?
${metadata.문제설명 || ''}

### 에러 메시지
\`\`\`
${metadata.에러메시지 || ''}
\`\`\`

## 💡 원인 분석

${metadata.원인분석 || ''}

## 🛠️ 해결 과정

### 최종 해결 방법
\`\`\`typescript
${metadata.해결코드 || '// 해결 코드'}
\`\`\`

## 🚀 재발 방지

${metadata.재발방지 || ''}

## 🔗 관련 문서

${metadata.관련문서 ? metadata.관련문서.map(d => `- [[${d}]]`).join('\n') : ''}

---

발생일시:: ${date} ${time}
해결일시:: ${metadata.해결일시 || ''}
소요시간:: ${metadata.소요시간 || ''}
최초발견자:: ${metadata.발견자 || '사용자'}
해결자:: Claude
재발가능성:: ${metadata.재발가능성 || 'Low'}
`;
}

/**
 * 기능개발 문서 생성
 */
function createFeatureDoc(metadata) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].slice(0, 5);

  return `---
title: ${metadata.title}
날짜: ${date}
프로젝트: ${metadata.프로젝트}
프로젝트코드: NRDN
카테고리: 기능개발
기능범주: ${metadata.기능범주}
기능모듈: ${metadata.기능모듈}
상태: ${metadata.상태}
tags:
  - 프로젝트/${metadata.프로젝트}
  - 기능/${metadata.기능모듈}
  - 작업유형/신규기능
  - 상태/${metadata.상태}
---

#${metadata.프로젝트} #신규기능

# ${metadata.title}

## 📋 기능 요약
- **무엇을 만들었는가**: ${metadata.기능설명 || ''}
- **왜 필요한가**: ${metadata.필요성 || ''}
- **어떻게 동작하는가**: ${metadata.동작방식 || ''}

## 💻 구현 상세

### 주요 파일
${metadata.구현파일 ? metadata.구현파일.map(f => `- \`${f}\``).join('\n') : ''}

### 핵심 코드

\`\`\`typescript
${metadata.핵심코드 || '// 구현 코드'}
\`\`\`

## 🧪 테스트

### 테스트 결과
- [${metadata.테스트완료 ? 'x' : ' '}] 단위 테스트: 통과
- [${metadata.테스트완료 ? 'x' : ' '}] 통합 테스트: 통과
- [${metadata.테스트완료 ? 'x' : ' '}] E2E 테스트: 통과

## 🔗 관련 문서

${metadata.관련문서 ? metadata.관련문서.map(d => `- [[${d}]]`).join('\n') : ''}

---

개발시작:: ${date} ${time}
개발완료:: ${metadata.완료일시 || ''}
소요시간:: ${metadata.소요시간 || ''}
코드리뷰:: ${metadata.코드리뷰 || ''}
배포일시:: ${metadata.배포일시 || ''}
`;
}

/**
 * 문서 생성 및 저장
 */
async function createDocument(type, metadata) {
  let content;
  let folderMap = {
    'troubleshooting': '05-트러블슈팅',
    'feature': '03-기능개발',
    'conversation': '99-대화기록',
  };

  // 문서 생성
  if (type === 'troubleshooting') {
    content = createTroubleshootingDoc(metadata);
  } else if (type === 'feature') {
    content = createFeatureDoc(metadata);
  } else {
    throw new Error('Unknown type');
  }

  // 파일 경로
  const folder = folderMap[type];
  const filename = `${metadata.날짜 || new Date().toISOString().split('T')[0]}-${metadata.title}.md`;
  const filePath = `/vault/Projects/${metadata.프로젝트}/${folder}/${filename}`;

  // API 호출
  try {
    await callAPI(filePath, 'PUT', content);
    console.log(`✅ 문서 생성 완료: ${filePath}`);
    console.log(`📊 메타데이터: ${Object.keys(metadata).length}개 필드`);
    console.log(`\nObsidian에서 확인하세요!`);
    return filePath;
  } catch (error) {
    console.error(`❌ 문서 생성 실패: ${error.message}`);
    throw error;
  }
}

// 테스트 실행
async function test() {
  console.log('🧪 Obsidian 문서 생성 테스트\n');

  const testMetadata = {
    title: '테스트-에러-원인',
    프로젝트: '나라똔',
    발생기능: '관리자인증',
    기능모듈: '관리자/인증',
    에러타입: '403에러',
    근본원인: 'JWT콜백미조회',
    심각도: 'High',
    해결여부: '해결완료',
    문제설명: 'Google OAuth로 로그인 시 role undefined',
    원인분석: 'JWT 콜백에서 DB role 조회하지 않음',
    해결코드: `async jwt({ token, user }) {
  if (user) {
    const dbUser = await User.findOne({ email: user.email });
    token.role = dbUser?.role || 'user';
  }
  return token;
}`,
    관련문서: ['RBAC아키텍처', 'JWT인증구현'],
  };

  await createDocument('troubleshooting', testMetadata);
}

// CLI
if (require.main === module) {
  test().catch(console.error);
}

module.exports = { createDocument };
