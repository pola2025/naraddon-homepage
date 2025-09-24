import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 환경변수 검증 함수
function validateEnvironmentVariables(): { isValid: boolean; missingVars: string[]; errorMessage?: string } {
  const requiredEnvVars = [
    'CLOUDFLARE_R2_ENDPOINT',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_BUCKET',
    'CLOUDFLARE_R2_PUBLIC_DOMAIN'
  ];

  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    return {
      isValid: false,
      missingVars,
      errorMessage: `필수 환경변수가 설정되지 않았습니다: ${missingVars.join(', ')}`
    };
  }

  return { isValid: true, missingVars: [] };
}

// S3Client 초기화 함수
function createS3Client(): { client: S3Client | null; error?: string } {
  try {
    const validation = validateEnvironmentVariables();
    if (!validation.isValid) {
      console.error('[S3Client Init Error]', validation.errorMessage);
      return { client: null, error: validation.errorMessage };
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });

    console.log('[S3Client] Successfully initialized with endpoint:', process.env.CLOUDFLARE_R2_ENDPOINT);
    return { client };
  } catch (error) {
    const errorMessage = `S3Client 초기화 실패: ${error instanceof Error ? error.message : String(error)}`;
    console.error('[S3Client Init Error]', errorMessage, error);
    return { client: null, error: errorMessage };
  }
}

// S3Client 인스턴스 생성
const s3ClientResult = createS3Client();
const s3Client = s3ClientResult.client;

export async function POST(request: NextRequest) {
  try {
    console.log('[policy-news-upload] Starting image upload process');

    // S3Client 초기화 상태 확인
    if (!s3Client) {
      const errorMessage = s3ClientResult.error || 'S3Client 초기화 실패';
      console.error('[policy-news-upload] S3Client not available:', errorMessage);
      return NextResponse.json(
        {
          message: '서버 설정 오류가 발생했습니다.',
          details: errorMessage,
          type: 'S3_CLIENT_ERROR'
        },
        { status: 500 }
      );
    }

    // 환경변수 재검증 (런타임에서)
    const envValidation = validateEnvironmentVariables();
    if (!envValidation.isValid) {
      console.error('[policy-news-upload] Environment validation failed:', envValidation.errorMessage);
      return NextResponse.json(
        {
          message: '서버 환경 설정 오류가 발생했습니다.',
          details: envValidation.errorMessage,
          missingVars: envValidation.missingVars,
          type: 'ENV_VAR_ERROR'
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const password = formData.get('password') as string;

    console.log('[policy-news-upload] Form data received:', {
      hasFile: !!file,
      hasPassword: !!password,
      fileSize: file?.size || 0,
      fileName: file?.name || 'N/A',
      fileType: file?.type || 'N/A'
    });

    // 비밀번호 확인
    const adminPassword = process.env.POLICY_NEWS_PASSWORD;
    if (!adminPassword) {
      console.error('[policy-news-upload] POLICY_NEWS_PASSWORD not set');
      return NextResponse.json(
        {
          message: '서버 설정 오류가 발생했습니다.',
          details: 'POLICY_NEWS_PASSWORD 환경변수가 설정되지 않았습니다.',
          type: 'PASSWORD_CONFIG_ERROR'
        },
        { status: 500 }
      );
    }

    if (!password || password !== adminPassword) {
      console.log('[policy-news-upload] Password validation failed');
      return NextResponse.json({ message: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

    if (!file) {
      console.log('[policy-news-upload] No file provided');
      return NextResponse.json({ message: '파일이 없습니다.' }, { status: 400 });
    }

    // 파일 크기 제한 (3MB)
    if (file.size > 3 * 1024 * 1024) {
      console.log('[policy-news-upload] File too large:', file.size);
      return NextResponse.json({ message: '파일 크기는 3MB를 초과할 수 없습니다.' }, { status: 400 });
    }

    // 파일 타입 확인
    if (!file.type.startsWith('image/')) {
      console.log('[policy-news-upload] Invalid file type:', file.type);
      return NextResponse.json({ message: '이미지 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // 파일명 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now();
    const fileName = `policy-news/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    console.log('[policy-news-upload] Generated filename:', fileName);

    // ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('[policy-news-upload] File converted to buffer, size:', buffer.length);

    // R2에 업로드
    const uploadParams = {
      Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    };

    console.log('[policy-news-upload] Uploading to R2 with params:', {
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      ContentType: uploadParams.ContentType,
      BodySize: buffer.length
    });

    const uploadResult = await s3Client.send(new PutObjectCommand(uploadParams));
    console.log('[policy-news-upload] Upload successful:', uploadResult);

    // 공개 URL 생성
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN}/${fileName}`;
    console.log('[policy-news-upload] Generated public URL:', publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
    });
  } catch (error) {
    // 상세한 에러 로깅
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
      timestamp: new Date().toISOString()
    };

    console.error('[policy-news-upload] Detailed error:', errorInfo);

    // AWS SDK 특정 에러 처리
    if (error instanceof Error) {
      if (error.name === 'CredentialsProviderError') {
        return NextResponse.json(
          {
            message: 'Cloudflare R2 인증 정보 오류가 발생했습니다.',
            details: 'ACCESS_KEY_ID 또는 SECRET_ACCESS_KEY가 올바르지 않습니다.',
            type: 'CREDENTIALS_ERROR'
          },
          { status: 500 }
        );
      }

      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        return NextResponse.json(
          {
            message: 'Cloudflare R2 연결 오류가 발생했습니다.',
            details: 'ENDPOINT URL을 확인해주세요.',
            type: 'NETWORK_ERROR'
          },
          { status: 500 }
        );
      }

      if (error.name === 'NoSuchBucket') {
        return NextResponse.json(
          {
            message: 'Cloudflare R2 버킷을 찾을 수 없습니다.',
            details: 'BUCKET 이름을 확인해주세요.',
            type: 'BUCKET_ERROR'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        message: '이미지 업로드에 실패했습니다.',
        details: errorInfo.message,
        type: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}

// OPTIONS 요청 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}