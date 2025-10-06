# 두 개의 Claude 협업 시스템 설정 가이드

## 🎯 목표
두 개의 VS Code 인스턴스에서 실행되는 Claude Code가 파일 기반으로 통신하며 협업

## 👥 역할 분담

### VS Code 1: Claude A (Main PM/Coder)
- **역할**: 메인 개발자, 프로젝트 매니저
- **작업**:
  - 사용자 요청 접수
  - 작업 계획 수립
  - 코드 작성
  - 최종 실행 및 배포

### VS Code 2: Claude B (Debugger/Reviewer)
- **역할**: 코드 리뷰어, 디버거
- **작업**:
  - 코드 검토
  - 버그 분석
  - 개선 제안
  - 승인/거부 결정

## 📦 설치 및 설정

### 1. 필요한 파일 (이미 생성됨)
```
.claude/
├── tasks/
│   ├── queue.json           # 작업 큐 (A → B)
│   ├── review-queue.json    # 검토 결과 (B → A)
│   └── README.md            # 통신 프로토콜 문서
└── commands/
    ├── submit-task.md       # 작업 제출 명령
    └── check-review.md      # 검토 확인 명령

scripts/
├── watch-tasks.js           # Claude B용 모니터링
└── watch-reviews.js         # Claude A용 모니터링
```

### 2. .gitignore에 추가 (로컬에만 유지)
```bash
# .gitignore
.claude/tasks/*.json
!.claude/tasks/README.md
```

## 🚀 사용 방법

### 시나리오: "나라똔튜브 Admin 컴포넌트 분리"

#### Step 1: 사용자 → Claude A (VS Code 1)
```
사용자: "나라똔튜브 admin 페이지 컴포넌트 분리해줘"
```

#### Step 2: Claude A → 작업 제출
```javascript
// Claude A가 실행
{
  "tasks": [{
    "id": "task-001",
    "type": "review",
    "title": "나라똔튜브 Admin 컴포넌트 분리",
    "files": ["app/naraddon-tube/admin/page.tsx"],
    "description": "590줄 코드를 컴포넌트로 분리. VideoForm, VideoList, ThumbnailUpload 분리 필요",
    "status": "pending_review",
    "createdAt": "2025-10-05T12:00:00Z",
    "assignedTo": "claude-reviewer"
  }]
}
```

**Claude A 실행 명령**:
```bash
# VS Code 1에서
node scripts/watch-reviews.js
```

#### Step 3: Claude B 모니터링 (VS Code 2)
```bash
# VS Code 2에서
node scripts/watch-tasks.js
```

**출력**:
```
🔍 ===== NEW REVIEW REQUEST =====
📋 Task ID: task-001
📝 Title: 나라똔튜브 Admin 컴포넌트 분리
📁 Files: app/naraddon-tube/admin/page.tsx
📖 Description: 590줄 코드를 컴포넌트로 분리...
================================

👉 Claude B: Please review the above task(s)
```

#### Step 4: Claude B → 코드 검토 및 결과 작성
```javascript
// Claude B가 .claude/tasks/review-queue.json 업데이트
{
  "pendingReviews": [{
    "taskId": "task-001",
    "status": "approved",
    "feedback": "컴포넌트 분리 계획 승인. 다음과 같이 분리 권장:",
    "suggestions": [
      "components/VideoForm.tsx - 영상 등록/수정 폼 (약 150줄)",
      "components/VideoList.tsx - 영상 목록 테이블 (약 120줄)",
      "components/ThumbnailUpload.tsx - 썸네일 업로드 (약 80줄)",
      "hooks/useNaraddonTube.ts - 데이터 관리 로직 (약 100줄)",
      "page.tsx - 메인 레이아웃 (약 80줄)"
    ],
    "reviewedAt": "2025-10-05T12:05:00Z",
    "reviewer": "claude-reviewer"
  }]
}
```

#### Step 5: Claude A → 검토 결과 확인 및 실행
**VS Code 1에서 자동 알림**:
```
✅ ===== REVIEW COMPLETED =====
📋 Task ID: task-001
✨ Status: approved
💬 Feedback: 컴포넌트 분리 계획 승인...
💡 Suggestions:
   - components/VideoForm.tsx
   - components/VideoList.tsx
   - components/ThumbnailUpload.tsx
   ...

✅ Task approved! You can proceed with implementation.
```

**Claude A 실행**:
```
사용자 확인 후 컴포넌트 생성 및 코드 분리 실행
```

#### Step 6: 완료 후 큐 정리
```javascript
// Claude A가 queue.json 업데이트
{
  "tasks": [{
    "id": "task-001",
    "status": "completed",  // pending_review → completed
    "completedAt": "2025-10-05T12:30:00Z"
  }]
}
```

## 🔄 자동화 워크플로우

### Claude A (VS Code 1) - 터미널에서 실행
```bash
# 검토 결과 실시간 모니터링
npm run watch:reviews
```

### Claude B (VS Code 2) - 터미널에서 실행
```bash
# 새 작업 실시간 모니터링
npm run watch:tasks
```

### package.json에 스크립트 추가
```json
{
  "scripts": {
    "watch:tasks": "node scripts/watch-tasks.js",
    "watch:reviews": "node scripts/watch-reviews.js"
  }
}
```

## 💡 팁

### Claude A (Main PM/Coder)
1. `/submit-task` 명령으로 검토 요청
2. `watch:reviews` 실행해서 결과 대기
3. 승인되면 바로 구현
4. 거부/수정 요청 시 피드백 반영

### Claude B (Reviewer)
1. `watch:tasks` 실행해서 새 작업 모니터링
2. 작업 발견 시 코드 검토
3. `review-queue.json` 업데이트
4. 명확한 피드백과 제안 작성

## ⚠️ 주의사항

1. **동시 편집 방지**: 한 번에 하나의 Claude만 JSON 파일 수정
2. **명확한 상태 관리**: pending_review → approved/rejected → completed
3. **Git 커밋 금지**: `.claude/tasks/*.json`은 로컬에만 유지
4. **백업**: 중요한 검토는 별도 문서화

## 🎉 예상 효과

- ✅ 코드 품질 향상 (자동 리뷰)
- ✅ 버그 사전 발견
- ✅ 구조화된 협업
- ✅ 작업 이력 추적
- ✅ 의사결정 투명성

---

**설정 완료!** 이제 두 VS Code에서 각각 watch 스크립트를 실행하고 협업을 시작하세요.
