/**
 * 이모지 패턴 감지기
 * @purpose AI 클리셰 이모지 감지
 */

const patterns = require('../patterns.json');

/**
 * 이모지 추출
 */
function extractEmojis(code) {
  const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojis = code.match(emojiPattern) || [];

  return [...new Set(emojis)];
}

/**
 * 금지 이모지 체크
 */
function checkBannedEmojis(code) {
  const emojis = extractEmojis(code);
  const bannedEmojis = Object.keys(patterns.bannedEmojis);

  const found = emojis.filter(emoji => bannedEmojis.includes(emoji));

  if (found.length > 0) {
    return {
      found: true,
      emojis: found.map(emoji => ({
        emoji,
        ...patterns.bannedEmojis[emoji]
      }))
    };
  }

  return { found: false };
}

/**
 * HTML 내 이모지 체크
 */
function checkHTMLEmojis(code) {
  // HTML 태그 내 이모지 찾기
  const htmlEmojiPattern = /<[^>]*>[\u{1F300}-\u{1F9FF}]/gu;
  const matches = code.match(htmlEmojiPattern);

  if (matches && matches.length > 0) {
    return {
      found: true,
      count: matches.length,
      message: 'HTML 내 이모지 발견. SVG로 교체 권장'
    };
  }

  return { found: false };
}

/**
 * SVG 아이콘 사용 여부 체크
 */
function checkSVGIcons(code) {
  const svgLibraries = patterns.svgIconLibraries;
  const usedLibraries = [];

  for (const lib of svgLibraries) {
    if (code.includes(lib.package)) {
      usedLibraries.push(lib.name);
    }
  }

  return {
    used: usedLibraries.length > 0,
    libraries: usedLibraries
  };
}

/**
 * 이모지 검사 실행
 */
function checkEmojis(code) {
  const allEmojis = extractEmojis(code);
  const bannedCheck = checkBannedEmojis(code);
  const htmlCheck = checkHTMLEmojis(code);
  const svgCheck = checkSVGIcons(code);

  const results = {
    totalEmojis: allEmojis.length,
    emojis: allEmojis,
    svgUsed: svgCheck.used,
    svgLibraries: svgCheck.libraries,
    issues: [],
    warnings: [],
    passed: true
  };

  // 1. 금지 이모지 체크
  if (bannedCheck.found) {
    bannedCheck.emojis.forEach(item => {
      results.issues.push({
        type: 'banned-emoji',
        severity: 'error',
        emoji: item.emoji,
        name: item.name,
        reason: item.reason,
        alternative: item.alternative,
        message: `금지 이모지 감지: ${item.emoji} (${item.name}) - ${item.reason}`
      });
    });
    results.passed = false;
  }

  // 2. HTML 내 이모지 체크
  if (htmlCheck.found) {
    results.warnings.push({
      type: 'html-emoji',
      severity: 'warning',
      count: htmlCheck.count,
      message: htmlCheck.message
    });
  }

  // 3. SVG 아이콘 미사용 체크
  if (!svgCheck.used && allEmojis.length > 0) {
    results.warnings.push({
      type: 'no-svg-library',
      severity: 'info',
      message: 'SVG 아이콘 라이브러리 사용을 권장합니다 (Lucide, Heroicons 등)'
    });
  }

  // 4. 이모지 과다 사용 체크 (3개 초과)
  const allowedEmojis = Object.keys(patterns.allowedEmojis);
  const nonAllowedEmojis = allEmojis.filter(e => !allowedEmojis.includes(e));

  if (nonAllowedEmojis.length > 3) {
    results.warnings.push({
      type: 'too-many-emojis',
      severity: 'warning',
      count: nonAllowedEmojis.length,
      message: `이모지가 ${nonAllowedEmojis.length}개입니다. 사용을 최소화하세요`
    });
  }

  return results;
}

/**
 * 결과 포맷팅
 */
function formatResults(results) {
  let output = '';

  // 이모지 목록
  if (results.totalEmojis > 0) {
    output += `\n발견된 이모지 (${results.totalEmojis}개):\n`;
    results.emojis.forEach(emoji => {
      const isBanned = results.issues.some(i => i.emoji === emoji);
      output += `  ${emoji}`;
      if (isBanned) {
        output += ' ❌ (금지)';
      }
      output += '\n';
    });
  }

  // SVG 사용 여부
  if (results.svgUsed) {
    output += `\n✅ SVG 아이콘 사용 중: ${results.svgLibraries.join(', ')}\n`;
  }

  // 오류
  if (results.issues.length > 0) {
    output += `\n❌ 오류 (${results.issues.length}개):\n`;
    results.issues.forEach(issue => {
      output += `  - ${issue.message}\n`;
      output += `    대체: ${issue.alternative}\n`;
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
    if (results.totalEmojis === 0) {
      output += `\n✅ 이모지 없음 (권장)\n`;
    } else {
      output += `\n✅ 이모지 검사 통과!\n`;
    }
  }

  return output;
}

module.exports = {
  extractEmojis,
  checkBannedEmojis,
  checkHTMLEmojis,
  checkSVGIcons,
  checkEmojis,
  formatResults
};
