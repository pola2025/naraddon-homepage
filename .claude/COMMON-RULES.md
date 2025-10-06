# 🎯 Claude A & B 공통 준수사항

## ⚠️ 절대 원칙 (최우선)

### 1. 최소 변경 원칙
**사용자가 지시하지 않은 영역의 변경 또는 수정 최소화**

```javascript
// ❌ 절대 금지 - 요청 범위 초과
// 사용자: "로그인 버튼 색상을 파란색으로 변경해줘"
// 잘못된 작업:
- 로그인 버튼 색상 변경 ✓
- 회원가입 버튼도 같이 변경 ✗ (요청 없음)
- 네비게이션 바 스타일 개선 ✗ (요청 없음)
- 폰트 크기 조정 ✗ (요청 없음)

// ✅ 올바른 작업
- 로그인 버튼 색상만 변경 ✓
- 변경 내역 명시 ✓
- 다른 부분은 건드리지 않음 ✓
```

**예외 조건**:
- 변경이 필수적인 경우 → **반드시 사용자에게 먼저 물어보기**
- 연관된 변경이 필요한 경우 → **사유 설명 후 승인 요청**

---

### 2. 백업 필수 원칙
**모든 작업 전 변경 영역 백업 활성화**

#### 자동 백업 프로세스
```javascript
// 파일 수정 전 자동 백업
async function safeFileEdit(filePath, changes) {
  // 1. 백업 생성
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const backupPath = `${filePath}.backup-${timestamp}`;

  try {
    // 원본 복사
    await fs.copyFile(filePath, backupPath);
    console.log(`✅ 백업 생성: ${backupPath}`);

    // 2. Git 상태 확인
    const gitStatus = execSync('git status --porcelain').toString();
    if (gitStatus.includes(filePath)) {
      console.log('⚠️ 미커밋 변경사항 발견 - Git stash 생성');
      execSync(`git stash push -m "Auto-backup before ${filePath} modification"`);
    }

    // 3. 변경 적용
    await applyChanges(filePath, changes);

    // 4. 테스트 (가능한 경우)
    const testResult = await runTests();
    if (!testResult.success) {
      throw new Error('테스트 실패 - 롤백 필요');
    }

    console.log('✅ 변경 성공');
    return { success: true, backup: backupPath };

  } catch (error) {
    // 5. 에러 발생 시 자동 롤백
    console.log('❌ 에러 발생 - 롤백 시작');
    await rollback(filePath, backupPath);
    throw error;
  }
}

// 롤백 함수
async function rollback(filePath, backupPath) {
  console.log(`🔄 롤백: ${backupPath} → ${filePath}`);
  await fs.copyFile(backupPath, filePath);

  // Git stash 복구
  const stashList = execSync('git stash list').toString();
  if (stashList.includes('Auto-backup')) {
    execSync('git stash pop');
    console.log('✅ Git stash 복구 완료');
  }

  console.log('✅ 롤백 완료 - 이전 상태로 복구됨');
}
```

#### 백업 전략

**파일 백업**
```bash
# 단일 파일 수정 전
cp app/naraddon-tube/admin/page.tsx \
   app/naraddon-tube/admin/page.tsx.backup-20251005-120000

# 여러 파일 수정 전
tar -czf backups/naraddon-tube-admin-20251005-120000.tar.gz \
    app/naraddon-tube/admin/
```

**Git 백업**
```bash
# 작업 전 브랜치 생성
git checkout -b backup/naraddon-tube-admin-20251005

# 또는 stash 사용
git stash push -m "Backup before naraddon-tube admin refactoring"

# 작업 완료 후 stash 제거 또는 브랜치 삭제
```

**데이터베이스 백업** (MongoDB 변경 시)
```javascript
// MongoDB 데이터 변경 전 백업
async function backupMongoCollection(collectionName) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const backupPath = `.backups/mongodb-${collectionName}-${timestamp}.json`;

  const data = await db.collection(collectionName).find({}).toArray();
  await fs.writeFile(backupPath, JSON.stringify(data, null, 2));

  console.log(`✅ MongoDB 백업: ${backupPath}`);
  return backupPath;
}
```

---

### 3. 즉시 복구 가능성 보장
**오류 발생 시 이전으로 바로 돌아갈 수 있도록**

#### 복구 체크리스트
```javascript
// 작업 전 복구 가능성 확인
const recoverabilityCheck = {
  // 1. 백업 존재 여부
  hasBackup: await fileExists(backupPath),

  // 2. Git 상태 깔끔함
  gitClean: execSync('git status --porcelain').toString() === '',

  // 3. 복구 스크립트 준비
  rollbackScript: createRollbackScript(changes),

  // 4. 테스트 가능 여부
  canTest: hasTestSuite()
};

// 모든 조건 충족 시에만 작업 진행
if (Object.values(recoverabilityCheck).every(v => v === true)) {
  proceed();
} else {
  console.log('⚠️ 복구 가능성 미확보 - 작업 중단');
  reportToUser(recoverabilityCheck);
}
```

