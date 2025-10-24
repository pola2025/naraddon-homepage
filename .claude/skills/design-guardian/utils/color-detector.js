/**
 * 색상 패턴 감지기
 * @purpose AI 스타일 색상 패턴 감지
 */

const patterns = require('../patterns.json');

/**
 * Hex 색상 추출
 */
function extractHexColors(code) {
  const hexPattern = /#[0-9A-Fa-f]{6}/g;
  const colors = code.match(hexPattern) || [];

  // 대문자로 정규화 및 중복 제거
  const uniqueColors = [...new Set(colors.map(c => c.toUpperCase()))];

  return uniqueColors;
}

/**
 * 보라색 여부 확인
 */
function isPurple(color) {
  // RGB 변환
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // 보라색 판정: B가 가장 크고, R > G
  return b > r && r > g && b - g > 50;
}

/**
 * 보라색 개수 체크
 */
function countPurple(colors) {
  return colors.filter(isPurple).length;
}

/**
 * 무지개 그라디언트 감지
 */
function hasRainbowGradient(code) {
  const gradientPattern = /linear-gradient\([^)]+\)/g;
  const gradients = code.match(gradientPattern) || [];

  for (const gradient of gradients) {
    const colors = extractHexColors(gradient);
    // 4가지 이상 색상 = 무지개
    if (colors.length >= 4) {
      return true;
    }
  }

  return false;
}

/**
 * AI 전형 색상 조합 감지
 */
function hasAIColorCombo(colors) {
  const aiCombos = patterns.aiColorCombos;

  for (const combo of aiCombos) {
    const comboColors = combo.colors.map(c => c.toUpperCase());
    const hasAllColors = comboColors.every(c =>
      colors.some(userColor => userColor === c)
    );

    if (hasAllColors) {
      return {
        found: true,
        combo: combo.name,
        reason: combo.reason,
        colors: combo.colors
      };
    }
  }

  return { found: false };
}

/**
 * 색상 검사 실행
 */
function checkColors(code, options = {}) {
  const colors = extractHexColors(code);
  const colorCount = colors.length;
  const maxColors = options.maxColors || patterns.colorRules.maxTotalColors;
  const purpleCount = countPurple(colors);
  const isConceptPurple = options.isConceptPurple || false;

  const results = {
    colors,
    colorCount,
    issues: [],
    warnings: [],
    passed: true
  };

  // 1. 색상 개수 체크
  if (colorCount > maxColors) {
    results.issues.push({
      type: 'too-many-colors',
      severity: 'error',
      message: `색상이 ${colorCount}개입니다. ${maxColors}개 이하 권장`,
      colors: colors
    });
    results.passed = false;
  } else if (colorCount === maxColors) {
    results.warnings.push({
      type: 'many-colors',
      severity: 'warning',
      message: `색상이 ${colorCount}개입니다. 적절하지만 줄이는 것도 고려하세요`
    });
  }

  // 2. 무지개 그라디언트 체크
  if (hasRainbowGradient(code)) {
    results.issues.push({
      type: 'rainbow-gradient',
      severity: 'error',
      message: '무지개 그라디언트 감지! AI 스타일입니다.'
    });
    results.passed = false;
  }

  // 3. AI 전형 조합 체크
  const aiCombo = hasAIColorCombo(colors);
  if (aiCombo.found) {
    results.issues.push({
      type: 'ai-color-combo',
      severity: 'error',
      message: `AI 전형 색상 조합 감지: ${aiCombo.combo}`,
      reason: aiCombo.reason,
      colors: aiCombo.colors
    });
    results.passed = false;
  }

  // 4. 보라색 과다 사용 체크
  if (!isConceptPurple && purpleCount > 1) {
    results.warnings.push({
      type: 'purple-overuse',
      severity: 'warning',
      message: `보라색 ${purpleCount}개 사용. AI 클리셰입니다. (컨셉이 아니라면 권장하지 않음)`
    });
  }

  return results;
}

/**
 * 결과 포맷팅
 */
function formatResults(results) {
  let output = '';

  // 색상 목록
  output += `\n사용된 색상 (${results.colorCount}개):\n`;
  results.colors.forEach(color => {
    output += `  ${color}`;
    if (isPurple(color)) {
      output += ' (보라색)';
    }
    output += '\n';
  });

  // 오류
  if (results.issues.length > 0) {
    output += `\n❌ 오류 (${results.issues.length}개):\n`;
    results.issues.forEach(issue => {
      output += `  - ${issue.message}\n`;
      if (issue.colors) {
        output += `    색상: ${issue.colors.join(', ')}\n`;
      }
    });
  }

  // 경고
  if (results.warnings.length > 0) {
    output += `\n⚠️ 경고 (${results.warnings.length}개):\n`;
    results.warnings.forEach(warning => {
      output += `  - ${warning.message}\n`;
    });
  }

  // 통과
  if (results.passed && results.warnings.length === 0) {
    output += `\n✅ 색상 검사 통과!\n`;
  }

  return output;
}

module.exports = {
  extractHexColors,
  isPurple,
  countPurple,
  hasRainbowGradient,
  hasAIColorCombo,
  checkColors,
  formatResults
};
