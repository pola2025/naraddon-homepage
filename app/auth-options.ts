import type { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import clientPromise from '../lib/mongodb-client';
import { notifyNewUserSignup } from '@/lib/telegram';

/**
 * NextAuth 인증 설정
 *
 * @purpose 네이버 OAuth 소셜 로그인 처리 및 사용자 정보 MongoDB 저장
 * @context 사용자가 네이버 계정으로 로그인하면 자동으로 DB에 사용자 정보 저장
 * @decision MongoDBAdapter 사용하여 계정 연결 정보 관리 (OAuthAccountNotLinked 해결)
 */
export const authOptions: NextAuthOptions = {
  adapter: {
    ...MongoDBAdapter(clientPromise, {
      databaseName: 'naraddon',
    }),
    // 🔥 MongoDBAdapter의 createUser를 오버라이드하여 타임스탬프 및 전화번호 추가
    async createUser(user: any) {
      const adapter = MongoDBAdapter(clientPromise, { databaseName: 'naraddon' });
      const now = new Date();

      // 타임스탬프 및 전화번호 필드 추가
      const userWithTimestamps = {
        ...user,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        role: user.role || 'user',
        status: user.status || 'active',
        mobile: user.mobile || null, // 전화번호 저장
      };

      console.log('[Auth] Creating new user with mobile:', user.email, 'Mobile:', user.mobile);
      const createdUser = await adapter.createUser!(userWithTimestamps);
      console.log('[Auth] ✅ New user created with mobile:', user.email);

      return createdUser;
    },
  },
  providers: [
    {
      id: 'naver',
      name: 'Naver',
      type: 'oauth',
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
      // 네이버 OAuth URL 설정
      authorization: {
        url: 'https://nid.naver.com/oauth2.0/authorize',
        params: {
          // 전화번호 포함하여 요청
          scope: 'name email mobile'
        }
      },
      token: 'https://nid.naver.com/oauth2.0/token',
      userinfo: 'https://openapi.naver.com/v1/nid/me',
      // 프로필 매핑 - 전화번호 포함
      profile(profile: any) {
        const mobile = profile.response?.mobile || profile.response?.mobile_e164;
        return {
          id: profile.response?.id,
          name: profile.response?.name,
          email: profile.response?.email,
          image: profile.response?.profile_image,
          mobile: mobile, // 전화번호 추가
        };
      },
    },
    /**
     * 개발 환경 전용 테스트 로그인
     *
     * @purpose 개발 서버에서 네이버 OAuth 없이 테스트 가능
     * @security NODE_ENV === 'development' && DEV_AUTO_LOGIN === 'true' 일 때만 활성화
     * @warning 프로덕션에서는 절대 작동하지 않음
     */
    ...(process.env.NODE_ENV === 'development' && process.env.DEV_AUTO_LOGIN === 'true'
      ? [
          CredentialsProvider({
            id: 'dev-login',
            name: '개발자 테스트 로그인',
            credentials: {
              email: { label: 'Email', type: 'email' },
              role: { label: 'Role', type: 'text' },
            },
            async authorize(credentials) {
              // 🔥 보안: 개발 환경에서만 작동
              if (process.env.NODE_ENV !== 'development') {
                console.error('[Dev Login] ⛔ Blocked in non-development environment');
                return null;
              }

              const email = credentials?.email || 'test@naraddon.dev';
              const role = credentials?.role || 'user';

              console.log('[Dev Login] ✅ Test user logged in:', email, 'Role:', role);

              return {
                id: 'dev-user-' + Date.now(),
                email,
                name: '테스트 사용자',
                role,
                image: null,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    /**
     * 리다이렉트 URL 처리
     *
     * @purpose 개발 환경에서 localhost 리다이렉트 허용
     * @context NEXTAUTH_URL이 프로덕션으로 설정되어 있어도 개발 환경에서는 localhost로 리다이렉트
     */
    async redirect({ url, baseUrl }) {
      // 개발 환경에서 localhost URL은 그대로 허용
      if (process.env.NODE_ENV === 'development') {
        // localhost로 시작하는 URL은 허용
        if (url.startsWith('http://localhost')) {
          return url;
        }
        // 상대 경로는 localhost 기준으로 처리
        if (url.startsWith('/')) {
          return `http://localhost:3001${url}`;
        }
      }

      // 같은 사이트의 URL은 허용
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // 상대 경로는 baseUrl 기준으로 처리
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // 그 외는 baseUrl로 리다이렉트
      return baseUrl;
    },

    /**
     * 로그인 시 사용자 정보를 MongoDB에 저장
     *
     * @purpose 소셜 로그인 시 사용자 정보를 DB에 자동으로 등록/업데이트
     * @context 첫 로그인 시 신규 사용자 생성, 기존 사용자는 정보 업데이트
     */
    async signIn({ user, account, profile }) {
      try {
        if (!user.email || !account) {
          console.error('[Auth] No email or account provided');
          return false;
        }

        const client = await clientPromise;
        const db = client.db('naraddon');
        const usersCollection = db.collection('users');
        const accountsCollection = db.collection('accounts');

        // 🔥 블랙리스트 체크 (재가입 차단)
        const blacklisted = await db.collection('auth-blacklist').findOne({ email: user.email });
        if (blacklisted) {
          console.log('[Auth] ⛔ Blocked blacklisted user:', user.email);
          return false; // 로그인 거부
        }

        // 🔥 네이버 프로필 디버깅
        console.log('[Auth] Naver profile received:', JSON.stringify(profile, null, 2));

        const mobile = (profile as any)?.response?.mobile || (profile as any)?.response?.mobile_e164;
        console.log('[Auth] Extracted mobile:', mobile);

        // 1. 사용자 확인 (신규 여부 판단)
        const existingUser = await usersCollection.findOne({ email: user.email });
        const isNewUser = !existingUser; // 신규 가입 여부 (signIn 콜백 호출 시점 기준)

        console.log(`[Auth] SignIn callback - User: ${user.email}, IsNew: ${isNewUser}, Mobile: ${mobile}`);

        // 2. 기존 사용자: 정보 업데이트 (createdAt 절대 변경 안 함)
        if (existingUser) {
          const updateData: any = {
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          };

          if (mobile) {
            updateData.mobile = mobile;
          }

          if (!existingUser.role) {
            updateData.role = 'user';
          }
          if (!existingUser.status) {
            updateData.status = 'active';
          }

          // 🔥 가입일(createdAt)이 없는 경우만 추가 (기존 가입일 보존)
          if (!existingUser.createdAt) {
            updateData.createdAt = new Date();
            console.log('[Auth] Missing createdAt field added for existing user:', user.email);
          }

          await usersCollection.updateOne(
            { email: user.email },
            { $set: updateData }
          );

          console.log('[Auth] ✅ Existing user updated:', user.email);
        }

        // 🔥 FIX: MongoDBAdapter가 사용자를 생성한 직후 조회하여 mobile 업데이트
        // 3. accounts 연결 확인 및 생성 (OAuthAccountNotLinked 해결)
        const currentUser = await usersCollection.findOne({ email: user.email });
        if (currentUser) {
          // 🔥 3-1. mobile 무조건 업데이트 (신규/기존 무관, mobile 값이 있으면)
          // NextAuth가 profile()의 mobile을 무시할 수 있으므로 여기서 강제 저장
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

          // 3-2. accounts 연결
          const existingAccount = await accountsCollection.findOne({
            provider: account.provider,
            providerAccountId: account.providerAccountId
          });

          if (!existingAccount) {
            // 🔥 FIX: userId를 ObjectId로 저장 (문자열 아님) - MongoDBAdapter와 타입 일치
            await accountsCollection.insertOne({
              userId: currentUser._id,  // toString() 제거 - ObjectId 그대로 저장
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            });
            console.log('[Auth] Account link created for:', user.email);
          }
        }

        // 5. 🔥 신규 가입 시 텔레그램 알림 전송 (네이버 로그인에 영향 없음)
        if (isNewUser && user.name && user.email) {
          console.log('[Auth] Detected new user signup, will send Telegram notification');
          try {
            await notifyNewUserSignup({
              name: user.name,
              email: user.email,
              mobile: mobile,
              provider: account.provider,
            });
            console.log('[Auth] ✅ Telegram notification sent for new user:', user.email);
          } catch (telegramError) {
            // 텔레그램 알림 실패해도 로그인은 계속 진행
            console.error('[Auth] ⚠️ Telegram notification failed (login continues):', telegramError);
          }
        }

        return true;
      } catch (error) {
        console.error('[Auth] Error in signIn callback:', error);
        return false;
      }
    },
    async jwt({ token, account, profile, user }) {
      if (account && profile) {
        token.provider = 'naver';
        token.providerId = profile.response?.id;
      }
      if (user) {
        token.email = user.email;
      }

      // 🔥 FIX: MongoDB에서 role, mobile, isAdmin, examinerId 조회하여 token에 저장
      if (token.email) {
        try {
          const client = await clientPromise;
          const db = client.db('naraddon');
          const dbUser = await db.collection('users').findOne(
            { email: token.email as string },
            { projection: { role: 1, mobile: 1, isAdmin: 1, _id: 1 } }
          );
          if (dbUser) {
            token.role = dbUser.role || 'user';
            token.id = dbUser._id.toString();
            token.mobile = dbUser.mobile || null;
            // 🔥 isAdmin은 명시적으로 true인 경우만 true
            token.isAdmin = dbUser.isAdmin === true;
            console.log('[JWT Callback] Role:', token.role, 'isAdmin:', token.isAdmin, 'DB isAdmin:', dbUser.isAdmin, 'Mobile:', token.mobile ? 'exists' : 'none');

            // 🔥 심사관 여부 확인 및 examinerId 조회 (브랜드 페이지 접근용)
            // expert-examiners 테이블에 있으면 심사관으로 간주 (role 무관)
            if (!token.examinerId) {
              try {
                const expertExaminer = await db.collection('expert-examiners').findOne(
                  { $or: [{ email: token.email as string }, { userId: dbUser._id.toString() }] },
                  { projection: { _id: 1 } }
                );
                if (expertExaminer) {
                  token.examinerId = expertExaminer._id.toString();
                  console.log('[JWT Callback] ExaminerId set from DB:', token.examinerId);

                  // expert-examiners에 있으면 role을 examiner로 업데이트
                  // 🔥 단, 관리자는 강등하지 않는다 (심사관 겸 관리자 허용)
                  // examinerId는 role과 무관하게 위에서 세팅되므로
                  // 관리자로 남겨도 브랜드 페이지 등 심사관 기능은 그대로 동작한다
                  const isAdminRole = dbUser.role === 'admin' || dbUser.role === 'super_admin';
                  if (dbUser.role !== 'examiner' && !isAdminRole) {
                    await db.collection('users').updateOne(
                      { _id: dbUser._id },
                      { $set: { role: 'examiner' } }
                    );
                    token.role = 'examiner';
                    console.log('[JWT Callback] Role updated to examiner');
                  } else if (isAdminRole) {
                    console.log('[JWT Callback] Admin keeps role (examiner 겸직):', dbUser.role);
                  }
                } else {
                  console.log('[JWT Callback] No ExpertExaminer found for:', token.email);
                }
              } catch (examinerError) {
                console.error('[JWT Callback] Error fetching examinerId:', examinerError);
                // examinerId 조회 실패해도 로그인은 계속 진행
              }
            }
          }
        } catch (error) {
          console.error('[JWT Callback] Error fetching role:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).provider = token.provider;
        (session.user as any).providerId = token.providerId;

        // JWT 토큰에서 role 가져오기 (이미 JWT 콜백에서 DB 조회함)
        (session.user as any).role = token.role || 'user';
        (session.user as any).id = token.id;

        // 🔥 mobile 정보 포함 (전화번호 모달 표시 여부 판단용)
        (session.user as any).mobile = token.mobile || null;

        // 🔥 관리자 권한 플래그 포함
        (session.user as any).isAdmin = token.isAdmin || false;

        // 🔥 심사관인 경우 examinerId 포함 (브랜드 페이지 접근용)
        if (token.examinerId) {
          (session.user as any).examinerId = token.examinerId;
          console.log('[Session Callback] ExaminerId from token:', token.examinerId);
        }

        console.log('[Session Callback] Role:', token.role, 'isAdmin:', token.isAdmin, 'Mobile:', token.mobile ? 'exists' : 'none');
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET!,
  session: {
    strategy: 'jwt',
  },
  // 디버그 활성화
  debug: true,
};