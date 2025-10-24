# 개발 작업 전 자동 백업 Skill

**카테고리**: Development - Backup
**목적**: 모든 코드 변경 전 자동 백업으로 안전한 복원 환경 보장

## 🛡️ 핵심 원칙

**Claude는 다음 작업 전 반드시 백업을 생성합니다**:

1. 파일 수정/삭제
2. 대량 리팩토링
3. 데이터베이스 스키마 변경
4. 환경변수 수정
5. 설정 파일 변경
6. 의존성 업데이트
7. Git 구조 변경

## 📋 백업 체크리스트

### 작업 전 자동 실행
- [ ] Git 현재 상태 저장 (`git stash`)
- [ ] 작업 브랜치 생성
- [ ] 변경 대상 파일 백업
- [ ] 환경변수 스냅샷
- [ ] 데이터베이스 백업 (필요시)

## 🔄 백업 전략

### 1. Git 기반 백업 (기본)

```bash
# 1-1. 현재 작업 내용 임시 저장
git stash push -u -m "작업 전 백업: $(date +%Y%m%d_%H%M%S)"

# 1-2. 브랜치 생성으로 작업 격리
git checkout -b feature/작업명-$(date +%Y%m%d)

# 1-3. 안전 지점 태그
git tag backup-$(date +%Y%m%d-%H%M%S)
```

**Claude가 자동 실행하는 백업 명령어**:
```bash
# 모든 파일 수정 전 자동 실행
git stash save "Claude 자동 백업: 작업명 - $(date +%Y%m%d_%H%M%S)"
```

### 2. 파일 단위 백업

```bash
# 2-1. 단일 파일 백업
cp app/api/route.ts app/api/route.ts.backup-$(date +%Y%m%d_%H%M%S)

# 2-2. 디렉토리 전체 백업
cp -r src/components src/components.backup-$(date +%Y%m%d)

# 2-3. 중요 설정 파일 백업
cp .env.local .env.local.backup-$(date +%Y%m%d)
cp package.json package.json.backup-$(date +%Y%m%d)
```

**Windows 환경 (Claude 자동 실행)**:
```powershell
# PowerShell 버전
Copy-Item -Path "file.ts" -Destination "file.ts.backup-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
```

### 3. 데이터베이스 백업

```bash
# 3-1. MongoDB 전체 백업
npm run backup:full-$(date +%Y%m%d)

# 3-2. 특정 컬렉션 백업
npx ts-node scripts/backup-collection.ts policy-news backup-$(date +%Y%m%d)

# 3-3. 환경변수 기반 자동 백업
node scripts/auto-backup-db.js
```

**백업 스크립트 예시**:
```javascript
// scripts/auto-backup-db.js
const { exec } = require('child_process');
const timestamp = new Date().toISOString().split('T')[0];

exec(`mongodump --uri="${process.env.MONGODB_URI}" --out=backups/db-${timestamp}`,
  (error, stdout, stderr) => {
    if (error) {
      console.error('⛔ 백업 실패:', error);
      process.exit(1);
    }
    console.log('✅ DB 백업 완료:', `backups/db-${timestamp}`);
  }
);
```

## 🚀 Claude 자동 백업 워크플로우

### Phase 1: 작업 전 백업
```markdown
사용자: "lib/auth/authOptions.ts 수정해줘"

Claude:
1️⃣ 백업 준비 중...
   ✅ Git stash 생성: "Claude 백업: authOptions 수정 - 20251019_1430"
   ✅ 파일 백업: lib/auth/authOptions.ts.backup-20251019
   ✅ 현재 브랜치: main (clean)

2️⃣ 작업 시작...
   [파일 수정 진행]

3️⃣ 백업 위치:
   - Git Stash: stash@{0}
   - 파일 백업: lib/auth/authOptions.ts.backup-20251019
   - 복원 명령어: git stash pop
```

### Phase 2: 대량 작업 시
```bash
# 리팩토링, 대량 파일 변경 시
git checkout -b refactor/작업명-$(date +%Y%m%d)
git add .
git commit -m "작업 전 스냅샷"

# 작업 진행...

# 문제 발생 시 즉시 복원
git reset --hard HEAD
```

### Phase 3: 데이터베이스 변경 시
```bash
# 1. DB 백업
npm run backup:full-pre-migration

# 2. 마이그레이션 실행
npm run migrate

# 3. 검증
npm run verify:migration

# 4. 실패 시 복원
npm run restore:backup-latest
```

## 🔍 백업 검증

### 백업 완료 후 자동 확인
```bash
# 1. Git stash 확인
git stash list | head -n 1

# 2. 백업 파일 존재 확인
ls -la *.backup-* 2>/dev/null && echo "✅ 백업 파일 존재" || echo "⚠️  백업 없음"

# 3. 브랜치 목록 확인
git branch | grep $(date +%Y%m%d)
```

