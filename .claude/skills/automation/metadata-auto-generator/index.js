/**
 * Metadata Auto-Generator Skill
 * @purpose 대화 컨텍스트로부터 80% 자동으로 메타데이터 생성
 * @context Git diff, 파일 경로, 대화 내용 분석
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'metadata-auto-generator',
  version: '1.0.0',
  description: '메타데이터 자동 생성 Skill',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {string} context.conversation - 대화 내용
   * @param {array} context.modifiedFiles - 수정된 파일 목록
   * @param {string} context.cwd - 현재 작업 디렉토리
   * @param {string} context.gitDiff - Git diff 내용
   */
  async run(context) {
    console.log('📊 [metadata-auto-generator] 메타데이터 자동 생성 시작...\n');

    // 1. 컨텍스트 분석
    const analysis = await this.analyzeContext(context);

    // 2. 메타데이터 추론
    const metadata = await this.inferMetadata(analysis, context);

    // 3. 태그 자동 생성
    metadata.tags = this.generateTags(metadata);

    // 4. 검증
    const validation = this.validate(metadata);

    // 5. 품질 점수 계산
    const qualityScore = this.calculateQualityScore(metadata);

    console.log(`✅ 메타데이터 자동 생성 완료 (품질: ${qualityScore}/100)\n`);

    return {
      metadata,
      quality: qualityScore,
      validation,
      autoInferred: this.getAutoInferredFields(metadata),
    };
  },

  /**
   * 컨텍스트 분석
   */
  async analyzeContext(context) {
    const analysis = {
      project: this.detectProject(context.cwd),
      taskType: this.detectTaskType(context.conversation, context.modifiedFiles),
      moduleInfo: this.detectModule(context.modifiedFiles),
      errorInfo: this.extractErrorInfo(context.conversation),
    };

    console.log('🔍 컨텍스트 분석:');
    console.log(`   프로젝트: ${analysis.project.name}`);
    console.log(`   작업 유형: ${analysis.taskType}`);
    console.log(`   모듈: ${analysis.moduleInfo.modules.join(', ') || '없음'}`);

    return analysis;
  },

  /**
   * 프로젝트 감지
   */
  detectProject(cwd) {
    const configPath = path.join(__dirname, '../../../obsidian-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // cwd가 프로젝트 경로에 포함되는지 확인
    for (const [key, project] of Object.entries(config.projects)) {
      if (cwd.includes(key) || cwd.includes(project.name)) {
        return {
          key,
          name: project.name,
          code: this.generateProjectCode(project.name),
        };
      }
    }

    // 기본값
    return {
      key: 'homepage',
      name: '나라똔',
      code: 'NRDN',
    };
  },

  /**
   * 프로젝트 코드 생성
   */
  generateProjectCode(projectName) {
    const codeMap = {
      '나라똔': 'NRDN',
      '집첵': 'ZPCK',
    };
    return codeMap[projectName] || 'UNKN';
  },

  /**
   * 작업 유형 감지
   */
  detectTaskType(conversation, modifiedFiles) {
    const keywords = {
      '트러블슈팅': ['에러', '오류', '버그', '문제', '안돼', '403', '500', 'error', 'fix'],
      '기능개발': ['구현', '추가', '개발', '만들', 'feature', 'add', '완료'],
      '아키텍처': ['설계', '구조', '아키텍처', 'design', 'architecture'],
      '리팩토링': ['리팩토링', '개선', '최적화', 'refactor', 'optimize'],
    };

    // 대화에서 키워드 매칭
    for (const [type, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (conversation.toLowerCase().includes(word)) {
          return type;
        }
      }
    }

    // 파일 경로 기반 추론
    if (modifiedFiles.some(f => f.includes('test'))) {
      return '테스트';
    }

    return '기타';
  },

  /**
   * 모듈 감지
   */
  detectModule(modifiedFiles) {
    const moduleMap = {
      'lib/auth': '인증',
      'app/admin': '관리자',
      'app/api/policy-news': '정책뉴스',
      'app/api/business-voice': '비즈니스보이스',
      'components/ImageUploader': '파일관리',
      'models/': '스키마',
    };

    const modules = new Set();
    let primaryModule = null;

    for (const file of modifiedFiles) {
      for (const [pattern, module] of Object.entries(moduleMap)) {
        if (file.includes(pattern)) {
          modules.add(module);
          if (!primaryModule) {
            primaryModule = module;
          }
        }
      }
    }

    return {
      modules: Array.from(modules),
      primary: primaryModule,
    };
  },

  /**
   * 에러 정보 추출
   */
  extractErrorInfo(conversation) {
    const errorPatterns = {
      '403': /403|forbidden/i,
      '500': /500|internal server error/i,
      '404': /404|not found/i,
      'CORS': /cors|cross-origin/i,
      'MongoDB': /mongodb|mongoose|connection/i,
    };

    const errors = [];
    for (const [errorType, pattern] of Object.entries(errorPatterns)) {
      if (pattern.test(conversation)) {
        errors.push(errorType);
      }
    }

    return {
      hasError: errors.length > 0,
      types: errors,
      primary: errors[0] || null,
    };
  },

  /**
   * 메타데이터 추론
   */
  async inferMetadata(analysis, context) {
    const metadata = {
      // Level 1: 필수 메타데이터 (100% 자동)
      날짜: new Date().toISOString().split('T')[0],
      프로젝트: analysis.project.name,
      프로젝트코드: analysis.project.code,
      카테고리: analysis.taskType,

      // Level 2: 기능 모듈 (70% 자동)
      기능모듈: analysis.moduleInfo.primary,

      // Level 3: 상태 (80% 자동)
      상태: '완료',
    };

    // 카테고리별 특화 메타데이터
    if (analysis.taskType === '트러블슈팅') {
      Object.assign(metadata, this.generateTroubleshootingMetadata(analysis, context));
    } else if (analysis.taskType === '기능개발') {
      Object.assign(metadata, this.generateFeatureMetadata(analysis, context));
    }

    // 타이틀 자동 생성
    metadata.title = this.generateTitle(metadata);

    return metadata;
  },

  /**
   * 트러블슈팅 메타데이터 생성
   */
  generateTroubleshootingMetadata(analysis, context) {
    return {
      발생기능: analysis.moduleInfo.primary || '미상',
      에러타입: analysis.errorInfo.primary || '일반오류',
      근본원인: this.inferRootCause(context.conversation),
      심각도: this.calculateSeverity(context.conversation, analysis),
      해결여부: '해결완료',
    };
  },

  /**
   * 기능개발 메타데이터 생성
   */
  generateFeatureMetadata(analysis, context) {
    return {
      기능범주: analysis.moduleInfo.primary || '기타',
      구현파일: context.modifiedFiles.filter(f => !f.includes('test')),
      관련API: this.extractAPIEndpoints(context.modifiedFiles),
      테스트완료: context.modifiedFiles.some(f => f.includes('test')),
    };
  },

  /**
   * 근본 원인 추론
   */
  inferRootCause(conversation) {
    const causePatterns = {
      'JWT콜백미조회': /jwt.*콜백|콜백.*role|role.*조회/i,
      '환경변수누락': /환경변수|env|missing/i,
      'DB연결실패': /mongodb|connection|db.*연결/i,
      'CORS설정오류': /cors|헤더|origin/i,
    };

    for (const [cause, pattern] of Object.entries(causePatterns)) {
      if (pattern.test(conversation)) {
        return cause;
      }
    }

    return '원인분석중';
  },

  /**
   * 심각도 계산
   */
  calculateSeverity(conversation, analysis) {
    let severity = 'Medium';

    // 키워드 기반 심각도 상승
    if (/프로덕션|배포|production/i.test(conversation)) {
      severity = 'Critical';
    } else if (/관리자|인증|로그인|auth/i.test(conversation)) {
      severity = 'High';
    } else if (/UI|디자인|스타일/i.test(conversation)) {
      severity = 'Low';
    }

    return severity;
  },

  /**
   * API 엔드포인트 추출
   */
  extractAPIEndpoints(modifiedFiles) {
    return modifiedFiles
      .filter(f => f.includes('app/api/') && f.includes('route.ts'))
      .map(f => {
        const path = f.replace('app/api/', '/api/').replace('/route.ts', '');
        return `POST ${path}`;
      });
  },

  /**
   * 태그 자동 생성
   */
  generateTags(metadata) {
    const tags = [];

    // Level 1: 프로젝트
    tags.push(`프로젝트/${metadata.프로젝트}`);

    // Level 2: 기능 모듈 (중첩)
    if (metadata.기능모듈) {
      const modules = metadata.기능모듈.split('/');
      modules.forEach((_, index) => {
        const path = modules.slice(0, index + 1).join('/');
        tags.push(`기능/${path}`);
      });
    }

    // Level 3: 작업 유형
    const typeMap = {
      '트러블슈팅': '작업유형/트러블슈팅/버그픽스',
      '기능개발': '작업유형/신규기능',
      '아키텍처': '작업유형/시스템설계',
      '리팩토링': '작업유형/코드개선',
    };
    tags.push(typeMap[metadata.카테고리] || '작업유형/기타');

    // Level 4: 상태
    if (metadata.상태) {
      tags.push(`상태/${metadata.상태}`);
    }

    // Level 5: 심각도 (트러블슈팅만)
    if (metadata.심각도) {
      tags.push(`심각도/${metadata.심각도}`);
    }

    return tags;
  },

  /**
   * 타이틀 자동 생성
   */
  generateTitle(metadata) {
    if (metadata.카테고리 === '트러블슈팅') {
      return `${metadata.발생기능}-${metadata.에러타입}-${metadata.근본원인}`;
    } else if (metadata.카테고리 === '기능개발') {
      return `${metadata.기능범주}-${metadata.기능모듈 || '기능'}-구현`;
    }

    return `${metadata.카테고리}-${metadata.기능모듈 || '작업'}`;
  },

  /**
   * 메타데이터 검증
   */
  validate(metadata) {
    const requiredFields = {
      '공통': ['title', '날짜', '프로젝트', '카테고리', 'tags'],
      '트러블슈팅': ['발생기능', '에러타입', '근본원인', '심각도', '해결여부'],
      '기능개발': ['기능범주', '상태'],
    };

    const required = [
      ...requiredFields['공통'],
      ...(requiredFields[metadata.카테고리] || []),
    ];

    const missing = required.filter(field => !metadata[field]);

    return {
      isValid: missing.length === 0,
      missing,
      completeness: ((required.length - missing.length) / required.length) * 100,
    };
  },

  /**
   * 품질 점수 계산
   */
  calculateQualityScore(metadata) {
    let score = 0;

    // 필수 필드 (40점)
    if (metadata.title) score += 10;
    if (metadata.프로젝트) score += 10;
    if (metadata.tags && metadata.tags.length >= 3) {
      score += 20;
    } else if (metadata.tags) {
      score += metadata.tags.length * 5;
    }

    // 기능 모듈 (20점)
    if (metadata.기능모듈) score += 20;

    // 카테고리별 특수 필드 (20점)
    if (metadata.카테고리 === '트러블슈팅') {
      if (metadata.근본원인) score += 10;
      if (metadata.심각도) score += 10;
    } else if (metadata.카테고리 === '기능개발') {
      if (metadata.구현파일 && metadata.구현파일.length > 0) score += 10;
      if (metadata.테스트완료) score += 10;
    }

    // 상태 (20점)
    if (metadata.상태) score += 20;

    return Math.min(score, 100);
  },

  /**
   * 자동 추론된 필드 목록
   */
  getAutoInferredFields(metadata) {
    const autoFields = [
      '날짜',
      '프로젝트',
      '프로젝트코드',
      '카테고리',
      '기능모듈',
      '상태',
      'tags',
      'title',
    ];

    if (metadata.카테고리 === '트러블슈팅') {
      autoFields.push('발생기능', '에러타입', '심각도', '해결여부');
    } else if (metadata.카테고리 === '기능개발') {
      autoFields.push('기능범주', '구현파일', '관련API', '테스트완료');
    }

    return autoFields;
  },
};
