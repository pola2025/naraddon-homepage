# 전화번호 모달 로직 검증

**날짜**: 2025-11-07
**목적**: 프로덕션 배포 전 로직 검증

---

## 📋 전체 흐름

```
1. 네이버 로그인
   ↓
2. auth-options.ts: signIn 콜백
   - 네이버 프로필에서 mobile 추출
   - mobile 있으면 DB 저장
   ↓
3. auth-options.ts: jwt 콜백
   - DB에서 mobile 조회
   - token.mobile에 저장
   ↓
4. auth-options.ts: session 콜백
   - token.mobile → session.user.mobile
   ↓
5. AuthProvider.tsx: useEffect
   - session.user.mobile 체크
   - 없으면 모달 표시
   ↓
6. PhoneNumberModal.tsx: 사용자 입력
   - 전화번호 입력 + 자동 포맷팅
   - "등록하기" 클릭
   ↓
7. /api/users/update-phone: POST
   - 세션 확인
   - 전화번호 검증
   - DB 업데이트
   ↓
8. AuthProvider.tsx: 세션 업데이트
   - update() 호출
   - 모달 닫기
```

---

## ✅ 1단계: 네이버 OAuth에서 mobile 받기

**파일**: `app/auth-options.ts:49-68`

```typescript
// 네이버 OAuth 설정
authorization: {
  url: 'https://nid.naver.com/oauth2.0/authorize',
  params: {
    scope: 'name email mobile'  // ✅ mobile 요청
  }
},

// 프로필 매핑
profile(profile: any) {
  const mobile = profile.response?.mobile || profile.response?.mobile_e164;
  return {
    id: profile.response?.id,
    name: profile.response?.name,
    email: profile.response?.email,
    image: profile.response?.profile_image,
    mobile: mobile,  // ✅ mobile 반환
  };
}
```

**검증 결과**: ✅ PASS
- 네이버에 mobile 권한 요청
- profile()에서 mobile 추출 및 반환

---

## ✅ 2단계: signIn 콜백에서 mobile 저장

**파일**: `app/auth-options.ts:90-153`

```typescript
async signIn({ user, account, profile }) {
  // 네이버 프로필에서 mobile 추출
  const mobile = (profile as any)?.response?.mobile ||
                 (profile as any)?.response?.mobile_e164;

  console.log('[Auth] Extracted mobile:', mobile);  // ✅ 디버깅 로그

  // ... 기존 사용자 업데이트 로직 (mobile 포함)

  // MongoDBAdapter 생성 직후 조회
  const currentUser = await usersCollection.findOne({ email: user.email });

  if (currentUser) {
    // ✅ 핵심: mobile 있으면 무조건 저장
    if (mobile) {
      await usersCollection.updateOne(
        { _id: currentUser._id },
        {
          $set: {
            mobile: mobile,
            updatedAt: new Date()
          }
        }
      );
      console.log('[Auth] ✅ Mobile saved/updated:', user.email, mobile);
    } else {
      console.log('[Auth] ⚠️ No mobile received from Naver:', user.email);
    }
  }

  return true;
}
```

**검증 결과**: ✅ PASS
- mobile 추출 로직 정상
- 신규/기존 무관하게 mobile 저장
- 디버깅 로그 완비

---

## ✅ 3단계: JWT에 mobile 포함

**파일**: `app/auth-options.ts:208-221`

```typescript
async jwt({ token, account, profile, user }) {
  if (token.email) {
    const dbUser = await db.collection('users').findOne(
      { email: token.email as string },
      { projection: { role: 1, mobile: 1, _id: 1 } }  // ✅ mobile 조회
    );

    if (dbUser) {
      token.role = dbUser.role || 'user';
      token.id = dbUser._id.toString();
      token.mobile = dbUser.mobile || null;  // ✅ mobile 저장

      console.log('[JWT Callback] Mobile:', token.mobile ? 'exists' : 'none');
    }
  }

  return token;
}
```

