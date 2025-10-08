import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// 기존 authOptions는 lib/auth-options.ts로 이동
// 여기서는 import해서 사용

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };