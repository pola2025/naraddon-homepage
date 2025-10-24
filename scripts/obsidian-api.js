#!/usr/bin/env node
/**
 * 옵시디언 REST API 연동 모듈
 *
 * @purpose 옵시디언 로컬 REST API를 통한 문서 자동 저장
 * @api http://127.0.0.1:27123
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 설정 로드
const config = JSON.parse(
  fs.readFileSync('.claude/obsidian-config.json', 'utf-8')
);

/**
 * 옵시디언 API 요청
 */
class ObsidianAPI {
  constructor() {
    this.host = config.api.host;
    this.token = config.api.token;
  }

  /**
   * HTTP 요청 헬퍼
   */
  async request(method, endpoint, data = null) {
    const url = new URL(endpoint, this.host);

    return new Promise((resolve, reject) => {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(url, options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body || '{}'));
            } catch {
              resolve(body);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Vault 정보 조회
   */
  async getVault() {
    return this.request('GET', '/vault/');
  }

  /**
   * 파일 생성/수정
   * @param {string} filePath - Vault 내 상대 경로
   * @param {string} content - 파일 내용
   */
  async putFile(filePath, content) {
    return this.request('PUT', `/vault/${encodeURIComponent(filePath)}`, {
      content,
    });
  }

  /**
   * 파일 읽기
   */
  async getFile(filePath) {
    return this.request('GET', `/vault/${encodeURIComponent(filePath)}`);
  }

  /**
   * 파일 검색
   */
  async search(query) {
    return this.request('POST', '/search/simple/', {
      query,
    });
  }

  /**
   * 액티브 파일 열기
   */
  async openFile(filePath) {
    return this.request('POST', '/open/' + encodeURIComponent(filePath));
  }
}

/**
 * 문서 자동 저장 헬퍼
 */
class ObsidianDocManager {
  constructor() {
    this.api = new ObsidianAPI();
    this.config = config;
  }

  /**
   * 현재 프로젝트 감지
   */
  detectProject() {
    const currentDir = process.cwd();
    const projectName = path.basename(currentDir);
    const projectConfig = this.config.projects[projectName];

    if (!projectConfig) {
      throw new Error(`프로젝트를 찾을 수 없습니다: ${projectName}`);
    }

    return { name: projectName, config: projectConfig };
  }

  /**
   * AI 친화적 파일 경로 생성
   *
   * 규칙:
   * 1. 날짜는 YYYY-MM-DD 형식
   * 2. 카테고리는 한글로 명확히
   * 3. 기능명은 구체적으로
   * 4. 트러블슈팅은 "발생위치-에러타입-원인" 형식
   *
   * 예시:
   * - 2025-10-19-심사관관리-이미지업로드-UX개선.md
   * - 2025-10-22-관리자인증-403에러-JWT콜백미조회.md
   */
  generatePath({ type, title, function: func, errorType, cause }) {
    const project = this.detectProject();
    const date = new Date().toISOString().split('T')[0];
    const categoryFolder = this.config.templates[type];

    let filename;

    if (type === '트러블슈팅') {
      // 트러블슈팅: {발생기능}-{에러타입}-{근본원인}
      filename = `${date}-${func || '미분류'}-${errorType || '에러'}-${cause || '원인분석중'}.md`;
    } else {
      // 일반 문서: {날짜}-{제목}
      filename = `${date}-${title}.md`;
    }

    // 특수문자 정리
    filename = filename.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '');

    return `${project.config.path}/${categoryFolder}/${filename}`;
  }

  /**
   * AI 친화적 메타데이터 생성
   *
   * 목적: Claude가 문서를 읽었을 때 즉시 이해할 수 있도록
   */
  generateMetadata(params) {
    const project = this.detectProject();
    const date = new Date().toISOString().split('T')[0];

    const metadata = {
      제목: params.title || '제목없음',
      날짜: date,
      프로젝트: project.config.name,
      카테고리: params.type,
      상태: params.status || '진행중',
    };

    // 자동 태그 생성
    const tags = this.generateTags(params);
    metadata.tags = tags;

    // 트러블슈팅 전용 메타데이터
    if (params.type === '트러블슈팅') {
      metadata.발생기능 = params.function || '미분류';
      metadata.에러타입 = params.errorType || '알 수 없음';
      metadata.심각도 = params.severity || 'Medium';
      metadata.해결여부 = params.resolved ? '해결완료' : '진행중';
    }

    // 기능개발 전용 메타데이터
    if (params.type === '기능개발') {
      metadata.구현파일 = params.files || [];
      metadata.관련API = params.apis || [];
      metadata.테스트완료 = params.tested || false;
    }

    // YAML 형식으로 변환
    const yaml = Object.entries(metadata)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          if (key === 'tags') {
            // 태그는 배열 형식으로
            return `tags:\n${value.map(t => `  - ${t}`).join('\n')}`;
          }
          return `${key}: [${value.join(', ')}]`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');

    return `---\n${yaml}\n---\n\n`;
  }

  /**
   * 자동 태그 생성 (3단계 분류)
   */
  generateTags(params) {
    const project = this.detectProject();
    const tags = new Set();

    // Level 1: 프로젝트 태그
    tags.add(project.config.name);

    // Level 2 & 3: 타입별 자동 태그
    switch (params.type) {
      case '트러블슈팅':
        if (params.function) tags.add(params.function);
        tags.add('트러블슈팅');
        tags.add('버그픽스');
        if (params.errorType) tags.add(params.errorType);
        if (params.resolved) tags.add('해결완료');
        else tags.add('진행중');
        break;

      case '기능개발':
        if (params.domain) tags.add(params.domain);
        tags.add('신규기능');
        if (params.tech) tags.add(params.tech);
        break;

      case '아키텍처':
        tags.add('아키텍처');
        if (params.pattern) tags.add(params.pattern);
        break;

      case '스키마':
        tags.add('데이터베이스');
        tags.add('스키마');
        if (params.collection) tags.add(params.collection);
        break;

      case '보안':
        tags.add('보안');
        if (params.securityType) tags.add(params.securityType);
        if (params.severity) tags.add(params.severity);
        break;
    }

    // 파일 경로에서 자동 추론
    if (params.files) {
      params.files.forEach(file => {
        if (file.includes('lib/auth/')) tags.add('인증');
        if (file.includes('app/admin/')) tags.add('관리자');
        if (file.includes('components/')) tags.add('프론트엔드');
        if (file.includes('api/')) tags.add('API');
      });
    }

    // 에러 메시지에서 자동 추론
    if (params.error) {
      if (params.error.includes('403')) tags.add('403에러');
      if (params.error.includes('404')) tags.add('404에러');
      if (params.error.includes('500')) tags.add('500에러');
      if (params.error.includes('MongoDB')) tags.add('MongoDB');
      if (params.error.includes('CORS')) tags.add('CORS');
    }

    // 추가 태그
    if (params.extraTags) {
      params.extraTags.forEach(tag => tags.add(tag));
    }

    return Array.from(tags);
  }

  /**
   * AI 친화적 문서 템플릿 생성
   *
   * 특징:
   * 1. 명확한 구조 (AI가 섹션을 쉽게 파악)
   * 2. 구체적인 제목 (무엇을 했는지 명확히)
   * 3. 컨텍스트 제공 (왜 이 작업을 했는지)
   */
  generateTemplate(params) {
    const metadata = this.generateMetadata(params);
    const project = this.detectProject();

    switch (params.type) {
      case '트러블슈팅':
        return metadata + `# ${params.function || '기능'} - ${params.errorType || '에러'} - ${params.cause || '원인'}

## 📋 문제 요약
- **발생 위치**: ${params.function || '미분류'}
- **에러 타입**: ${params.errorType || '알 수 없음'}
- **근본 원인**: ${params.cause || '분석 중'}

## 🔍 상세 상황

### 어떤 문제가 발생했는가?
${params.symptom || '{증상 설명}'}

### 에러 메시지
\`\`\`
${params.error || '{에러 메시지}'}
\`\`\`

### 어떤 환경에서 발생했는가?
- **브라우저**: ${params.browser || 'Chrome'}
- **OS**: ${params.os || 'Windows 11'}
- **관련 파일**: ${params.files ? params.files.join(', ') : '미분류'}

## 💡 원인 분석

### 왜 이 문제가 발생했는가?
${params.analysis || '{원인 분석}'}

### 어떤 영향이 있었는가?
${params.impact || '{영향 범위}'}

## 🛠️ 해결 과정

### 무엇을 시도했는가?
1. ${params.attempts || '시도 내용'}

### 최종 해결 방법
\`\`\`typescript
${params.solution || '// 해결 코드'}
\`\`\`

### 어떤 파일을 변경했는가?
${params.changedFiles || '- 변경 파일 목록'}

## 🚀 재발 방지

### 어떻게 예방할 것인가?
${params.prevention || '- 예방 대책'}

## 🔗 관련 문서
${params.links || '- [[관련 문서]]'}

---
**해결 일시**: ${params.resolvedAt || '진행중'}
**작업자**: Claude
`;

      case '기능개발':
        return metadata + `# ${params.title}

## 📋 기능 요약
- **무엇을 만들었는가**: ${params.what || '{기능 설명}'}
- **왜 필요한가**: ${params.why || '{필요성}'}
- **어떻게 동작하는가**: ${params.how || '{동작 방식}'}

## 💻 구현 상세

### 주요 파일
${params.files ? params.files.map(f => `- \`${f}\`: ${params.fileDesc?.[f] || '설명'}`).join('\n') : '- 파일 목록'}

### 핵심 코드
\`\`\`typescript
${params.code || '// 핵심 코드'}
\`\`\`

### API 엔드포인트 (있는 경우)
${params.apis ? params.apis.map(api => `- ${api.method} ${api.path}: ${api.desc}`).join('\n') : '- 없음'}

## 🧪 테스트

### 테스트 시나리오
${params.testScenarios || '1. 기본 시나리오'}

### 테스트 결과
- [ ] 단위 테스트: ${params.unitTest ? '✅ 통과' : '⏳ 대기중'}
- [ ] 통합 테스트: ${params.integrationTest ? '✅ 통과' : '⏳ 대기중'}
- [ ] E2E 테스트: ${params.e2eTest ? '✅ 통과' : '⏳ 대기중'}

## 📸 스크린샷/데모
${params.screenshots || '{스크린샷 또는 데모 링크}'}

## 🔗 관련 문서
${params.relatedDocs || '- [[관련 문서]]'}

---
**개발 완료**: ${params.completedAt || new Date().toISOString().split('T')[0]}
`;

      case '기획':
        return metadata + `# ${params.title}

## 🎯 기획 배경

### 왜 이 기획이 필요한가?
${params.background || '{배경 설명}'}

### 해결하려는 문제
${params.problem || '{문제 정의}'}

## 📋 주요 기능

### 핵심 기능 목록
${params.features ? params.features.map((f, i) => `${i + 1}. **${f.name}**: ${f.desc}`).join('\n') : '1. 기능 목록'}

## 👥 사용자 시나리오

### 누가 사용하는가?
${params.users || '{사용자 페르소나}'}

### 어떻게 사용하는가?
${params.userFlow || '1. 사용자 플로우'}

## 🔄 변경 이력
| 날짜 | 변경 내용 | 변경 이유 |
|------|-----------|-----------|
${params.changes || `| ${new Date().toISOString().split('T')[0]} | 최초 작성 | - |`}

## 🔗 관련 문서
${params.relatedDocs || '- [[아키텍처]]'}
`;

      default:
        return metadata + `# ${params.title}\n\n${params.content || '내용을 작성하세요.'}\n`;
    }
  }

  /**
   * 문서 저장
   */
  async save(params) {
    try {
      const filePath = this.generatePath(params);
      const content = this.generateTemplate(params);

      console.log(`📝 저장 중: ${filePath}`);

      await this.api.putFile(filePath, content);

      console.log(`✅ 저장 완료!`);
      console.log(`📂 경로: ${filePath}`);

      // 자동으로 파일 열기
      if (params.autoOpen !== false) {
        await this.api.openFile(filePath);
        console.log(`📖 옵시디언에서 열기 완료`);
      }

      return filePath;
    } catch (error) {
      console.error(`⛔ 저장 실패:`, error.message);
      throw error;
    }
  }

  /**
   * 프로젝트 초기화 (폴더 구조 생성)
   */
  async initProject() {
    const project = this.detectProject();
    const categories = Object.values(this.config.templates);

    console.log(`📂 프로젝트 초기화: ${project.config.name}`);

    for (const category of categories) {
      const folderPath = `${project.config.path}/${category}`;
      const readmePath = `${folderPath}/README.md`;

      const readmeContent = `# ${category}

이 폴더는 **${project.config.name}** 프로젝트의 ${category} 문서를 저장합니다.

## 📁 구조
- 모든 파일은 \`YYYY-MM-DD-제목.md\` 형식으로 저장됩니다.
- AI가 쉽게 이해할 수 있도록 구체적이고 명확한 제목을 사용합니다.

---
자동 생성: ${new Date().toISOString().split('T')[0]}
`;

      try {
        await this.api.putFile(readmePath, readmeContent);
        console.log(`✅ 생성: ${folderPath}`);
      } catch (error) {
        console.error(`⚠️  실패: ${folderPath} - ${error.message}`);
      }
    }

    console.log(`✅ 프로젝트 초기화 완료!`);
  }

  /**
   * 관련 문서 검색 (AI 컨텍스트용)
   */
  async findRelatedDocs(keyword) {
    const project = this.detectProject();
    const query = `path:${project.config.path} ${keyword}`;

    const results = await this.api.search(query);
    return results;
  }
}

// 모듈 내보내기
module.exports = {
  ObsidianAPI,
  ObsidianDocManager,
};

// CLI 실행
if (require.main === module) {
  const manager = new ObsidianDocManager();

  const command = process.argv[2];

  switch (command) {
    case 'init':
      manager.initProject();
      break;

    case 'save':
      // 예시: node obsidian-api.js save --type=트러블슈팅 --function=관리자인증 --errorType=403에러 --cause=JWT콜백미조회
      const args = {};
      process.argv.slice(3).forEach(arg => {
        const [key, value] = arg.replace('--', '').split('=');
        args[key] = value;
      });
      manager.save(args);
      break;

    case 'test':
      manager.api.getVault()
        .then(vault => {
          console.log('✅ Vault 연결 성공:', vault);
        })
        .catch(err => {
          console.error('⛔ Vault 연결 실패:', err.message);
        });
      break;

    default:
      console.log(`
옵시디언 자동 문서화 도구

사용법:
  node obsidian-api.js init                          # 프로젝트 초기화
  node obsidian-api.js test                          # API 연결 테스트
  node obsidian-api.js save --type=기능개발 --title=기능명
  node obsidian-api.js save --type=트러블슈팅 --function=기능 --errorType=에러 --cause=원인
      `);
  }
}