**검증 결과**: ✅ PASS
- DB에서 mobile 조회
- token에 mobile 저장
- 디버깅 로그 있음

---

## ✅ 4단계: Session에 mobile 포함

**파일**: `app/auth-options.ts:260-281`

```typescript
async session({ session, token }) {
  if (session.user) {
    (session.user as any).role = token.role || 'user';
    (session.user as any).id = token.id;
    (session.user as any).mobile = token.mobile || null;  // ✅ mobile 포함

    console.log('[Session Callback] Mobile:', token.mobile ? 'exists' : 'none');
  }

  return session;
}
```

**검증 결과**: ✅ PASS
- token.mobile → session.user.mobile
- 프론트엔드에서 접근 가능

---

## ✅ 5단계: AuthProvider에서 모달 표시 조건

**파일**: `src/components/AuthProvider.tsx:23-48`

```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;

  // 로그인 안 했으면 모달 표시 안 함
  if (!session?.user) {
    setShowPhoneModal(false);
    return;
  }

  // mobile 있으면 모달 표시 안 함  // ✅ 핵심 조건
  const userWithMobile = session.user as any;
  if (userWithMobile.mobile) {
    setShowPhoneModal(false);
    return;
  }

  // 이번 세션에서 "나중에" 눌렀으면 모달 표시 안 함
  const hideModal = sessionStorage.getItem('hidePhoneModal');
  if (hideModal === 'true') {
    setShowPhoneModal(false);
    return;
  }

  // 위 조건 모두 통과 → 모달 표시  // ✅ 모달 띄움
  setShowPhoneModal(true);
}, [session]);
```

**검증 결과**: ✅ PASS
- 로그인 체크: session?.user
- mobile 체크: userWithMobile.mobile
- sessionStorage 체크: hidePhoneModal
- 조건 명확하고 로직 정확

---

## ✅ 6단계: 모달 UI 및 입력 검증

**파일**: `src/components/auth/PhoneNumberModal.tsx`

```typescript
// 자동 포맷팅: 01012345678 → 010-1234-5678
const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/[^\d]/g, '');
  const limited = numbers.slice(0, 11);

  if (limited.length <= 3) return limited;
  if (limited.length <= 7) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
}

// 유효성 검사: 010-xxxx-xxxx
const validatePhoneNumber = (phone: string): boolean => {
  return /^010-\d{4}-\d{4}$/.test(phone);
}
```

**검증 결과**: ✅ PASS
- 자동 포맷팅 정상
- 유효성 검사 정확
- UI/UX 우수

---

## ✅ 7단계: API 전화번호 저장

**파일**: `app/api/users/update-phone/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // 1. 세션 확인  // ✅
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, message: '로그인이 필요합니다' },
      { status: 401 }
    );
  }

  // 2. 전화번호 검증  // ✅
  const { mobile } = await request.json();
  const phoneRegex = /^010-\d{4}-\d{4}$/;
  if (!mobile || !phoneRegex.test(mobile)) {
    return NextResponse.json(
      { success: false, message: '올바른 전화번호 형식이 아닙니다' },
      { status: 400 }
    );
  }

  // 3. DB 업데이트  // ✅
  const user = await usersCollection.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json(
      { success: false, message: '사용자를 찾을 수 없습니다' },
      { status: 404 }
    );
  }

  await usersCollection.updateOne(
    { _id: user._id },
    { $set: { mobile: mobile, updatedAt: new Date() } }
  );

  console.log('[Update Phone] ✅ Mobile updated:', session.user.email, mobile);

  return NextResponse.json({
    success: true,
    message: '전화번호가 저장되었습니다',
    data: { mobile }
  });
}
```

**검증 결과**: ✅ PASS
- 세션 기반 인증 (본인만 수정 가능)
- 전화번호 형식 검증
- DB 업데이트 정상
- 상세한 디버깅 로그

---

## ✅ 8단계: 세션 업데이트 및 모달 닫기

