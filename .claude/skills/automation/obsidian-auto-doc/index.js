/**
 * Obsidian Auto-Doc Skill
 * @purpose REST API로 직접 Obsidian 문서 생성
 * @context Templater 없이 100% 자동화
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

module.exports = {
  name: 'obsidian-auto-doc',
  version: '1.0.0',
  description: 'Obsidian 문서 자동 생성 Skill',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {object} context.metadata - 메타데이터 (metadata-auto-generator 결과)
   * @param {string} context.content - 문서 본문
   * @param {string} context.conversation - 대화 내용 (본문 생성용)
   */
  async run(context) {
    console.log('📝 [obsidian-auto-doc] Obsidian 문서 생성 시작...\n');

    // 0. 설정 로드
    const config = this.loadConfig();

    // 1. 메타데이터 확인
    const metadata = context.metadata || await this.generateMetadata(context);

    // 2. 본문 생성 (content가 없으면 conversation으로부터 생성)
    const content = context.content || this.generateContent(context, metadata);

    // 3. 완전한 문서 조립
    const document = this.assembleDocument(metadata, content);

    // 4. Obsidian REST API로 저장
    const filePath = await this.saveToObsidian(config, metadata, document);

    // 5. 검증
    await this.verifyDocument(config, filePath);

    console.log(`✅ [obsidian-auto-doc] 문서 생성 완료: ${filePath}\n`);

    return {
      filePath,
      metadata,
      documentSize: document.length,
    };
  },

  /**
   * 설정 로드
   */
  loadConfig() {
    const configPath = path.join(__dirname, '../../../obsidian-config.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  },

  /**
   * 메타데이터 생성 (fallback)
   */
  async generateMetadata(context) {
    const metadataGenerator = require('../metadata-auto-generator');
    const result = await metadataGenerator.run(context);
    return result.metadata;
  },

  /**
   * 본문 생성
   */
  generateContent(context, metadata) {
    if (metadata.카테고리 === '트러블슈팅') {
      return this.generateTroubleshootingContent(context, metadata);
    } else if (metadata.카테고리 === '기능개발') {
      return this.generateFeatureContent(context, metadata);
    } else if (metadata.카테고리 === '대화기록') {
      return this.generateConversationContent(context, metadata);
    }

    return this.generateGenericContent(context, metadata);
  },

  /**
   * 트러블슈팅 본문 생성
   */
  generateTroubleshootingContent(context, metadata) {
    const content = [];

    content.push('## 📋 문제 요약\n');
    content.push(`- **발생 위치**: ${metadata.발생기능 || '미상'}`);
    content.push(`- **에러 타입**: ${metadata.에러타입 || '일반오류'}`);
    content.push(`- **근본 원인**: ${metadata.근본원인 || '분석 중'}\n`);

    content.push('## 🔍 상세 상황\n');
    content.push('### 어떤 문제가 발생했는가?\n');
    content.push(this.extractProblemDescription(context.conversation) + '\n');

    // 에러 메시지 추출
    const errorMessage = this.extractErrorMessage(context.conversation);
    if (errorMessage) {
      content.push('### 에러 메시지\n');
      content.push('```');
      content.push(errorMessage);
      content.push('```\n');
    }

    content.push('## 💡 원인 분석\n');
    content.push(metadata.근본원인 || '원인 분석 중...\n');

    content.push('## 🛠️ 해결 과정\n');

    // 해결 코드 추출
    const solutionCode = this.extractSolutionCode(context);
    if (solutionCode) {
      content.push('### 최종 해결 방법\n');
      content.push('```typescript');
      content.push(solutionCode);
      content.push('```\n');
    }

    content.push('## 🚀 재발 방지\n');
    content.push('- [ ] 모니터링 설정');
    content.push('- [ ] 테스트 케이스 추가');
    content.push('- [ ] 문서화 업데이트\n');

    content.push('## 🔗 관련 문서\n');
    // 관련 문서는 나중에 수동으로 추가
    content.push('- [[관련문서1]]');
    content.push('- [[관련문서2]]');

    return content.join('\n');
  },

  /**
   * 기능개발 본문 생성
   */
  generateFeatureContent(context, metadata) {
    const content = [];

    content.push('## 📋 기능 요약\n');
    content.push(`- **기능 범주**: ${metadata.기능범주 || '기타'}`);
    content.push(`- **상태**: ${metadata.상태 || '진행중'}\n`);

    content.push('## 🎯 구현 내용\n');
    content.push(this.extractImplementationDescription(context.conversation) + '\n');

    // 구현 파일
    if (metadata.구현파일 && metadata.구현파일.length > 0) {
      content.push('## 💻 구현 파일\n');
      metadata.구현파일.forEach(file => {
        content.push(`- \`${file}\``);
      });
      content.push('');
    }

    // API 엔드포인트
    if (metadata.관련API && metadata.관련API.length > 0) {
      content.push('## 🌐 API 엔드포인트\n');
      metadata.관련API.forEach(api => {
        content.push(`- ${api}`);
      });
      content.push('');
    }

    content.push('## ✅ 테스트\n');
    if (metadata.테스트완료) {
      content.push('- [x] 단위 테스트');
      content.push('- [x] 통합 테스트');
    } else {
      content.push('- [ ] 단위 테스트 작성 필요');
      content.push('- [ ] 통합 테스트 작성 필요');
    }

    return content.join('\n');
  },

  /**
   * 대화기록 본문 생성
   */
  generateConversationContent(context, metadata) {
    const content = [];

    content.push('## 💬 대화 요약\n');
    content.push(context.conversation.substring(0, 500) + '...\n');

    content.push('## 📝 주요 내용\n');
    content.push('- 항목 1');
    content.push('- 항목 2');
    content.push('- 항목 3\n');

    content.push('## 🎯 결과물\n');
    content.push('대화를 통해 도출된 결과...\n');

    return content.join('\n');
  },

  /**
   * 일반 본문 생성
   */
  generateGenericContent(context, metadata) {
    return `## 📝 내용\n\n${context.conversation || '내용을 입력하세요.'}\n`;
  },

  /**
   * 문제 설명 추출
   */
  extractProblemDescription(conversation) {
    // 간단한 추출 로직 (첫 100자 정도)
    const lines = conversation.split('\n');
    return lines[0] || '문제 설명 없음';
  },

  /**
   * 에러 메시지 추출
   */
  extractErrorMessage(conversation) {
    const errorPatterns = [
      /error:?\s*(.*)/i,
      /exception:?\s*(.*)/i,
      /(\d{3})\s+(forbidden|not found|internal server error)/i,
    ];

    for (const pattern of errorPatterns) {
      const match = conversation.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  },

  /**
   * 해결 코드 추출
   */
  extractSolutionCode(context) {
    if (context.gitDiff) {
      // Git diff에서 추가된 코드만 추출
      const addedLines = context.gitDiff
        .split('\n')
        .filter(line => line.startsWith('+') && !line.startsWith('+++'))
        .map(line => line.substring(1))
        .join('\n');

      return addedLines || null;
    }

    return null;
  },

  /**
   * 구현 설명 추출
   */
  extractImplementationDescription(conversation) {
    // 간단한 추출 로직
    return conversation.substring(0, 300) || '구현 내용 설명';
  },

  /**
   * 완전한 문서 조립
   */
  assembleDocument(metadata, content) {
    const parts = [];

    // 1. YAML Front Matter
    parts.push(this.generateYAML(metadata));
    parts.push('');

    // 2. 해시태그 라인
    parts.push(this.generateHashtags(metadata.tags));
    parts.push('');

    // 3. 제목
    parts.push(`# ${metadata.title}`);
    parts.push('');

    // 4. 본문
    parts.push(content);

    // 5. 인라인 메타데이터 (Dataview용)
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(this.generateInlineMetadata(metadata));

    // 6. 생성 시간 주석
    parts.push('');
    parts.push(this.generateTimestamp());

    return parts.join('\n');
  },

  /**
   * YAML Front Matter 생성
   */
  generateYAML(metadata) {
    const yaml = ['---'];

    // 필수 필드
    yaml.push(`title: ${metadata.title}`);
    yaml.push(`날짜: ${metadata.날짜}`);
    yaml.push(`프로젝트: ${metadata.프로젝트}`);
    yaml.push(`카테고리: ${metadata.카테고리}`);

    // 카테고리별 특수 필드
    if (metadata.발생기능) yaml.push(`발생기능: ${metadata.발생기능}`);
    if (metadata.에러타입) yaml.push(`에러타입: ${metadata.에러타입}`);
    if (metadata.근본원인) yaml.push(`근본원인: ${metadata.근본원인}`);
    if (metadata.심각도) yaml.push(`심각도: ${metadata.심각도}`);
    if (metadata.해결여부) yaml.push(`해결여부: ${metadata.해결여부}`);

    if (metadata.기능범주) yaml.push(`기능범주: ${metadata.기능범주}`);
    if (metadata.상태) yaml.push(`상태: ${metadata.상태}`);

    // 태그 (배열)
    if (metadata.tags && metadata.tags.length > 0) {
      yaml.push('tags:');
      metadata.tags.forEach(tag => yaml.push(`  - ${tag}`));
    }

    yaml.push('---');
    return yaml.join('\n');
  },

  /**
   * 해시태그 라인 생성
   */
  generateHashtags(tags) {
    if (!tags || tags.length === 0) return '';

    // 중첩 태그에서 마지막 부분만 추출
    const hashtags = tags.map(tag => {
      const parts = tag.split('/');
      return '#' + parts[parts.length - 1];
    });

    return hashtags.join(' ');
  },

  /**
   * 인라인 메타데이터 생성 (Dataview용)
   */
  generateInlineMetadata(metadata) {
    const inline = [];

    if (metadata.카테고리 === '트러블슈팅') {
      inline.push(`발생일시:: ${metadata.날짜}`);
      inline.push(`해결일시:: ${metadata.날짜}`);
      inline.push(`심각도:: ${metadata.심각도 || 'Medium'}`);
    } else if (metadata.카테고리 === '기능개발') {
      inline.push(`개발시작:: ${metadata.날짜}`);
      inline.push(`개발완료:: ${metadata.날짜}`);
      inline.push(`테스트완료:: ${metadata.테스트완료 ? 'Yes' : 'No'}`);
    }

    return inline.join('\n');
  },

  /**
   * 생성 시간 주석
   */
  generateTimestamp() {
    const now = new Date();
    const timestamp = now.toISOString();
    const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19);

    return `<!-- 생성: ${koreanTime} (${timestamp}) | Claude Skill System -->`;
  },

  /**
   * 파일 경로 생성
   */
  generateFilePath(config, metadata) {
    const folderMap = {
      '트러블슈팅': '05-트러블슈팅',
      '기능개발': '03-기능개발',
      '대화기록': '99-대화기록',
      '아키텍처': '01-아키텍처',
      '스키마': '02-스키마',
    };

    const folder = folderMap[metadata.카테고리] || '99-기타';

    // 프로젝트 경로
    const project = config.projects.homepage || config.projects[Object.keys(config.projects)[0]];
    const projectPath = project.path;

    // 파일명 생성
    let filename = `${metadata.날짜}-${metadata.title}`;
    filename = filename.replace(/\s+/g, '-'); // 공백 → 하이픈
    filename = filename.replace(/[<>:"/\\|?*]/g, ''); // 특수문자 제거
    filename += '.md';

    return `${projectPath}/${folder}/${filename}`;
  },

  /**
   * Obsidian REST API로 저장
   */
  async saveToObsidian(config, metadata, document) {
    const apiUrl = new URL(config.api.host);
    const token = config.api.token;

    const filePath = this.generateFilePath(config, metadata);
    const encodedPath = encodeURIComponent(filePath);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: apiUrl.hostname,
        port: apiUrl.port || 27123,
        path: `/vault/${encodedPath}`,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/markdown',
          'Content-Length': Buffer.byteLength(document),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ Obsidian 저장 성공: ${filePath}`);
            resolve(filePath);
          } else {
            reject(new Error(`Obsidian API Error: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Obsidian API 연결 실패: ${error.message}`));
      });

      req.write(document);
      req.end();
    });
  },

  /**
   * 문서 검증
   */
  async verifyDocument(config, filePath) {
    // 간단한 검증: 파일 경로 형식 확인
    const checks = {
      hasDate: /\d{4}-\d{2}-\d{2}/.test(filePath),
      hasCategory: /\d{2}-/.test(filePath),
      hasExtension: filePath.endsWith('.md'),
    };

    const passed = Object.values(checks).every(Boolean);

    if (!passed) {
      console.warn('⚠️  문서 검증 실패:', checks);
    }

    return { passed, checks };
  },
};
