/**
 * Obsidian REST API 클라이언트
 * @purpose CLI처럼 Obsidian 제어
 * @usage node scripts/obsidian-api-client.js <command>
 */

const https = require('http');
const fs = require('fs');
const path = require('path');

// 설정 로드
const config = require('../.claude/obsidian-config.json');
const API_URL = config.api.host;
const API_TOKEN = config.api.token;

/**
 * Obsidian API 호출
 */
async function callAPI(endpoint, method = 'GET', body = null) {
  const url = new URL(endpoint, API_URL);

  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`API Error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * 파일 읽기
 */
async function readFile(filePath) {
  try {
    const content = await callAPI(`/vault/${filePath}`);
    console.log(`✅ 파일 읽기 성공: ${filePath}\n`);
    console.log(content);
    return content;
  } catch (error) {
    console.error(`❌ 파일 읽기 실패: ${error.message}`);
  }
}

/**
 * 파일 쓰기
 */
async function writeFile(filePath, content) {
  try {
    await callAPI(`/vault/${filePath}`, 'PUT', content);
    console.log(`✅ 파일 쓰기 성공: ${filePath}`);
  } catch (error) {
    console.error(`❌ 파일 쓰기 실패: ${error.message}`);
  }
}

/**
 * 파일 목록
 */
async function listFiles(folderPath = '') {
  try {
    const files = await callAPI(`/vault/${folderPath}`);
    console.log(`✅ 파일 목록:\n`);
    console.log(files);
    return files;
  } catch (error) {
    console.error(`❌ 파일 목록 실패: ${error.message}`);
  }
}

/**
 * 플러그인 설정 읽기
 */
async function getPluginConfig(pluginName) {
  try {
    const config = await callAPI(`/vault/.obsidian/plugins/${pluginName}/data.json`);
    console.log(`✅ ${pluginName} 설정:\n`);
    console.log(JSON.stringify(config, null, 2));
    return config;
  } catch (error) {
    console.error(`❌ 설정 읽기 실패: ${error.message}`);
  }
}

/**
 * 플러그인 설정 수정
 */
async function updatePluginConfig(pluginName, config) {
  try {
    await callAPI(
      `/vault/.obsidian/plugins/${pluginName}/data.json`,
      'PUT',
      config
    );
    console.log(`✅ ${pluginName} 설정 업데이트 완료`);
  } catch (error) {
    console.error(`❌ 설정 업데이트 실패: ${error.message}`);
  }
}

/**
 * Templater 폴더 템플릿 추가
 */
async function addFolderTemplate(folder, template) {
  try {
    // 기존 설정 읽기
    const config = await callAPI('/vault/.obsidian/plugins/templater-obsidian/data.json');

    // folder_templates 배열이 없으면 생성
    if (!config.folder_templates) {
      config.folder_templates = [];
    }

    // 중복 체크
    const exists = config.folder_templates.some(ft => ft.folder === folder);
    if (exists) {
      console.log(`⚠️  이미 존재하는 폴더 템플릿: ${folder}`);
      return;
    }

    // 추가
    config.folder_templates.push({ folder, template });

    // 저장
    await callAPI(
      '/vault/.obsidian/plugins/templater-obsidian/data.json',
      'PUT',
      config
    );

    console.log(`✅ 폴더 템플릿 추가 완료:`);
    console.log(`   ${folder} → ${template}`);
  } catch (error) {
    console.error(`❌ 폴더 템플릿 추가 실패: ${error.message}`);
  }
}

/**
 * 모든 폴더 템플릿 설정
 */
async function setupAllFolderTemplates() {
  console.log('🚀 폴더 템플릿 자동 설정 시작...\n');

  const templates = [
    {
      folder: 'Projects/나라똔/05-트러블슈팅',
      template: '.claude/templates/troubleshooting-template.md',
    },
    {
      folder: 'Projects/나라똔/03-기능개발',
      template: '.claude/templates/feature-template.md',
    },
    {
      folder: 'Projects/나라똔/99-대화기록',
      template: '.claude/templates/conversation-template.md',
    },
    {
      folder: 'Projects/나라똔/01-아키텍처',
      template: '.claude/templates/architecture-template.md',
    },
    {
      folder: 'Projects/나라똔/02-스키마',
      template: '.claude/templates/schema-template.md',
    },
  ];

  for (const { folder, template } of templates) {
    await addFolderTemplate(folder, template);
  }

  console.log('\n🎉 모든 폴더 템플릿 설정 완료!');
  console.log('⚠️  Obsidian을 재시작하세요 (Ctrl+R)');
}

/**
 * CLI 메인
 */
async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  console.log(`🔧 Obsidian CLI\n`);

  switch (command) {
    case 'read':
      if (!arg1) {
        console.error('사용법: node obsidian-api-client.js read <파일경로>');
        process.exit(1);
      }
      await readFile(arg1);
      break;

    case 'write':
      if (!arg1 || !arg2) {
        console.error('사용법: node obsidian-api-client.js write <파일경로> <내용>');
        process.exit(1);
      }
      await writeFile(arg1, arg2);
      break;

    case 'list':
      await listFiles(arg1 || '');
      break;

    case 'config':
      if (!arg1) {
        console.error('사용법: node obsidian-api-client.js config <플러그인명>');
        process.exit(1);
      }
      await getPluginConfig(arg1);
      break;

    case 'setup-templates':
      await setupAllFolderTemplates();
      break;

    default:
      console.log('사용법:');
      console.log('  read <파일>              - 파일 읽기');
      console.log('  write <파일> <내용>      - 파일 쓰기');
      console.log('  list [폴더]             - 파일 목록');
      console.log('  config <플러그인>        - 플러그인 설정 보기');
      console.log('  setup-templates         - 폴더 템플릿 자동 설정');
      console.log('\n예시:');
      console.log('  node scripts/obsidian-api-client.js read Projects/나라똔/README.md');
      console.log('  node scripts/obsidian-api-client.js list Projects/나라똔');
      console.log('  node scripts/obsidian-api-client.js config templater-obsidian');
      console.log('  node scripts/obsidian-api-client.js setup-templates');
  }
}

main().catch(error => {
  console.error('❌ 오류:', error.message);
  process.exit(1);
});
