# ULID 마이그레이션 계획 - 데이터 누락 방지 전략

## 📋 목차
1. [배경 및 목적](#배경-및-목적)
2. [ULID vs MongoDB ObjectId](#ulid-vs-mongodb-objectid)
3. [마이그레이션 전략](#마이그레이션-전략)
4. [데이터 누락 방지 전략](#데이터-누락-방지-전략)
5. [단계별 실행 계획](#단계별-실행-계획)
6. [롤백 계획](#롤백-계획)
7. [테스트 계획](#테스트-계획)

---

## 배경 및 목적

### 현재 상황
- MongoDB ObjectId 사용 중 (24자 hex, 예: `68e5d3698f5ea84eaeced172`)
- URL에 노출 시 가독성 낮음
- 시간 순 정렬은 가능하지만 렉시코그래픽 정렬 불가

### 목표
- ULID로 마이그레이션하여 URL 가독성 향상
- 시간 순 + 렉시코그래픽 정렬 지원
- **데이터 무손실 마이그레이션**
- 기존 참조 관계 유지

---

## ULID vs MongoDB ObjectId

### ULID (Universally Unique Lexicographically Sortable Identifier)
```
01ARZ3NDEKTSV4RRFFQ69G5FAV
```
- **길이**: 26자 (Crockford's Base32)
- **타임스탬프**: 앞 10자 (밀리초 정밀도)
- **랜덤**: 뒤 16자
- **정렬**: 렉시코그래픽 정렬 = 시간 순 정렬
- **URL-safe**: 대소문자 + 숫자만 사용
- **충돌 확률**: 매우 낮음 (2^80)

### MongoDB ObjectId
```
68e5d3698f5ea84eaeced172
```
- **길이**: 24자 (hex)
- **타임스탬프**: 앞 4바이트 (초 단위)
- **기타**: 머신ID, 프로세스ID, 카운터
- **정렬**: 시간 순 정렬 가능
- **MongoDB 네이티브**: 인덱싱 최적화

---

## 마이그레이션 전략

### Phase 1: 준비 (Preparation)
**목표**: 마이그레이션 환경 구축 및 검증

#### 1.1 ULID 라이브러리 설치
```bash
npm install ulid
npm install --save-dev @types/ulid
```

#### 1.2 ULID 생성 유틸리티 작성
```typescript
// src/utils/ulid.ts
import { ulid } from 'ulid';

export function generateULID(): string {
  return ulid();
}

export function isValidULID(id: string): boolean {
  return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/.test(id);
}

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function getTimestampFromULID(id: string): number {
  return parseInt(id.substring(0, 10), 32);
}
```

#### 1.3 하이브리드 ID 검증 헬퍼
```typescript
// src/utils/id-helper.ts
import { isValidObjectId } from 'mongoose';
import { isValidULID } from './ulid';

export type ID = string; // ULID or ObjectId

export function isValidID(id: string): boolean {
  return isValidULID(id) || isValidObjectId(id);
}

export function normalizeID(id: string): string {
  if (!isValidID(id)) {
    throw new Error(`Invalid ID format: ${id}`);
  }
  return id;
}
```

---

### Phase 2: 스키마 확장 (Schema Extension)
**목표**: 기존 ObjectId와 ULID 공존

#### 2.1 스키마에 ULID 필드 추가
```typescript
// Before
export interface IBusinessVoiceQuestion extends Document {
  title: string;
  content: string;
  // ...
}

// After
export interface IBusinessVoiceQuestion extends Document {
  _id: mongoose.Types.ObjectId; // 기존 ObjectId (유지)
  ulid: string; // 새로운 ULID (추가)
  title: string;
  content: string;
  // ...
}

const questionSchema = new Schema<IBusinessVoiceQuestion>({
  ulid: {
    type: String,
    unique: true,
    sparse: true, // 기존 데이터는 null 허용
    index: true,
  },
  // ... 기존 필드
});

// ULID 자동 생성 (새 문서만)
questionSchema.pre('save', function (next) {
  if (this.isNew && !this.ulid) {
    this.ulid = generateULID();
  }
  next();
});
```

#### 2.2 인덱스 생성
```typescript
questionSchema.index({ ulid: 1 }, { unique: true, sparse: true });
```

---

### Phase 3: 기존 데이터 마이그레이션 (Data Migration)
**목표**: 모든 기존 문서에 ULID 추가

#### 3.1 마이그레이션 스크립트
```javascript
// scripts/migrate-to-ulid.js
const mongoose = require('mongoose');
const { ulid } = require('ulid');
require('dotenv').config({ path: '.env.local' });

async function migrateToULID() {
  console.log('🚀 ULID 마이그레이션 시작...\n');

  await mongoose.connect(process.env.MONGODB_URI);

  const collections = [
    'businessvoicequestions',
    'ttontoks',
    'expertexaminers',
    // ... 다른 컬렉션
  ];

  const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const collectionName of collections) {
    console.log(`\n📦 Collection: ${collectionName}`);

    const collection = mongoose.connection.collection(collectionName);
    const cursor = collection.find({ ulid: { $exists: false } });

    const batchSize = 100;
    let batch = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      stats.total++;

      // ULID 생성 (문서 생성 시간 기준)
      const timestamp = doc._id.getTimestamp().getTime();
      const newULID = ulid(timestamp);

      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { ulid: newULID } },
        },
      });

      if (batch.length >= batchSize) {
        const result = await collection.bulkWrite(batch);
        stats.migrated += result.modifiedCount;
        console.log(`  ✅ ${stats.migrated}개 마이그레이션 완료...`);
        batch = [];
      }
    }

    // 남은 배치 처리
    if (batch.length > 0) {
      const result = await collection.bulkWrite(batch);
      stats.migrated += result.modifiedCount;
    }
  }

  console.log('\n\n📊 마이그레이션 통계:');
  console.log(`  총 문서: ${stats.total}개`);
  console.log(`  마이그레이션 완료: ${stats.migrated}개`);
  console.log(`  스킵: ${stats.skipped}개`);
  console.log(`  에러: ${stats.errors}개`);

  await mongoose.connection.close();
  console.log('\n✅ 마이그레이션 완료!');
}

migrateToULID().catch(console.error);
```

---

### Phase 4: API 하이브리드 지원 (API Hybrid Support)
**목표**: ObjectId와 ULID 모두 허용

#### 4.1 API에서 두 ID 타입 모두 지원
```typescript
// app/api/business-voice/questions/[id]/route.ts
import { isValidID, normalizeID } from '@/utils/id-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ID 검증 (ULID 또는 ObjectId)
    if (!isValidID(id)) {
      return NextResponse.json(
        { message: 'Invalid ID format' },
        { status: 400 }
      );
    }

    await connectDB();

    // ULID 우선 검색, 없으면 ObjectId로 검색
    let question;
    if (isValidULID(id)) {
      question = await BusinessVoiceQuestion.findOne({ ulid: id });
    }

    if (!question && isValidObjectId(id)) {
      question = await BusinessVoiceQuestion.findById(id);
    }

    if (!question) {
      return NextResponse.json(
        { message: 'Question not found' },
        { status: 404 }
      );
    }

    // 조회수 증가
    question.metrics.viewCount++;
    await question.save();

    return NextResponse.json({ question: serializeQuestion(question) });
  } catch (error) {
    console.error('[GET /api/business-voice/questions/[id]] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 4.2 응답에 ULID 포함
```typescript
function serializeQuestion(doc: IBusinessVoiceQuestion) {
  return {
    id: doc.ulid || doc._id.toString(), // ULID 우선, 없으면 ObjectId
    ulid: doc.ulid, // 명시적으로 ULID도 제공
    legacyId: doc._id.toString(), // 하위 호환성을 위해 ObjectId도 유지
    title: doc.title,
    content: doc.content,
    // ...
  };
}
```

---

### Phase 5: 프론트엔드 전환 (Frontend Transition)
**목표**: ULID 사용으로 점진적 전환

#### 5.1 링크 생성 시 ULID 우선 사용
```tsx
// src/components/business-voice/QnASection.tsx
{qnaItems.map((item) => (
  <Link
    href={`/business-voice/qna/${item.ulid || item.id}`}
    className="qna-title-link"
  >
    {item.question}
  </Link>
))}
```

#### 5.2 URL 리다이렉트 (옵션)
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isValidObjectId } from 'mongoose';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ObjectId로 접근 시 ULID로 리다이렉트 (옵션)
  const match = pathname.match(/^\/business-voice\/qna\/([^\/]+)$/);
  if (match) {
    const id = match[1];
    if (isValidObjectId(id)) {
      // DB에서 ULID 조회 후 리다이렉트
      // (성능을 위해 선택적 구현)
    }
  }

  return NextResponse.next();
}
```

---

## 데이터 누락 방지 전략

### 1. 백업 전략

#### 1.1 마이그레이션 전 전체 백업
```bash
# MongoDB 백업
mongodump --uri="${MONGODB_URI}" --out="./backups/pre-ulid-migration-$(date +%Y%m%d-%H%M%S)"

# 또는 Vercel CLI 사용
vercel env pull .env.backup
```

#### 1.2 컬렉션별 백업
```javascript
// scripts/backup-collection.js
const mongoose = require('mongoose');
const fs = require('fs');

async function backupCollection(collectionName) {
  const collection = mongoose.connection.collection(collectionName);
  const docs = await collection.find({}).toArray();

  const backupPath = `./backups/${collectionName}-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(docs, null, 2));

  console.log(`✅ Backup saved: ${backupPath} (${docs.length} docs)`);
}
```

### 2. 트랜잭션 보장

#### 2.1 배치 처리 시 트랜잭션 사용
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 배치 업데이트
  await collection.bulkWrite(batch, { session });

  // 커밋
  await session.commitTransaction();
  console.log('✅ Batch committed');
} catch (error) {
  // 롤백
  await session.abortTransaction();
  console.error('❌ Batch rolled back:', error);
  throw error;
} finally {
  session.endSession();
}
```

### 3. 검증 전략

#### 3.1 마이그레이션 후 검증 스크립트
```javascript
// scripts/verify-ulid-migration.js
async function verifyMigration() {
  const results = {
    total: 0,
    withULID: 0,
    withoutULID: 0,
    duplicateULIDs: 0,
    invalidULIDs: 0,
  };

  const collections = ['businessvoicequestions', 'ttontoks'];

  for (const collectionName of collections) {
    console.log(`\n🔍 Verifying ${collectionName}...`);

    const collection = mongoose.connection.collection(collectionName);

    // 전체 문서 수
    results.total = await collection.countDocuments();

    // ULID 있는 문서 수
    results.withULID = await collection.countDocuments({
      ulid: { $exists: true, $ne: null },
    });

    // ULID 없는 문서 수
    results.withoutULID = await collection.countDocuments({
      $or: [{ ulid: { $exists: false } }, { ulid: null }],
    });

    // ULID 중복 확인
    const duplicates = await collection.aggregate([
      { $match: { ulid: { $exists: true } } },
      { $group: { _id: '$ulid', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]).toArray();
    results.duplicateULIDs = duplicates.length;

    // ULID 형식 검증
    const invalidULIDs = await collection.countDocuments({
      ulid: { $exists: true, $not: /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/ },
    });
    results.invalidULIDs = invalidULIDs;

    console.log(`  Total: ${results.total}`);
    console.log(`  With ULID: ${results.withULID} (${((results.withULID / results.total) * 100).toFixed(2)}%)`);
    console.log(`  Without ULID: ${results.withoutULID}`);
    console.log(`  Duplicate ULIDs: ${results.duplicateULIDs}`);
    console.log(`  Invalid ULIDs: ${results.invalidULIDs}`);

    if (results.total === results.withULID && results.duplicateULIDs === 0 && results.invalidULIDs === 0) {
      console.log(`  ✅ PASSED`);
    } else {
      console.log(`  ❌ FAILED`);
    }
  }
}
```

### 4. 점진적 마이그레이션

#### 4.1 컬렉션별 단계적 적용
```
Phase 1: businessvoicequestions (소규모 컬렉션)
Phase 2: ttontoks (중간 규모)
Phase 3: expertexaminers (참조 관계 포함)
Phase 4: 나머지 컬렉션
```

#### 4.2 각 단계별 검증
```javascript
async function migrateCollectionSafely(collectionName) {
  console.log(`\n🚀 Migrating ${collectionName}...`);

  // 1. 백업
  await backupCollection(collectionName);

  // 2. 마이그레이션
  await migrateULIDForCollection(collectionName);

  // 3. 검증
  const isValid = await verifyCollection(collectionName);

  if (!isValid) {
    console.error(`❌ Validation failed for ${collectionName}`);

    // 4. 자동 롤백
    const rollbackConfirm = await prompt('Rollback? (yes/no): ');
    if (rollbackConfirm === 'yes') {
      await rollbackCollection(collectionName);
    }

    throw new Error(`Migration failed for ${collectionName}`);
  }

  console.log(`✅ ${collectionName} migration completed successfully`);
}
```

### 5. 모니터링 전략

#### 5.1 마이그레이션 진행률 표시
```javascript
const progressBar = new ProgressBar('[:bar] :percent :current/:total (:elapsed s)', {
  total: totalDocuments,
  width: 40,
});

for (const doc of documents) {
  // 마이그레이션 작업
  await migrateDocument(doc);

  progressBar.tick();
}
```

#### 5.2 에러 로깅
```javascript
const errorLog = [];

try {
  await migrateDocument(doc);
} catch (error) {
  errorLog.push({
    documentId: doc._id,
    error: error.message,
    timestamp: new Date(),
  });
}

// 에러 로그 저장
fs.writeFileSync(
  `./logs/migration-errors-${Date.now()}.json`,
  JSON.stringify(errorLog, null, 2)
);
```

---

## 롤백 계획

### 1. ULID 제거 (긴급 롤백)
```javascript
// scripts/rollback-ulid.js
async function rollbackULID() {
  console.log('🔄 Rolling back ULID migration...');

  const collections = ['businessvoicequestions', 'ttontoks'];

  for (const collectionName of collections) {
    const collection = mongoose.connection.collection(collectionName);

    // ULID 필드 제거
    const result = await collection.updateMany(
      { ulid: { $exists: true } },
      { $unset: { ulid: '' } }
    );

    console.log(`  ${collectionName}: ${result.modifiedCount} docs rolled back`);
  }

  console.log('✅ Rollback completed');
}
```

### 2. 백업에서 복원
```bash
# MongoDB 복원
mongorestore --uri="${MONGODB_URI}" --drop ./backups/pre-ulid-migration-YYYYMMDD-HHMMSS
```

### 3. 스키마 롤백
```typescript
// 스키마에서 ULID 필드 제거
const questionSchema = new Schema<IBusinessVoiceQuestion>({
  // ulid 필드 제거
  title: String,
  content: String,
  // ...
});
```

---

## 단계별 실행 계획

### Week 1: 준비 및 테스트
- [ ] ULID 라이브러리 설치
- [ ] 유틸리티 함수 작성
- [ ] 테스트 환경에서 스키마 확장
- [ ] 마이그레이션 스크립트 작성
- [ ] 백업 스크립트 작성
- [ ] 검증 스크립트 작성

### Week 2: 개발 환경 적용
- [ ] 개발 DB 백업
- [ ] 마이그레이션 실행 (dev)
- [ ] 검증
- [ ] API 하이브리드 지원 구현
- [ ] 프론트엔드 ULID 우선 사용

### Week 3: 스테이징 환경 적용
- [ ] 스테이징 DB 백업
- [ ] 마이그레이션 실행 (staging)
- [ ] 검증
- [ ] E2E 테스트
- [ ] 성능 테스트

### Week 4: 프로덕션 적용
- [ ] 프로덕션 DB 백업 (다운타임 최소화)
- [ ] 마이그레이션 실행 (prod) - 새벽 시간대
- [ ] 검증
- [ ] 모니터링 (24시간)
- [ ] ObjectId 지원 제거 (점진적)

---

## 테스트 계획

### 1. 단위 테스트
```typescript
// __tests__/utils/ulid.test.ts
describe('ULID Utils', () => {
  it('should generate valid ULID', () => {
    const id = generateULID();
    expect(isValidULID(id)).toBe(true);
    expect(id).toHaveLength(26);
  });

  it('should validate ULID correctly', () => {
    expect(isValidULID('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true);
    expect(isValidULID('invalid')).toBe(false);
  });

  it('should validate ObjectId correctly', () => {
    expect(isValidObjectId('68e5d3698f5ea84eaeced172')).toBe(true);
    expect(isValidObjectId('invalid')).toBe(false);
  });
});
```

### 2. 통합 테스트
```typescript
// __tests__/api/business-voice/questions.test.ts
describe('API with ULID', () => {
  it('should fetch question by ULID', async () => {
    const res = await fetch('/api/business-voice/questions/01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(res.ok).toBe(true);
  });

  it('should fetch question by ObjectId (backward compat)', async () => {
    const res = await fetch('/api/business-voice/questions/68e5d3698f5ea84eaeced172');
    expect(res.ok).toBe(true);
  });
});
```

### 3. E2E 테스트
```typescript
// e2e/ulid-migration.spec.ts
test('ULID in URL', async ({ page }) => {
  await page.goto('/business-voice/qna/01ARZ3NDEKTSV4RRFFQ69G5FAV');
  await expect(page).toHaveTitle(/묻고 답하기/);
});
```

---

## 요약

### 마이그레이션 원칙
1. **Zero Downtime**: 서비스 중단 없이 점진적 마이그레이션
2. **Zero Data Loss**: 백업 및 트랜잭션으로 데이터 보호
3. **Backward Compatibility**: ObjectId 하이브리드 지원
4. **Gradual Rollout**: 컬렉션별 단계적 적용
5. **Comprehensive Testing**: 철저한 검증 및 테스트

### 성공 기준
- ✅ 모든 문서에 ULID 추가 (100%)
- ✅ 중복 ULID 없음 (0개)
- ✅ 잘못된 ULID 형식 없음 (0개)
- ✅ API 하위 호환성 유지
- ✅ 성능 저하 없음 (<5%)

---

**작성일**: 2025-10-08
**작성자**: Claude Code
**다음 단계**: Phase 1 (준비) 시작
