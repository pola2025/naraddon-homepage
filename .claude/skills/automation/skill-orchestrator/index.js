/**
 * Skill Orchestrator
 * @purpose 작업 유형에 따라 적절한 Skill을 자동으로 실행
 * @context 지휘자처럼 여러 Skill을 조화롭게 실행
 */

const SkillEngine = require('../../../skill-engine');

class SkillOrchestrator {
  constructor() {
    this.workflows = {
      'troubleshooting': {
        name: '트러블슈팅',
        pre: [],
        post: [
          'automation/metadata-auto-generator',
          'automation/obsidian-auto-doc',
        ],
      },
      'feature-development': {
        name: '기능개발',
        pre: [],
        post: [
          'automation/metadata-auto-generator',
          'automation/obsidian-auto-doc',
        ],
      },
      'architecture': {
        name: '아키텍처',
        pre: [],
        post: [
          'automation/metadata-auto-generator',
          'automation/obsidian-auto-doc',
        ],
      },
      'conversation': {
        name: '대화기록',
        pre: [],
        post: [
          'automation/metadata-auto-generator',
          'automation/obsidian-auto-doc',
        ],
      },
    };
  }

  /**
   * 오케스트레이터 실행
   * @param {string} taskType - 작업 유형 (troubleshooting, feature-development 등)
   * @param {object} context - 실행 컨텍스트
   */
  async execute(taskType, context = {}) {
    const workflow = this.workflows[taskType];

    if (!workflow) {
      console.warn(`⚠️  알 수 없는 작업 유형: ${taskType}`);
      console.log('사용 가능한 작업 유형:', Object.keys(this.workflows).join(', '));
      return null;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎯 Skill Orchestrator - ${workflow.name} 워크플로우 시작`);
    console.log('='.repeat(60) + '\n');

    const results = {
      taskType,
      workflowName: workflow.name,
      pre: {},
      post: {},
      context,
    };

    try {
      // PRE Skills 실행
      if (workflow.pre.length > 0) {
        console.log('='.repeat(60));
        console.log('PRE SKILLS 실행 중...');
        console.log('='.repeat(60) + '\n');

        for (const skillPath of workflow.pre) {
          const result = await SkillEngine.execute(skillPath, context);
          results.pre[skillPath] = result;

          // 결과를 다음 Skill에 전달
          context = { ...context, ...result };
        }
      }

      // POST Skills 실행
      if (workflow.post.length > 0) {
        console.log('='.repeat(60));
        console.log('POST SKILLS 실행 중...');
        console.log('='.repeat(60) + '\n');

        for (const skillPath of workflow.post) {
          const result = await SkillEngine.execute(skillPath, context);
          results.post[skillPath] = result;

          // 결과를 다음 Skill에 전달
          context = { ...context, ...result };
        }
      }

      console.log('='.repeat(60));
      console.log('✅ 워크플로우 완료!');
      console.log('='.repeat(60) + '\n');

      this.printSummary(results);

      return results;
    } catch (error) {
      console.error('❌ 워크플로우 실행 중 오류:', error.message);
      throw error;
    }
  }

  /**
   * 결과 요약 출력
   */
  printSummary(results) {
    console.log('📊 실행 결과 요약:\n');

    console.log(`작업 유형: ${results.workflowName}`);
    console.log(`PRE Skills: ${Object.keys(results.pre).length}개`);
    console.log(`POST Skills: ${Object.keys(results.post).length}개\n`);

    // 메타데이터 품질 (metadata-auto-generator 결과)
    const metadataResult = results.post['automation/metadata-auto-generator'];
    if (metadataResult) {
      console.log('📊 메타데이터 품질:');
      console.log(`   점수: ${metadataResult.quality}/100`);
      console.log(`   완성도: ${metadataResult.validation.completeness.toFixed(1)}%`);
      if (metadataResult.validation.missing.length > 0) {
        console.log(`   누락: ${metadataResult.validation.missing.join(', ')}`);
      }
      console.log('');
    }

    // Obsidian 문서 (obsidian-auto-doc 결과)
    const docResult = results.post['automation/obsidian-auto-doc'];
    if (docResult) {
      console.log('📝 Obsidian 문서:');
      console.log(`   파일: ${docResult.filePath}`);
      console.log(`   크기: ${docResult.documentSize} bytes`);
      console.log('');
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * 사용 가능한 워크플로우 목록
   */
  listWorkflows() {
    console.log('📋 사용 가능한 워크플로우:\n');

    for (const [key, workflow] of Object.entries(this.workflows)) {
      console.log(`${key}:`);
      console.log(`  이름: ${workflow.name}`);
      console.log(`  PRE Skills: ${workflow.pre.length}개`);
      console.log(`  POST Skills: ${workflow.post.length}개`);
      console.log('');
    }
  }

  /**
   * 워크플로우 추가
   */
  addWorkflow(key, workflow) {
    if (this.workflows[key]) {
      console.warn(`⚠️  워크플로우 덮어쓰기: ${key}`);
    }

    this.workflows[key] = workflow;
    console.log(`✅ 워크플로우 추가됨: ${key}`);
  }

  /**
   * Skill 추가 (특정 워크플로우에)
   */
  addSkill(workflowKey, phase, skillPath) {
    const workflow = this.workflows[workflowKey];

    if (!workflow) {
      throw new Error(`워크플로우 없음: ${workflowKey}`);
    }

    if (phase !== 'pre' && phase !== 'post') {
      throw new Error(`잘못된 phase: ${phase} (pre 또는 post만 가능)`);
    }

    workflow[phase].push(skillPath);
    console.log(`✅ Skill 추가: ${skillPath} → ${workflowKey}/${phase}`);
  }
}

module.exports = new SkillOrchestrator();