#### 자동 복구 시스템
```javascript
// .claude/scripts/auto-recovery.js
class AutoRecovery {
  constructor() {
    this.checkpoints = [];
    this.autoSaveInterval = 30000; // 30초마다 체크포인트
  }

  // 체크포인트 생성
  async createCheckpoint(label) {
    const checkpoint = {
      id: Date.now(),
      label,
      timestamp: new Date().toISOString(),
      files: await this.captureFileStates(),
      gitHash: execSync('git rev-parse HEAD').toString().trim(),
      dbSnapshot: await this.captureDBState()
    };

    this.checkpoints.push(checkpoint);
    console.log(`✅ 체크포인트 생성: ${label}`);
    return checkpoint.id;
  }

  // 특정 체크포인트로 복구
  async restoreCheckpoint(checkpointId) {
    const checkpoint = this.checkpoints.find(c => c.id === checkpointId);
    if (!checkpoint) {
      throw new Error('체크포인트를 찾을 수 없습니다');
    }

    console.log(`🔄 복구 시작: ${checkpoint.label}`);

    // 파일 복구
    for (const [filePath, content] of Object.entries(checkpoint.files)) {
      await fs.writeFile(filePath, content);
    }

    // Git 복구
    execSync(`git reset --hard ${checkpoint.gitHash}`);

    // DB 복구 (필요시)
    if (checkpoint.dbSnapshot) {
      await this.restoreDBState(checkpoint.dbSnapshot);
    }

    console.log('✅ 복구 완료');
  }

  // 마지막 체크포인트로 즉시 복구
  async quickRestore() {
    const latest = this.checkpoints[this.checkpoints.length - 1];
    if (latest) {
      await this.restoreCheckpoint(latest.id);
    }
  }
}

// 사용 예시
const recovery = new AutoRecovery();

// 작업 시작 전
const cpId = await recovery.createCheckpoint('나라똔튜브 admin 수정 전');

try {
  await performChanges();
} catch (error) {
  console.log('❌ 에러 발생 - 자동 복구 실행');
  await recovery.restoreCheckpoint(cpId);
}
```

---

### 4. 근본 원인 해결 원칙
**단순 우회 임시방편 해결책 지양, 근본 원인 해결**

#### 문제 분석 프로세스
```javascript
// ❌ 나쁜 예: 임시방편 해결
// 문제: "toLowerCase() error"
if (value) {  // 임시 방어 코드
  value.toLowerCase();
}

// ✅ 좋은 예: 근본 원인 해결
// 1. 근본 원인 파악
// - 왜 value가 undefined/null인가?
// - 데이터 흐름 어디서 문제?

// 2. 근본 해결
// Option 1: 데이터 소스에서 null 방지
const data = await fetchData();
const value = data.title ?? ''; // 기본값 제공

// Option 2: 타입 시스템으로 보장
interface VideoData {
  title: string;  // nullable 아님
  subtitle?: string;  // optional이면 명시
}

// Option 3: 유효성 검증
function validateVideoData(data: unknown): VideoData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data');
  }
  if (typeof data.title !== 'string') {
    throw new Error('Title must be string');
  }
  return data as VideoData;
}
```

#### 근본 원인 해결 체크리스트
```markdown
## 문제 발생 시 체크리스트

### 1. 증상 파악
- [ ] 정확한 에러 메시지 확인
- [ ] 재현 가능한 시나리오 파악
- [ ] 영향 범위 확인

### 2. 근본 원인 분석
- [ ] 왜 이 문제가 발생했는가?
- [ ] 언제부터 발생했는가? (Git blame, 로그 확인)
- [ ] 어떤 조건에서 발생하는가?
- [ ] 5 Whys 기법 적용

### 3. 해결 방안 검토
- [ ] 임시방편인가, 근본 해결인가?
- [ ] 다른 곳에도 같은 문제 있는가?
- [ ] 재발 방지 가능한가?

### 4. 해결 구현
- [ ] 테스트 케이스 작성 (재발 방지)
- [ ] 문서화 (같은 문제 재발 시 참고)
- [ ] 코드 리뷰 (Claude B 검토)

### 5. 검증
- [ ] 문제 해결 확인
- [ ] 부작용 없는지 확인
- [ ] 성능 영향 없는지 확인
```

#### 실제 예시: 나라똔 프로젝트

**Case 1: toLowerCase 에러**
```typescript
// ❌ 임시방편
const matchesSearch = entry.title && entry.title.toLowerCase().includes(searchTerm);

// ✅ 근본 해결
// 1. 데이터 모델 수정
interface NaraddonTubeEntry {
  title: string;        // 필수값으로 정의
  subtitle?: string;    // optional 명시
  description?: string;
}

// 2. 데이터 생성 시 검증
function createEntry(data: Partial<NaraddonTubeEntry>): NaraddonTubeEntry {
  if (!data.title) {
    throw new Error('Title is required');
  }
  return {
    title: data.title,
    subtitle: data.subtitle,
    description: data.description
  };
}

// 3. 안전한 검색
const matchesSearch =
  entry.title.toLowerCase().includes(searchTerm) ||
  (entry.subtitle?.toLowerCase() ?? '').includes(searchTerm) ||
  (entry.description?.toLowerCase() ?? '').includes(searchTerm);
```

