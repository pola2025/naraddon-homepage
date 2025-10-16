/**
 * NextAuth 세션 디코딩 테스트
 */

import { getToken } from 'next-auth/jwt';

const sessionToken = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..7sCTtvx8sicjM2Kp.yuWCnmlTKJ5wvCquFsR5vPMw9_jFLzVCNSrJ_1MosHMtR-D2U1w4N5QmbylWBCOQrzFn57bOA3DqKPqAJOD85W041aRJGkY6sjhd3C4hsaYvsW3bQs9M9cbLTf1p-4oXq2BvVRlYkvo0t5psdeo_6D7QVXELn-oLQ3kvnMSYI2XcAs-dtgtpHMLpLdeG-kg1BeprIqkvXkFuQDLjSmchiTnrVHGD2N30nTtB7rzFMq-Z3Tjy63hHzy8wodzTFKLbNMCUF16KqBegvxWXR7PRNkNR-hmWCqg6hrMLR4hDP_lSOEMRhfl06JcYgZb1LYsuwgs-Yk4nSHsgQUkxX7qpbw.cUqFDXdlc7UCbEfF5H1mAw';

console.log('세션 토큰:', sessionToken.substring(0, 50) + '...');
console.log('\n이것은 JWT가 아니라 JWE (암호화된 토큰)입니다.');
console.log('NextAuth에서만 복호화 가능합니다.\n');
console.log('서버에서 getServerSession()을 통해 복호화됩니다.');
