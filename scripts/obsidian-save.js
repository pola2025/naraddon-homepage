#!/usr/bin/env node
/**
 * 옵시디언 자동 문서화 스크립트
 *
 * @purpose 프로젝트 진행 사항을 옵시디언 Vault에 자동 저장
 * @usage node scripts/obsidian-save.js --type=기능개발 --title="기능명"
 */

const fs = require('fs');
const path = require('path');

// 설정 로드
const config = JSON.parse(
  fs.readFileSync('.claude/obsidian-config.json', 'utf-8')
);

// 프로젝트 자동 감지
const currentDir = process.cwd();
const projectName = path.basename(currentDir);
const projectConfig = config.projects[projectName];

if (!projectConfig) {
  console.error(`⛔ 프로젝트를 찾을 수 없습니다: ${projectName}`);
  console.log('등록된 프로젝트:', Object.keys(config.projects).join(', '));
  process.exit(1);
}

console.log(`📂 프로젝트: ${projectConfig.name}`);
console.log(`📁 저장 경로: ${projectConfig.path}`);

// 명령행 인자 파싱
const args = process.argv.slice(2);
const params = {};
args.forEach(arg => {
  const [key, value] = arg.replace('--', '').split('=');
  params[key] = value;
});

// 문서 타입 검증
const validTypes = Object.keys(config.templates);
if (!params.type || !validTypes.includes(params.type)) {
  console.error(`⛔ 유효하지 않은 문서 타입: ${params.type}`);
  console.log('사용 가능한 타입:', validTypes.join(', '));
  process.exit(1);
}

// 날짜 생성
const date = new Date().toISOString().split('T')[0];

// 파일명 생성
const sanitizeFilename = (str) => {
  return str.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
};

const filename = `${date}-${sanitizeFilename(params.title || '제목없음')}.md`;
const categoryFolder = config.templates[params.type];
const targetPath = path.join(projectConfig.path, categoryFolder, filename);

// 디렉토리 생성
const targetDir = path.dirname(targetPath);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`✅ 디렉토리 생성: ${targetDir}`);
}

// 템플릿 생성
const generateTemplate = () => {
  const metadata = `---
title: ${params.title || '제목없음'}
date: ${date}
project: ${projectConfig.name}
category: ${params.type}
status: ${params.status || '진행중'}
tags: [${projectConfig.name}, ${params.type}]
---

`;

  switch (params.type) {
    case '기획':
      return metadata + `# ${params.title}

## 📅 개요
- **작성일**: ${date}
- **프로젝트**: ${projectConfig.name}
- **상태**: ${params.status || '진행중'}

## 🎯 목적
{기획 목적}

## 📋 주요 기능
1. {기능 1}
2. {기능 2}

## 🔄 변경 이력
| 날짜 | 변경 내용 | 사유 |
|------|-----------|------|
| ${date} | 최초 작성 | - |
`;

    case '아키텍처':
      return metadata + `# ${params.title}

## 📐 시스템 구조

\`\`\`mermaid
graph TD
    A[Client] --> B[Next.js]
    B --> C[MongoDB]
    B --> D[Cloudflare R2]
\`\`\`

## 🏗️ 기술 스택
- **Frontend**: Next.js 14, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas
- **Storage**: Cloudflare R2

## 🔄 변경 이력
| 날짜 | 변경 내용 | 사유 |
|------|-----------|------|
| ${date} | 최초 작성 | - |
`;

    case '스키마':
      return metadata + `# ${params.title}

## 📊 컬렉션 구조

\`\`\`typescript
interface Schema {
  _id: ObjectId;
  // 스키마 정의
}
\`\`\`

## 🔍 인덱스
| 필드 | 타입 | 설명 |
|------|------|------|
| _id | ObjectId | 기본 키 |

## 🔄 변경 이력
| 날짜 | 변경 내용 | 사유 |
|------|-----------|------|
| ${date} | 최초 작성 | - |
`;

    case '기능개발':
      return metadata + `# ${params.title}

## 📅 개요
- **개발 기간**: ${date} ~
- **담당**: Claude
- **상태**: ${params.status || '개발중'}

## 🎯 기능 설명
{기능 상세 설명}

## 💻 구현 내용

### 주요 파일
- \`{파일 경로}\`: {설명}

## ✅ 테스트
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] E2E 테스트

## 📚 관련 문서
- [[]]
`;

    case '보안':
      return metadata + `# ${params.title}

## 🔒 보안 수준
- **심각도**: ${params.severity || 'Medium'}
- **적용 범위**: ${params.scope || '전체'}

## 📋 보안 요소
1. {보안 요소 1}

## 🛡️ 구현 내용
{구현 상세}

## ✅ 검증 방법
{검증 절차}
`;

    case '트러블슈팅':
      return metadata + `# ${params.title}

## 📅 타임라인
- **발생일**: ${date}
- **해결일**: ${params.resolved || '진행중'}
- **소요시간**: ${params.duration || '-'}

## 🔍 문제 상황

### 증상
{구체적인 증상}

### 에러 메시지
\`\`\`
{에러 메시지}
\`\`\`

### 발생 환경
- **OS**: Windows 11
- **Node.js**: v18.17.0
- **브라우저**: Chrome

## 💡 원인 분석

### 근본 원인
{문제의 근본 원인}

### 영향 범위
- {영향받은 기능/파일}

## 🛠️ 해결 과정

### 시도한 방법들
1. **첫 번째 시도** - ❌ 실패
2. **최종 해결** - ✅ 성공

### 최종 해결 방법
\`\`\`typescript
// 해결 코드
\`\`\`

## 🚀 예방 조치
- [ ] {재발 방지 대책}

## 📚 참고 자료
- [[]]
`;

    default:
      return metadata + `# ${params.title}\n\n내용을 작성하세요.\n`;
  }
};

// 파일 저장
const content = params.content || generateTemplate();

try {
  fs.writeFileSync(targetPath, content, 'utf-8');
  console.log(`✅ 문서 저장 완료: ${targetPath}`);
  console.log(`📝 파일명: ${filename}`);
  console.log(`📂 카테고리: ${params.type}`);

  // 옵시디언에서 열기 (Windows)
  if (process.platform === 'win32' && params.open !== 'false') {
    const { exec } = require('child_process');
    exec(`start "" "${targetPath}"`, (error) => {
      if (error) {
        console.log('⚠️  파일 열기 실패 (수동으로 열어주세요)');
      } else {
        console.log('📖 옵시디언에서 문서 열기...');
      }
    });
  }
} catch (error) {
  console.error('⛔ 문서 저장 실패:', error.message);
  process.exit(1);
}
