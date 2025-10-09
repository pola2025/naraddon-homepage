import { DefaultSession, DefaultUser } from 'next-auth';
import { UserRole } from './user.types';

declare module 'next-auth' {
  /**
   * NextAuth 세션 타입 확장
   * - mobile: 네이버 OAuth에서 받은 전화번호
   */
  interface Session {
    user: {
      id: string;
      role: UserRole;
      mobile?: string;
      provider?: string;
    } & DefaultSession['user'];
  }

  /**
   * NextAuth User 타입 확장
   */
  interface User extends DefaultUser {
    role?: UserRole;
    mobile?: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * JWT 토큰 타입 확장
   */
  interface JWT {
    id: string;
    role: UserRole;
    mobile?: string;
    provider?: string;
  }
}
