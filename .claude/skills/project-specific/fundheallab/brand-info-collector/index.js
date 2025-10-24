/**
 * Brand Info Collector Skill
 * @purpose 브랜드 정보 수집 및 DESIGN_CONCEPT.md 생성
 * @context 기업심사관 홈페이지 제작 시작 시 필수 실행
 */

module.exports = {
  name: 'brand-info-collector',
  version: '1.0.0',
  description: '브랜드 정보 수집 및 DESIGN_CONCEPT.md 자동 생성',
  project: 'fundheallab',

  /**
   * Skill 실행
   * @param {object} context - 실행 컨텍스트
   * @param {string} context.brandName - 브랜드명 (필수)
   * @param {string} context.domain - 기본 도메인 (필수)
   * @param {object} context.brandInfo - 브랜드 정보
   */
  async run(context) {
    console.log('📋 [brand-info-collector] 브랜드 정보 수집 시작...\n');

    // 1. 필수 정보 검증
    const validation = this.validateRequiredInfo(context);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        missingFields: validation.missingFields,
      };
    }

    // 2. 브랜드 정보 수집
    const brandInfo = this.collectBrandInfo(context);

    // 3. 서브도메인 구조 생성
    const subdomainStructure = this.generateSubdomainStructure(brandInfo.domain);

    // 4. 섹션 ID 매핑 생성
    const sectionIdMapping = this.generateSectionIdMapping(brandInfo);

    // 5. DESIGN_CONCEPT.md 생성
    const designConcept = this.generateDesignConcept(brandInfo, subdomainStructure, sectionIdMapping);

    // 6. 프로젝트 구조 생성
    const projectStructure = this.generateProjectStructure(brandInfo);

    console.log('✅ 브랜드 정보 수집 완료\n');

    return {
      success: true,
      brandInfo,
      subdomainStructure,
      sectionIdMapping,
      designConcept,
      projectStructure,
      nextSteps: this.getNextSteps(brandInfo),
    };
  },

  /**
   * 필수 정보 검증
   */
  validateRequiredInfo(context) {
    const required = ['brandName', 'domain'];
    const missing = [];

    for (const field of required) {
      if (!context[field]) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return {
        valid: false,
        error: '필수 정보가 누락되었습니다',
        missingFields: missing,
      };
    }

    return { valid: true };
  },

  /**
   * 브랜드 정보 수집
   */
  collectBrandInfo(context) {
    return {
      // 필수 정보
      brandName: context.brandName,
      domain: context.domain,

      // 브랜드 디자인 정보
      logo: context.logo || '',
      primaryColor: context.primaryColor || '#0f172e',
      accentColor: context.accentColor || '#d4af37',
      brandSlogan: context.brandSlogan || '',

      // 비즈니스 정보
      businessType: context.businessType || '',
      phone: context.phone || '',
      email: context.email || '',
      address: context.address || '',

      // 페이지 구조
      pages: context.pages || [
        { id: 'home', name: '홈', subdomain: 'home' },
        { id: 'company', name: '회사소개', subdomain: 'company' },
        { id: 'process', name: '진행과정', subdomain: 'process' },
        { id: 'fund', name: '자금상담', subdomain: 'fund' },
        { id: 'pro', name: '전문서비스', subdomain: 'pro' },
        { id: 'mkt', name: '온라인마케팅', subdomain: 'mkt' },
      ],

      // 기타
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * 서브도메인 구조 생성
   */
  generateSubdomainStructure(domain) {
    return {
      baseDomain: domain,
      subdomains: {
        home: `home.${domain}`,
        company: `company.${domain}`,
        process: `process.${domain}`,
        fund: `fund.${domain}`,
        pro: `pro.${domain}`,
        mkt: `mkt.${domain}`,
      },
    };
  },

  /**
   * 섹션 ID 매핑 생성
   * txt 파일명 → 섹션 ID 자동 매핑
   */
  generateSectionIdMapping(brandInfo) {
    return {
      // Header/Footer (공통)
      'main_header.txt': {
        sectionId: 'header',
        brandName: brandInfo.brandName,
        logo: brandInfo.logo,
        primaryColor: brandInfo.primaryColor,
        accentColor: brandInfo.accentColor,
      },
      'main_footer.txt': {
        sectionId: 'footer',
        brandName: brandInfo.brandName,
        phone: brandInfo.phone,
        email: brandInfo.email,
        address: brandInfo.address,
      },

      // 페이지별 섹션
      'home_hero.txt': { sectionId: 'hero-section', page: 'home' },
      'home_features.txt': { sectionId: 'features', page: 'home' },
      'home_cta.txt': { sectionId: 'cta', page: 'home' },

      'company_about.txt': { sectionId: 'about', page: 'company' },
      'company_team.txt': { sectionId: 'team', page: 'company' },
      'company_values.txt': { sectionId: 'values', page: 'company' },

      'process_steps.txt': { sectionId: 'steps', page: 'process' },
      'process_timeline.txt': { sectionId: 'timeline', page: 'process' },

      'fund_form.txt': {
        sectionId: 'contact-form',
        page: 'fund',
        brandNumber: brandInfo.phone,
        brandName: brandInfo.brandName,
        primaryColor: brandInfo.primaryColor,
        accentColor: brandInfo.accentColor,
      },
      'fund_consultation.txt': { sectionId: 'consultation', page: 'fund' },

      'pro_services.txt': { sectionId: 'services', page: 'pro' },
      'pro_pricing.txt': { sectionId: 'pricing', page: 'pro' },

      'mkt_portfolio.txt': { sectionId: 'portfolio', page: 'mkt' },
      'mkt_cases.txt': { sectionId: 'case-studies', page: 'mkt' },
    };
  },

  /**
   * DESIGN_CONCEPT.md 생성
   */
  generateDesignConcept(brandInfo, subdomainStructure, sectionIdMapping) {
    const lines = [];

    lines.push(`# ${brandInfo.brandName} - Design Concept`);
    lines.push('');
    lines.push(`**생성일**: ${new Date().toLocaleDateString('ko-KR')}`);
    lines.push(`**도메인**: ${brandInfo.domain}`);
    lines.push('');

    // 1. 브랜드 정보
    lines.push('## 브랜드 정보\n');
    lines.push(`- **브랜드명**: ${brandInfo.brandName}`);
    lines.push(`- **로고**: ${brandInfo.logo || '(미제공)'}`);
    lines.push(`- **슬로건**: ${brandInfo.brandSlogan || '(미제공)'}`);
    lines.push(`- **비즈니스 타입**: ${brandInfo.businessType || '(미제공)'}`);
    lines.push('');

    // 2. 컬러 시스템
    lines.push('## 컬러 시스템\n');
    lines.push('### Primary Color');
    lines.push(`- **컬러 코드**: \`${brandInfo.primaryColor}\``);
    lines.push(`- **용도**: 배경, 다크 섹션\n`);
    lines.push('### Accent Color');
    lines.push(`- **컬러 코드**: \`${brandInfo.accentColor}\``);
    lines.push(`- **용도**: 강조, 버튼, 링크, 네온 효과\n`);

    // 3. 서브도메인 구조
    lines.push('## 서브도메인 구조\n');
    lines.push(`**기본 도메인**: ${subdomainStructure.baseDomain}\n`);
    lines.push('| 페이지 | 서브도메인 | URL |');
    lines.push('|--------|-----------|-----|');
    for (const page of brandInfo.pages) {
      lines.push(`| ${page.name} | ${page.subdomain} | https://${page.subdomain}.${brandInfo.domain} |`);
    }
    lines.push('');

    // 4. 섹션 ID 매핑
    lines.push('## 섹션 ID 매핑\n');
    lines.push('### 공통 컴포넌트\n');
    lines.push('| txt 파일 | 섹션 ID | 설명 |');
    lines.push('|----------|---------|------|');
    lines.push('| main_header.txt | header | 헤더 (로고, 브랜드명, 네비게이션) |');
    lines.push('| main_footer.txt | footer | 푸터 (연락처, 주소, SNS) |');
    lines.push('');

    lines.push('### 페이지별 섹션\n');
    lines.push('| txt 파일 | 섹션 ID | 페이지 |');
    lines.push('|----------|---------|--------|');
    const pageFiles = Object.entries(sectionIdMapping)
      .filter(([key]) => !key.startsWith('main_'))
      .sort();
    for (const [filename, data] of pageFiles) {
      lines.push(`| ${filename} | ${data.sectionId} | ${data.page} |`);
    }
    lines.push('');

    // 5. 디자인 효과
    lines.push('## 디자인 효과\n');
    lines.push('### Glassmorphism');
    lines.push('```css');
    lines.push('.glass-effect {');
    lines.push(`  background: rgba(${this.hexToRgb(brandInfo.primaryColor)}, 0.7);`);
    lines.push('  backdrop-filter: blur(10px);');
    lines.push(`  border: 1px solid rgba(${this.hexToRgb(brandInfo.accentColor)}, 0.2);`);
    lines.push('}');
    lines.push('```\n');

    lines.push('### Neon Glow');
    lines.push('```css');
    lines.push('.neon-glow {');
    lines.push(`  box-shadow: 0 0 20px ${brandInfo.accentColor},`);
    lines.push(`              0 0 40px ${brandInfo.accentColor};`);
    lines.push(`  text-shadow: 0 0 10px ${brandInfo.accentColor};`);
    lines.push('}');
    lines.push('```\n');

    // 6. 연락처 정보
    lines.push('## 연락처 정보\n');
    lines.push(`- **전화번호**: ${brandInfo.phone || '(미제공)'}`);
    lines.push(`- **이메일**: ${brandInfo.email || '(미제공)'}`);
    lines.push(`- **주소**: ${brandInfo.address || '(미제공)'}`);
    lines.push('');

    // 7. 규칙
    lines.push('## 개발 규칙\n');
    lines.push('### Header & Footer');
    lines.push('- main_header.txt와 main_footer.txt의 내용은 모든 페이지에 동일하게 적용');
    lines.push('- 브랜드명, 로고, 컬러는 브랜드 정보에서 자동 적용\n');
    lines.push('### 입력 폼');
    lines.push('- 입력 폼 양식은 유지');
    lines.push('- 왼쪽 브랜드 정보: 번호, 브랜드명, 컬러 컨셉만 교체\n');
    lines.push('### URL 규칙');
    lines.push('- 모든 내부 링크는 서브도메인 사용');
    lines.push('- 상대 경로 금지 (예: `/about` ❌)');
    lines.push('- 절대 URL 사용 (예: `https://company.example.com` ✅)\n');

    return lines.join('\n');
  },

  /**
   * Hex to RGB 변환
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
  },

  /**
   * 프로젝트 구조 생성
   */
  generateProjectStructure(brandInfo) {
    return {
      root: `bas_homepage/${brandInfo.brandName}`,
      directories: [
        'components',
        'pages',
        'styles',
        'public',
        'docs',
      ],
      files: {
        'DESIGN_CONCEPT.md': '디자인 컨셉 문서',
        'components/main_header.txt': '공통 헤더',
        'components/main_footer.txt': '공통 푸터',
        'pages/home_hero.txt': '홈 히어로 섹션',
        'pages/home_features.txt': '홈 특징 섹션',
        'pages/home_cta.txt': '홈 CTA 섹션',
        // ... 기타 페이지 파일들
      },
      obsidianPath: `Projects/bas_homepage/${brandInfo.brandName}`,
    };
  },

  /**
   * 다음 단계 안내
   */
  getNextSteps(brandInfo) {
    return [
      {
        step: 1,
        title: 'DESIGN_CONCEPT.md 저장',
        description: `F:\\bas_homepage\\${brandInfo.brandName}\\DESIGN_CONCEPT.md`,
        action: 'save-design-concept',
      },
      {
        step: 2,
        title: 'Obsidian 프로젝트 생성',
        description: `Projects/bas_homepage/${brandInfo.brandName}`,
        action: 'create-obsidian-project',
      },
      {
        step: 3,
        title: '컴포넌트 파일 생성',
        description: 'main_header.txt, main_footer.txt 등',
        action: 'generate-components',
      },
      {
        step: 4,
        title: '페이지 파일 생성',
        description: '각 페이지별 섹션 파일',
        action: 'generate-pages',
      },
    ];
  },

  /**
   * 브랜드 정보 입력 프롬프트 생성
   */
  generateInputPrompt() {
    return {
      title: '브랜드 정보 입력',
      fields: [
        {
          id: 'brandName',
          label: '브랜드명',
          type: 'text',
          required: true,
          placeholder: '예: 자금치유연구소',
        },
        {
          id: 'domain',
          label: '기본 도메인',
          type: 'text',
          required: true,
          placeholder: '예: fundheallab.com',
        },
        {
          id: 'logo',
          label: '로고 경로',
          type: 'text',
          required: false,
          placeholder: '예: /images/logo.png',
        },
        {
          id: 'primaryColor',
          label: 'Primary 컬러',
          type: 'color',
          required: false,
          default: '#0f172e',
        },
        {
          id: 'accentColor',
          label: 'Accent 컬러',
          type: 'color',
          required: false,
          default: '#d4af37',
        },
        {
          id: 'brandSlogan',
          label: '브랜드 슬로건',
          type: 'text',
          required: false,
          placeholder: '예: 기업의 자금 문제를 치유합니다',
        },
        {
          id: 'businessType',
          label: '비즈니스 타입',
          type: 'text',
          required: false,
          placeholder: '예: 자금 컨설팅',
        },
        {
          id: 'phone',
          label: '전화번호',
          type: 'text',
          required: false,
          placeholder: '예: 02-1234-5678',
        },
        {
          id: 'email',
          label: '이메일',
          type: 'email',
          required: false,
          placeholder: '예: info@fundheallab.com',
        },
        {
          id: 'address',
          label: '주소',
          type: 'text',
          required: false,
          placeholder: '예: 서울시 강남구...',
        },
      ],
    };
  },
};