**Claude의 자동 검증 메시지**:
```markdown
✅ 백업 검증 완료:
   - Git Stash: stash@{0} (2025-10-19 14:30)
   - 백업 파일: 3개
   - 작업 브랜치: feature/auth-update-20251019

복원 명령어:
   git stash pop           # 최근 stash 복원
   git checkout main       # 원래 브랜치로
```

## 📚 복원 시나리오

### 시나리오 1: 파일 수정 실패
```bash
# 방법 1: Git stash 복원
git stash pop

# 방법 2: 백업 파일 복원
cp file.ts.backup-20251019 file.ts

# 방법 3: Git에서 복원
git checkout HEAD -- file.ts
```

### 시나리오 2: 브랜치 전체 롤백
```bash
# 작업 브랜치 삭제
git checkout main
git branch -D feature/작업명-20251019

# stash에서 복원
git stash pop
```

### 시나리오 3: 데이터베이스 복원
```bash
# 1. 최신 백업 찾기
ls -lt backups/ | head -n 1

# 2. 복원 실행
mongorestore --uri="${MONGODB_URI}" --drop backups/db-20251019

# 3. 검증
npm run verify:db
```

## 🎯 백업 자동화 스크립트

### 통합 백업 스크립트
```bash
#!/bin/bash
# .claude/scripts/auto-backup.sh

BACKUP_DIR=".claude/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "🔄 자동 백업 시작..."

# 1. Git 상태 저장
git stash save "Auto backup: $(date)" 2>/dev/null
echo "✅ Git stash 생성"

# 2. 중요 파일 백업
cp .env.local "$BACKUP_DIR/" 2>/dev/null
cp package.json "$BACKUP_DIR/"
cp -r src/ "$BACKUP_DIR/src/" 2>/dev/null
echo "✅ 파일 백업 완료"

# 3. 데이터베이스 백업 (옵션)
if [ "$1" == "--with-db" ]; then
  npm run backup:full 2>/dev/null
  echo "✅ DB 백업 완료"
fi

# 4. 백업 목록 저장
echo "$(date): Backup created at $BACKUP_DIR" >> .claude/backups/backup-log.txt

echo "✅ 백업 완료: $BACKUP_DIR"
echo "복원 명령어: git stash pop"
```

**Claude가 작업 전 자동 실행**:
```bash
bash .claude/scripts/auto-backup.sh
```

## ⚙️ 백업 설정

### .claude/backup-config.json
```json
{
  "enabled": true,
  "strategies": {
    "git": {
      "autoStash": true,
      "createBranch": true,
      "createTag": false
    },
    "files": {
      "enabled": true,
      "pattern": "*.backup-{date}",
      "retention": 7
    },
    "database": {
      "enabled": false,
      "autoBackup": false,
      "schedule": "daily"
    }
  },
  "critical_files": [
    ".env.local",
    "package.json",
    "tsconfig.json",
    "next.config.js"
  ]
}
```

## 📊 백업 현황 모니터링

```bash
# 백업 통계
echo "📊 백업 현황:"
echo "Git Stashes: $(git stash list | wc -l)"
echo "백업 파일: $(find . -name '*.backup-*' | wc -l)"
echo "백업 브랜치: $(git branch | grep -c backup-)"
echo "DB 백업: $(ls -1 backups/ 2>/dev/null | wc -l)"
```

## 🚨 백업 실패 시 조치

```markdown
⛔ **백업 실패 감지**

**실패 원인**: Git stash 생성 실패
**에러**: "No local changes to save"

**조치 사항**:
1. ✅ 문제 없음 - 변경사항이 없어 백업 불필요
2. 작업 계속 진행 가능

---

⛔ **백업 공간 부족**

**실패 원인**: 디스크 용량 부족
**필요 공간**: 500MB

**조치 사항**:
1. 오래된 백업 삭제
2. 백업 디렉토리 정리
3. Claude는 작업 중단 (안전 우선)
```

## ✅ 백업 성공 확인

```markdown
✅ **백업 완료**

**백업 일시**: 2025-10-19 14:30:25
**백업 유형**: Git Stash + 파일 백업

**백업 항목**:
- ✅ Git Stash: stash@{0}
- ✅ 파일: 5개
- ✅ 브랜치: feature/auth-update-20251019

**복원 방법**:
```bash
# Git stash 복원
git stash pop

# 파일 복원
cp *.backup-20251019 원본경로/

# 브랜치 복원
git checkout feature/auth-update-20251019
```

**작업 안전하게 진행 가능합니다.**
```

## 🎯 핵심 규칙

1. **모든 파일 수정 전 자동 백업**
2. **백업 검증 필수**
3. **복원 명령어 항상 제공**
4. **백업 실패 시 작업 중단**
5. **중요 파일은 다중 백업**

---

**이 Skill로 모든 개발 작업은 안전하게 복원 가능합니다.**
**Claude는 백업 없이 파일을 수정하지 않습니다.**