**파일**: `src/components/AuthProvider.tsx:53-64`

```typescript
const handlePhoneSaved = async (phoneNumber: string) => {
  console.log('[AuthProvider] Phone number saved:', phoneNumber);

  // 모달 닫기
  setShowPhoneModal(false);

  // 세션 업데이트 (서버에서 최신 정보 가져오기)  // ✅
  await update();

  // 성공 메시지 표시
  alert('전화번호가 등록되었습니다');
};
```

**검증 결과**: ✅ PASS
- update() 호출로 세션 갱신
- 모달 자동 닫힘
- 사용자 피드백 제공

---

## 🔍 엣지 케이스 검증

### Case 1: 네이버에서 전화번호 안 줄 때
- ✅ 로그: `[Auth] ⚠️ No mobile received from Naver`
- ✅ 모달: 로그인 후 자동 표시
- ✅ 사용자: 수동 입력 가능

### Case 2: "나중에" 버튼 클릭 시
- ✅ sessionStorage에 `hidePhoneModal=true` 저장
- ✅ 이번 세션에만 숨김
- ✅ 다음 로그인 시 다시 표시

### Case 3: 전화번호 입력 중 오류
- ✅ 형식 오류: 빨간색 메시지 표시
- ✅ API 오류: 구체적 에러 메시지
- ✅ 네트워크 오류: catch에서 처리

### Case 4: 세션 만료 상태에서 저장 시도
- ✅ API: 401 Unauthorized 반환
- ✅ 모달: "로그인이 필요합니다" 표시
- ✅ 사용자: 재로그인 유도

---

## 📊 최종 검증 결과

| 단계 | 기능 | 상태 | 디버깅 |
|------|------|------|--------|
| 1 | 네이버 OAuth mobile 요청 | ✅ | N/A |
| 2 | signIn 콜백 mobile 저장 | ✅ | ✅ |
| 3 | JWT에 mobile 포함 | ✅ | ✅ |
| 4 | Session에 mobile 포함 | ✅ | ✅ |
| 5 | AuthProvider 모달 표시 | ✅ | N/A |
| 6 | 모달 UI 및 입력 검증 | ✅ | ✅ |
| 7 | API 전화번호 저장 | ✅ | ✅ |
| 8 | 세션 업데이트 및 모달 닫기 | ✅ | ✅ |

**종합 평가**: ✅ **전체 로직 정상**

---

## 🧪 프로덕션 테스트 방법

### 방법 1: 기존 사용자 mobile 임시 제거
```bash
# 1. 테스트 사용자 mobile 제거 (백업 자동 생성)
node scripts/test-phone-modal-logic.js

# 2. 프로덕션에서 해당 계정으로 로그인
#    → 모달 표시 확인
#    → 전화번호 입력 및 저장
#    → 사용자 관리에서 전화번호 확인

# 3. 테스트 완료 후 복원
node scripts/restore-phone-backup.js
```

### 방법 2: 브라우저 개발자 도구로 확인
```javascript
// F12 → Console 탭에서 실행
// 현재 세션의 mobile 정보 확인
await fetch('/api/auth/session').then(r => r.json()).then(console.log)

// mobile 필드 확인:
// { user: { email: "...", mobile: "010-1234-5678" } }
```

---

## 🚨 주의사항

1. **테스트 계정 선택 시 주의**
   - 실제 사용 중인 관리자 계정 사용 금지
   - 테스트 전용 계정 또는 일반 사용자 계정 사용

2. **복원 필수**
   - 테스트 후 반드시 `restore-phone-backup.js` 실행
   - 백업이 없으면 원래 전화번호 복구 불가

3. **프로덕션 환경**
   - 실제 네이버 OAuth 콜백만 동작
   - 로컬에서는 콜백 URL 불일치로 테스트 불가

---

**검증 완료**: 2025-11-07
**배포 상태**: ✅ 프로덕션 배포됨 (commit: 650c810)
