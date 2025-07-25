const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

console.log('🔍 나라똔 자동 백업 시스템 시작...');
console.log('📁 감시 폴더: frontend/src');
console.log('⚡ 종료하려면 Ctrl+C를 누르세요\n');

let lastCommit = Date.now();
let timeout;

const watcher = chokidar.watch('frontend/src', {
  ignored: /(^|[\/\\])\../, // 숨김 파일 무시
  persistent: true
});

function gitCommit(filepath) {
  const now = Date.now();
  
  // 마지막 커밋으로부터 30초 이상 지났을 때만
  if (now - lastCommit < 30000) return;
  
  clearTimeout(timeout);
  
  // 5초 후에 커밋 (추가 변경사항 대기)
  timeout = setTimeout(() => {
    console.log(`\n📝 변경 감지: ${path.basename(filepath)}`);
    console.log('🔄 자동 백업 중...');
    
    exec('git add . && git commit -m "Auto-backup: ' + new Date().toLocaleString() + '" && git push origin main', 
      { cwd: __dirname }, 
      (error, stdout, stderr) => {
        if (error) {
          console.error('❌ 백업 실패:', error.message);
          return;
        }
        console.log('✅ 자동 백업 완료!');
        console.log('⏰ 다음 백업까지 최소 30초 대기\n');
        lastCommit = Date.now();
      }
    );
  }, 5000);
}

watcher
  .on('add', filepath => gitCommit(filepath))
  .on('change', filepath => gitCommit(filepath))
  .on('unlink', filepath => gitCommit(filepath));