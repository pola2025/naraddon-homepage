'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { Session } from 'next-auth';
import { useEffect, useState } from 'react';
import PhoneNumberModal from './auth/PhoneNumberModal';

/**
 * AuthProvider 내부 컴포넌트
 *
 * @purpose 세션 체크 및 전화번호 모달 표시 로직
 * @context useSession은 SessionProvider 내부에서만 사용 가능
 */
function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  /**
   * 전화번호 모달 표시 여부 체크
   *
   * @purpose 로그인 상태 + mobile 없음 + "나중에" 안 누름 → 모달 표시
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 로그인 안 했으면 모달 표시 안 함
    if (!session?.user) {
      setShowPhoneModal(false);
      return;
    }

    // mobile 있으면 모달 표시 안 함
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

    // 위 조건 모두 통과 → 모달 표시
    setShowPhoneModal(true);
  }, [session]);

  /**
   * 전화번호 저장 성공 핸들러
   */
  const handlePhoneSaved = async (phoneNumber: string) => {
    console.log('[AuthProvider] Phone number saved:', phoneNumber);

    // 모달 닫기
    setShowPhoneModal(false);

    // 세션 업데이트 (서버에서 최신 정보 가져오기)
    await update();

    // 성공 메시지 표시 (선택사항)
    alert('전화번호가 등록되었습니다');
  };

  /**
   * 모달 닫기 핸들러
   */
  const handleModalClose = () => {
    setShowPhoneModal(false);
  };

  return (
    <>
      {children}
      {showPhoneModal && (
        <PhoneNumberModal
          onClose={handleModalClose}
          onSave={handlePhoneSaved}
        />
      )}
    </>
  );
}

/**
 * AuthProvider 메인 컴포넌트
 *
 * @purpose SessionProvider + 전화번호 모달 로직 통합
 */
export default function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <AuthProviderContent>{children}</AuthProviderContent>
    </SessionProvider>
  );
}
