import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';

// authOptions를 app 폴더 내부에서 import
// app/auth-options.ts에서 실제 설정 가져옴

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };