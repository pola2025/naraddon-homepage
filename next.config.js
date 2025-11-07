/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Cache busting: force fresh build
  env: {
    BUILD_ID: Date.now().toString(),
  },

  // ��� ����
  output: 'standalone',

  // ESLint ���� ���� ����
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript �˻� ����
  typescript: {
    ignoreBuildErrors: true,
  },

  // �̹��� ������ ����
  images: {
    domains: [
      'pub-b520cb8ed3989e8182bdb020ade36495.r2.dev',
      'pub-9f184323b8f24eb28c63d1a1410dd26a.r2.dev', // 정책분석 이미지 R2 도메인
      'img.youtube.com',
      'images.unsplash.com',
    ],
    // unoptimized: true, // �̹��� ����ȭ ��Ȱ��ȭ
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ���� ���
  experimental: {
    workerThreads: false,
    cpus: 1,
    // 성능 최적화
    // optimizeCss: true, // critters 패키지 필요 - 비활성화
    optimizePackageImports: ['react-icons', '@heroicons/react'],
    instrumentationHook: true, // NextAuth 및 계측을 위해 필요
  },

  // ���� ����ȭ
  swcMinify: true,
  compress: true,

  // 스마트 캐시 전략: Git SHA 기반 (변경사항 있을 때만 갱신)
  generateBuildId: async () => {
    // 강제 캐시 무효화가 필요한 경우: FORCE_CACHE_BUST=1 vercel --prod
    if (process.env.FORCE_CACHE_BUST === '1') {
      return Date.now().toString();
    }
    // 일반 배포: Git SHA 사용 (코드 변경 시에만 Build ID 변경)
    return process.env.VERCEL_GIT_COMMIT_SHA || 'development';
  },

  // Webpack 설정: Mongoose 바이너리 파일 제외
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Server Component에서 mongoose 사용 시 바이너리 파일 제외
      config.externals.push({
        '@napi-rs/snappy-linux-x64-gnu': 'commonjs @napi-rs/snappy-linux-x64-gnu',
        '@napi-rs/snappy-linux-x64-musl': 'commonjs @napi-rs/snappy-linux-x64-musl',
        '@napi-rs/snappy-darwin-x64': 'commonjs @napi-rs/snappy-darwin-x64',
        '@napi-rs/snappy-win32-x64-msvc': 'commonjs @napi-rs/snappy-win32-x64-msvc',
      });
    }
    return config;
  },

  // 스마트 캐시 전략
  async headers() {
    return [
      // 1. API는 항상 캐시 안함
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      // 2. Next.js 정적 리소스 영구 캐시 (파일명에 해시 포함)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // 3. public 폴더 미디어 파일 장기 캐시
      {
        source: '/videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // 4. HTML 페이지: 5분 캐시 + 백그라운드 갱신
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  dryRun: process.env.SENTRY_DRY_RUN === '1',
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});