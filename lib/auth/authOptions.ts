import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb-client';
import NaverProvider from 'next-auth/providers/naver';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import { UserRole } from '@/types/user.types';

const isProduction = process.env.NODE_ENV === 'production';

// Validate environment variables
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID?.trim();
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET?.trim();

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error('❌ Naver OAuth configuration error:');
  console.error('NAVER_CLIENT_ID:', NAVER_CLIENT_ID ? 'Set' : 'MISSING');
  console.error('NAVER_CLIENT_SECRET:', NAVER_CLIENT_SECRET ? 'Set' : 'MISSING');
  console.error('Please check Vercel environment variables');
} else {
  console.log('✅ Naver OAuth configured successfully');
  console.log('NAVER_CLIENT_ID:', NAVER_CLIENT_ID.substring(0, 5) + '...');
}

const getMongoAdapter = async () => {
  try {
    const client = await clientPromise;
    if (client && client.db) {
      return MongoDBAdapter(clientPromise);
    }
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
  return undefined;
};

export const authOptions: NextAuthOptions = {
  adapter: process.env.MONGODB_URI ? MongoDBAdapter(clientPromise) : undefined,
  providers: [
    ...(NAVER_CLIENT_ID && NAVER_CLIENT_SECRET ? [
      NaverProvider({
        clientId: NAVER_CLIENT_ID,
        clientSecret: NAVER_CLIENT_SECRET,
        authorization: {
          url: "https://nid.naver.com/oauth2.0/authorize",
          params: {
            response_type: "code",
            client_id: NAVER_CLIENT_ID,
            redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/naver`,
            state: "{state}",
          }
        },
        token: "https://nid.naver.com/oauth2.0/token",
        userinfo: "https://openapi.naver.com/v1/nid/me",
        profile(profile) {
          console.log('Naver profile data:', JSON.stringify(profile, null, 2));
          return {
            id: profile.response?.id,
            name: profile.response?.name || profile.response?.nickname,
            email: profile.response?.email,
            image: profile.response?.profile_image,
            mobile: profile.response?.mobile || profile.response?.mobile_e164,
          }
        },
      })
    ] : []),
    // Google과 Kakao는 나중에 설정
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    // KakaoProvider({
    //   clientId: process.env.KAKAO_CLIENT_ID!,
    //   clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    // }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      /**
       * SignIn 콜백 - 로그인 성공 시 실행
       *
       * @purpose examiner 역할 사용자의 로그인 활동 추적
       * @context 로그인 성공 직후 실행되어 활동 점수 기록
       */
      try {
        if (user?.email) {
          const client = await clientPromise;
          const db = client.db('naraddon');

          // 사용자 role 확인
          const dbUser = await db.collection('users').findOne({ email: user.email });

          if (dbUser && dbUser.role === 'examiner') {
            // examiner의 _id 찾기
            const examiner = await db.collection('expert-examiners').findOne({ userId: dbUser._id.toString() });

            if (examiner) {
              const examinerId = examiner._id.toString();
              const now = new Date();

              console.log('[SignIn Callback] Recording login activity for examiner:', {
                email: user.email,
                examinerId,
                examinerName: examiner.name
              });

              /**
               * 1일 1회 로그인 점수 제한
               *
               * @purpose 로그인 점수는 하루에 한 번만 부여
               * @context 같은 날 여러 번 로그인해도 점수는 1회만 증가
               * @decision KST 기준 날짜로 비교 (UTC+9)
               */
              // KST 기준 오늘 날짜 (YYYY-MM-DD)
              const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로
              const kstNow = new Date(now.getTime() + kstOffset);
              const todayKST = kstNow.toISOString().split('T')[0]; // "2025-10-25"

              // 기존 활동 기록 조회
              const existingActivity = await db.collection('examiner-activities').findOne({ examinerId });
              const lastLoginDate = existingActivity?.activities?.lastLoginDate;

              // 오늘 첫 로그인인지 확인
              const isFirstLoginToday = !lastLoginDate || lastLoginDate !== todayKST;

              console.log('[SignIn Callback] Login date check:', {
                todayKST,
                lastLoginDate,
                isFirstLoginToday
              });

              // 로그인 활동 기록
              await db.collection('examiner-activities').updateOne(
                { examinerId },
                {
                  ...(isFirstLoginToday ? { $inc: { 'activities.loginCount': 1 } } : {}),
                  $set: {
                    userId: dbUser._id.toString(),
                    'activities.lastActiveAt': now,
                    'activities.lastLoginDate': todayKST,
                    updatedAt: now
                  },
                  $setOnInsert: {
                    examinerId,
                    activities: {
                      pageVisits: 0,
                      postsCreated: 0,
                      commentsCreated: 0,
                      consultationsAssigned: 0,
                      consultationsCompleted: 0,
                      loginCount: 0,
                      profileCompletenessScore: 0,
                      lastActiveAt: now,
                      lastLoginDate: todayKST
                    },
                    totalScore: 0,
                    createdAt: now
                  }
                },
                { upsert: true }
              );

              console.log('[SignIn Callback] Login activity recorded:', isFirstLoginToday ? 'New login counted' : 'Same day login, not counted');
            }
          }
        }
      } catch (error) {
        console.error('[SignIn Callback] Error recording login activity:', error);
        // 로그인 활동 기록 실패해도 로그인은 계속 진행
      }

      return true; // 로그인 허용
    },
    async jwt({ token, user, account, profile, trigger }) {
      /**
       * JWT 콜백 - 매 요청마다 실행되어 토큰 갱신
       *
       * @purpose 사용자 role을 실시간으로 MongoDB에서 조회하여 권한 변경 즉시 반영
       * @context trigger 파라미터로 콜백 실행 원인 파악 가능
       */
      const callStart = Date.now();

      try {
        console.log('[JWT Callback] Started -', {
          trigger,
          hasUser: !!user,
          hasAccount: !!account,
          email: token.email || user?.email,
          existingRole: token.role
        });

        // 초기 로그인 시 - user 객체에서 기본 정보 설정
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.role = user.role || UserRole.USER;
          token.mobile = user.mobile;

          console.log('[JWT Callback] Initial login - user data:', {
            id: user.id,
            email: user.email,
            role: user.role
          });
        }

        // 🔥 핵심: 모든 경우에 MongoDB에서 최신 role 조회 (초기 로그인 포함)
        // 이렇게 해야 role 변경이 즉시 반영됨
        if (token.email) {
          try {
            const client = await clientPromise;
            const db = client.db('naraddon');

            console.log('[JWT Callback] Fetching latest role from DB for:', token.email);

            const dbUser = await db.collection('users').findOne(
              { email: token.email as string },
              { projection: { role: 1, mobile: 1, _id: 1, name: 1 } }
            );

            if (dbUser) {
              const oldRole = token.role;
              const newRole = dbUser.role || UserRole.USER;

              token.role = newRole;
              token.id = token.id || dbUser._id.toString();

              if (dbUser.mobile) {
                token.mobile = dbUser.mobile;
              }

              // 🔥 심사관인 경우 examinerId를 세션에 저장 (DB 조회 1회만)
              if (newRole === 'examiner' && !token.examinerId) {
                try {
                  const examiner = await db.collection('expert-examiners').findOne(
                    {
                      $or: [
                        { email: token.email as string },
                        { userId: dbUser._id.toString() }
                      ]
                    },
                    { projection: { _id: 1 } }
                  );

                  if (examiner) {
                    token.examinerId = examiner._id.toString();
                    console.log('[JWT Callback] ✅ ExaminerId cached in session:', token.examinerId);
                  } else {
                    console.warn('[JWT Callback] ⚠️ Examiner profile not found for:', token.email);
                  }
                } catch (examinerError) {
                  console.error('[JWT Callback] Failed to fetch examinerId:', examinerError);
                }
              }

              console.log('[JWT Callback] DB role fetched:', {
                email: token.email,
                oldRole,
                newRole,
                changed: oldRole !== newRole,
                dbUserId: dbUser._id.toString(),
                examinerId: token.examinerId || 'N/A'
              });
            } else {
              /**
               * 사용자 탈퇴 감지 - JWT 무효화
               *
               * @purpose DB에 사용자가 없으면 탈퇴한 것으로 간주하여 토큰 무효화
               * @context JWT는 서버에서 직접 무효화할 수 없으므로 이 방법 사용
               * @note null 반환 시 세션이 종료되고 로그아웃됨
               */
              console.warn('[JWT Callback] User not found in DB - account may be withdrawn:', token.email);

              // 토큰에 withdrawn 플래그 설정 (세션에서 체크 가능)
              (token as any).withdrawn = true;
            }
          } catch (dbError) {
            console.error('[JWT Callback] DB query failed:', {
              email: token.email,
              error: dbError instanceof Error ? dbError.message : String(dbError),
              stack: dbError instanceof Error ? dbError.stack : undefined
            });
            // DB 조회 실패 시 기존 토큰 role 유지 (안정성)
          }
        }

        if (account) {
          token.provider = account.provider;
        }

        // Naver profile에서 전화번호 추가
        if (account?.provider === 'naver' && profile) {
          const naverProfile = profile as any;
          const mobile = naverProfile.response?.mobile || naverProfile.response?.mobile_e164;
          if (mobile) {
            token.mobile = mobile;
            console.log('[JWT Callback] Mobile from Naver profile:', mobile);
          }
        }

        const duration = Date.now() - callStart;
        console.log('[JWT Callback] Completed -', {
          email: token.email,
          finalRole: token.role,
          duration: `${duration}ms`
        });

        return token;
      } catch (error) {
        console.error('[JWT Callback] Fatal error:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        return token;
      }
    },
    async session({ session, token }) {
      try {
        /**
         * 탈퇴 계정 세션 무효화
         *
         * @purpose JWT에 withdrawn 플래그가 있으면 세션을 null로 반환하여 로그아웃
         * @context DB에서 사용자를 찾을 수 없을 때 jwt 콜백이 플래그 설정
         * @note null 반환 시 사용자는 자동으로 로그아웃됨
         */
        if ((token as any).withdrawn) {
          console.warn('[Session Callback] Withdrawn account detected, invalidating session:', token.email);
          return null as any; // 세션 무효화
        }

        if (session.user) {
          // 🔥 CRITICAL FIX: JWT 토큰에 role이 없는 경우 매번 DB에서 직접 조회
          // JWT 콜백이 실행되지 않았거나 role이 누락된 경우 대비
          let userRole = token.role as UserRole;

          // role이 없으면 항상 DB 조회 (강제)
          if (!userRole) {
            console.warn('[Session Callback] Role is missing in token, fetching from DB:', token.email);
            try {
              const client = await clientPromise;
              const db = client.db('naraddon');
              const dbUser = await db.collection('users').findOne(
                { email: token.email as string },
                { projection: { role: 1 } }
              );

              if (dbUser?.role) {
                userRole = dbUser.role as UserRole;
                console.log('[Session Callback] ✅ Role fetched from DB:', userRole);
              } else {
                userRole = UserRole.USER; // 기본값
                console.warn('[Session Callback] ⚠️ No role in DB, using default USER role');
              }
            } catch (dbError) {
              console.error('[Session Callback] ❌ DB query failed:', dbError);
              userRole = UserRole.USER; // 안전한 기본값
            }
          } else {
            console.log('[Session Callback] Using role from token:', userRole);
          }

          session.user.id = token.id as string;
          session.user.role = userRole;
          session.user.mobile = token.mobile as string;
          session.user.provider = token.provider as string;

          // 🔥 심사관 ID를 세션에 추가 (API에서 바로 사용)
          if (token.examinerId) {
            session.user.examinerId = token.examinerId as string;
          }

          console.log('[Session Callback] Final session.user:', {
            role: session.user.role,
            examinerId: session.user.examinerId || 'N/A'
          });
        }
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },
    async signIn({ user, account, profile }) {
      console.log('SignIn attempt:', account?.provider);

      try {
        if (account && user.email) {
          const client = await clientPromise;
          const db = client.db('naraddon');

          // 모든 로그인 시 lastLoginAt 업데이트
          // $setOnInsert: 신규 생성 시에만 createdAt 설정 (기존 문서에는 영향 없음)
          await db.collection('users').updateOne(
            { email: user.email },
            {
              $set: {
                lastLoginAt: new Date(),
                updatedAt: new Date()
              },
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            { upsert: true }
          );
          console.log('✅ Last login time updated:', user.email);

          // 네이버 로그인 시 전화번호 정보 저장
          if (account.provider === 'naver' && profile) {
            const naverProfile = profile as any;
            const mobile = naverProfile.response?.mobile || naverProfile.response?.mobile_e164;

            if (mobile) {
              // users 컬렉션에 mobile 필드 업데이트
              await db.collection('users').updateOne(
                { email: user.email },
                {
                  $set: {
                    mobile: mobile,
                    updatedAt: new Date()
                  },
                  $setOnInsert: {
                    createdAt: new Date()
                  }
                },
                { upsert: true }
              );
              console.log('✅ Mobile number saved:', mobile);
            }
          }

          // 기존 계정이 있는지 확인 (accounts collection에서 확인)
          const existingAccount = await db.collection('accounts').findOne({
            provider: account.provider,
            providerAccountId: account.providerAccountId
          });

          // 계정이 없다면 신규 가입자
          if (!existingAccount) {
            console.log('🎉 New user registration detected:', user.email);

            // Telegram 알림 발송 (비동기, 실패해도 로그인 진행)
            fetch(`${process.env.NEXTAUTH_URL || ''}/api/telegram-notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `🎉 신규 회원 가입\n\n👤 이름: ${user.name || '미제공'}\n📧 이메일: ${user.email}\n🔑 가입 경로: ${account.provider}\n⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
                type: 'success'
              })
            }).catch(err => console.error('Telegram notification failed:', err));

            // 관리자 알림 발송
            fetch(`${process.env.NEXTAUTH_URL || ''}/api/notifications/new-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: user.name,
                email: user.email,
                provider: account.provider,
                registeredAt: new Date().toISOString(),
                notifyAdmin: true
              })
            }).catch(err => console.error('Admin notification failed:', err));

            // 신규 가입자 환영 이메일 발송
            fetch(`${process.env.NEXTAUTH_URL || ''}/api/notifications/welcome-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: user.name,
                email: user.email,
                provider: account.provider
              })
            }).catch(err => console.error('Welcome email failed:', err));
          }
        }
      } catch (error) {
        console.error('SignIn callback notification error:', error);
        // 알림 실패해도 로그인은 계속 진행
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
};