**Case 2: 인증 문제**
```typescript
// ❌ 임시방편: 여러 군데 인증 체크 추가
// page1.tsx
if (!session) redirect('/login');

// page2.tsx
if (!session) redirect('/login');

// page3.tsx
if (!session) redirect('/login');

// ✅ 근본 해결: 미들웨어에서 일괄 처리
// middleware.ts
export function middleware(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // admin 페이지는 인증 필수
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
```

**Case 3: 중복 코드**
```typescript
// ❌ 임시방편: 복사-붙여넣기
// VideoForm.tsx
const handleUpload = async () => { /* 업로드 로직 */ };

// ThumbnailUpload.tsx
const handleUpload = async () => { /* 같은 로직 복사 */ };

// ✅ 근본 해결: 공통 훅 추출
// hooks/useFileUpload.ts
export function useFileUpload(options: UploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(options.endpoint, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');

      return await res.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress, error };
}

// 재사용
// VideoForm.tsx
const { upload, uploading } = useFileUpload({ endpoint: '/api/upload/video' });

// ThumbnailUpload.tsx
const { upload, uploading } = useFileUpload({ endpoint: '/api/upload/thumbnail' });
```

---

## 📋 작업 전 필수 체크리스트

### Claude A (PM/Developer)
```markdown
작업 시작 전:
- [ ] 사용자 요청 범위 명확히 파악
- [ ] 변경 영역 최소화 계획
- [ ] 백업 전략 수립
  - [ ] 파일 백업
  - [ ] Git 상태 확인
  - [ ] DB 백업 (필요시)
- [ ] 복구 계획 수립
- [ ] 근본 원인 분석 (버그 수정 시)
- [ ] Claude B 검토 요청 준비

작업 중:
- [ ] 요청 범위 내에서만 작업
- [ ] 자동 백업 활성화
- [ ] 점진적 변경 (커밋 단위 작게)

작업 후:
- [ ] 백업 파일 확인
- [ ] 테스트 실행
- [ ] Claude B 검토 요청
- [ ] 롤백 가능성 재확인
```

### Claude B (UI/UX Reviewer)
```markdown
검토 시:
- [ ] 요청 범위 준수 확인
  - [ ] 불필요한 변경 있는지
  - [ ] 요청과 무관한 수정 있는지
- [ ] 백업 여부 확인
  - [ ] 백업 파일 존재 확인
  - [ ] Git 상태 확인
- [ ] 복구 가능성 확인
  - [ ] 롤백 시나리오 검증
- [ ] 근본 원인 해결 확인
  - [ ] 임시방편 아닌지
  - [ ] 재발 방지 되는지
- [ ] UI/UX 품질 확인

Decision 전:
- [ ] 모든 체크리스트 통과 시에만 PROCEED
- [ ] 하나라도 미흡하면 NEEDS_CHANGES
```

---

## 🚨 위반 시 자동 거부

### 자동 거부 조건
```javascript
// Claude B 자동 거부 규칙
const autoRejectConditions = [
  {
    name: '요청 범위 초과',
    check: (changes) => {
      const requestedFiles = task.files;
      const changedFiles = changes.map(c => c.file);
      const unauthorized = changedFiles.filter(f => !requestedFiles.includes(f));
      return unauthorized.length > 0;
    },
    message: '요청하지 않은 파일이 수정되었습니다'
  },
  {
    name: '백업 없음',
    check: () => {
      const backupFiles = glob('./**/*.backup-*');
      return backupFiles.length === 0;
    },
    message: '백업 파일이 생성되지 않았습니다'
  },
  {
    name: '임시방편 해결',
    check: (code) => {
      const temporaryPatterns = [
        /\/\/ TODO: fix later/,
        /\/\/ temporary fix/,
        /\/\/ HACK:/,
        /try { .* } catch \(e\) { \/\/ ignore }/
      ];
      return temporaryPatterns.some(p => p.test(code));
    },
    message: '임시방편 코드가 발견되었습니다. 근본 원인을 해결해주세요.'
  }
];

// 자동 검증
for (const condition of autoRejectConditions) {
  if (condition.check(changes)) {
    return {
      decision: 'REJECT',
      reason: condition.message,
      autoRejected: true
    };
  }
}
```

---

## ✅ 준수사항 요약

### Claude A & B 공통
1. ✅ **최소 변경**: 요청 범위 내에서만 작업
2. ✅ **백업 필수**: 모든 변경 전 백업 생성
3. ✅ **즉시 복구**: 오류 시 바로 롤백 가능하도록
4. ✅ **근본 해결**: 임시방편 지양, 근본 원인 해결

### 위반 시
- ❌ Claude B 자동 거부
- ❌ 작업 즉시 중단
- ❌ 백업으로 롤백
- ❌ 사용자에게 보고 후 재작업

---

*최종 업데이트: 2025-10-05*
*문서 버전: 3.0.0*
