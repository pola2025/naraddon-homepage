/**
 * Claude Skill 실행 엔진
 * @purpose Skill을 실제로 로드하고 실행하는 핵심 엔진
 * @context .md 문서를 넘어 실제 작동하는 Skill 시스템
 */

const path = require('path');
const fs = require('fs');

class SkillEngine {
  constructor() {
    this.skillsRoot = path.join(__dirname, '../skills');
    this.loadedSkills = new Map();
  }

  /**
   * Skill 실행
   * @param {string} skillPath - 'automation/metadata-auto-generator' 형식
   * @param {object} context - 실행 컨텍스트
   */
  async execute(skillPath, context = {}) {
    const skill = await this.loadSkill(skillPath);

    if (!skill || !skill.run) {
      throw new Error(`Skill not found or invalid: ${skillPath}`);
    }

    console.log(`🔧 [Skill Engine] 실행: ${skillPath}`);

    const startTime = Date.now();
    const result = await skill.run(context);
    const duration = Date.now() - startTime;

    console.log(`✅ [Skill Engine] 완료: ${skillPath} (${duration}ms)\n`);

    // 실행 로그 저장
    await this.logExecution(skillPath, context, result, duration);

    return result;
  }

  /**
   * Skill 로드
   */
  async loadSkill(skillPath) {
    // 캐시 확인
    if (this.loadedSkills.has(skillPath)) {
      return this.loadedSkills.get(skillPath);
    }

    const skillModulePath = path.join(this.skillsRoot, skillPath, 'index.js');

    if (!fs.existsSync(skillModulePath)) {
      console.warn(`⚠️  Skill 모듈 없음: ${skillModulePath}`);
      return null;
    }

    // Skill 로드
    const skill = require(skillModulePath);

    // 검증
    if (!skill.name || !skill.run) {
      throw new Error(`Invalid skill module: ${skillPath} (missing name or run method)`);
    }

    // 캐시 저장
    this.loadedSkills.set(skillPath, skill);

    return skill;
  }

  /**
   * 사용 가능한 모든 Skill 목록
   */
  async listSkills() {
    const skills = [];

    const scanDirectory = (dir, prefix = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(dir, entry.name, 'index.js');
          if (fs.existsSync(skillPath)) {
            const relativePath = prefix + entry.name;
            skills.push(relativePath);
          } else {
            // 재귀적으로 하위 디렉토리 탐색
            scanDirectory(
              path.join(dir, entry.name),
              prefix + entry.name + '/'
            );
          }
        }
      }
    };

    scanDirectory(this.skillsRoot);
    return skills;
  }

  /**
   * Skill 실행 로그 저장
   */
  async logExecution(skillPath, context, result, duration) {
    const logPath = path.join(__dirname, '../skill-execution-log.json');

    let log = { sessions: [] };
    if (fs.existsSync(logPath)) {
      log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    }

    log.sessions.push({
      timestamp: new Date().toISOString(),
      skill: skillPath,
      duration,
      success: !!result,
      context: {
        taskType: context.taskType,
        project: context.project,
      },
    });

    // 최근 100개만 유지
    if (log.sessions.length > 100) {
      log.sessions = log.sessions.slice(-100);
    }

    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  }

  /**
   * Skill 캐시 클리어 (개발/테스트용)
   */
  clearCache() {
    this.loadedSkills.clear();
    console.log('🔄 Skill 캐시 클리어됨');
  }
}

module.exports = new SkillEngine();
