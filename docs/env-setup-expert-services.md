# Expert Services 환경변수 설정 가이드

## 🔐 보안 수정 후 필수 작업

expert-services/admin 페이지의 보안 취약점 수정 후, Vercel 환경변수를 업데이트해야 합니다.

---

## 📋 Vercel 환경변수 설정

### 1단계: Vercel 대시보드 접속

```
https://vercel.com/dashboard
```

1. 프로젝트 선택: **naraddon-homepage**
2. 상단 메뉴: **Settings** 클릭
3. 좌측 메뉴: **Environment Variables** 클릭

---

### 2단계: 새 환경변수 추가

**추가할 환경변수:**

| Key | Value | Environment |
|-----|-------|-------------|
| `EXPERT_SERVICES_PASSWORD` | (실제 비밀번호) | Production, Preview, Development |

**설정 방법:**
1. "Add New" 버튼 클릭
2. Key: `EXPERT_SERVICES_PASSWORD` 입력
3. Value: 실제 비밀번호 입력 (따옴표 없이)
4. Environment: 모든 환경 선택 (Production, Preview, Development)
5. "Save" 클릭

---

### 3단계: 기존 환경변수 삭제 (있는 경우)

⚠️ **중요**: 다음 환경변수가 있다면 반드시 삭제하세요:

- `NEXT_PUBLIC_EXPERT_SERVICES_PASSWORD`
- `EXPERT_SERVICES_ADMIN_PASSWORD`

**삭제 방법:**
1. 환경변수 목록에서 해당 변수 찾기
2. 우측 "..." 버튼 클릭
3. "Delete" 클릭
4. 확인

---

### 4단계: 재배포

환경변수 변경 후 재배포가 필요합니다.

**방법 1: Vercel 대시보드에서 재배포**
1. 상단 메뉴: **Deployments** 클릭
2. 최신 배포 찾기 (commit: `c0f433f`)
3. 우측 "..." 버튼 → **Redeploy** 클릭
4. "Redeploy" 확인

**방법 2: Git push로 재배포**
```bash
git commit --allow-empty -m "chore: trigger redeploy for env vars"
git push naraddon main
```

---

## ✅ 설정 확인

### 배포 완료 후 테스트:

1. **로그인 페이지 접속**
   ```
   https://naraddon.com/expert-services/admin
   ```

2. **개발자 도구 확인**
   - F12 → Console 탭
   - 에러 없이 로그인 폼 표시되는지 확인

3. **로그인 테스트**
   - 비밀번호 입력
   - "로그인 중..." 표시 확인
   - Network 탭에서 `/api/expert-services/verify` POST 요청 확인
   - Response: `{"success": true, "message": "인증되었습니다."}`

4. **보안 확인**
   - F12 → Sources 탭
   - `Ctrl+Shift+F` (전체 검색)
   - `EXPERT_SERVICES` 검색 → 비밀번호 노출되지 않아야 함

---

## 🔍 문제 해결

### 로그인 실패 시

**증상**: "비밀번호가 올바르지 않습니다."

**원인**: 환경변수가 설정되지 않았거나 재배포되지 않음

**해결**:
1. Vercel Settings → Environment Variables 확인
2. `EXPERT_SERVICES_PASSWORD`가 있는지 확인
3. 재배포 진행

---

### 500 에러 발생 시

**증상**: "로그인 중 오류가 발생했습니다."

**원인**: 서버 환경변수 누락

**해결**:
```bash
# Vercel 대시보드에서 확인
1. Environment Variables 탭
2. EXPERT_SERVICES_PASSWORD 존재 여부
3. Production 환경에 체크되어 있는지 확인
```

---

### 네트워크 에러 시

**증상**: API 호출 자체가 실패

**원인**: `/api/expert-services/verify` 엔드포인트 배포 안됨

**해결**:
```bash
# 최신 코드 배포 확인
git log -1 --oneline
# 결과: c0f433f fix: 🔒 보안 취약점 수정...

# Vercel Deployments 탭에서 확인
- 배포 상태: Ready
- Commit: c0f433f
```

---

## 📚 관련 파일

| 파일 | 설명 |
|-----|------|
| `app/expert-services/admin/page.tsx` | 프론트엔드 (로그인 폼) |
| `src/app/api/expert-services/verify/route.ts` | 서버 API (비밀번호 검증) |
| `.env.example` | 환경변수 템플릿 |

---

## 🔒 보안 체크리스트

- [ ] `EXPERT_SERVICES_PASSWORD` 환경변수 추가됨
- [ ] `NEXT_PUBLIC_` 접두사 사용하지 않음
- [ ] 모든 환경(Production, Preview, Development)에 설정됨
- [ ] 기존 `NEXT_PUBLIC_EXPERT_SERVICES_PASSWORD` 삭제됨
- [ ] Vercel 재배포 완료
- [ ] 로그인 기능 정상 작동 확인
- [ ] 브라우저 소스 코드에서 비밀번호 검색 → 없음

---

## 📝 배포 이력

| Date | Commit | Description |
|------|--------|-------------|
| 2025-10-08 | c0f433f | 보안 취약점 수정 - 클라이언트 비밀번호 검증 제거 |

---

**작성일**: 2025-10-08
**작성자**: Claude Code
