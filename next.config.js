/** @type {import('next').NextConfig} */
const nextConfig = {
  // 출력 타입 설정
  output: 'standalone',

  // ESLint 빌드 시 무시
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript 검사 무시
  typescript: {
    ignoreBuildErrors: true,
  },

  // 외부 이미지 도메인 설정
  images: {
    domains: [
      'pub-b520cb8ed3989e8182bdb020ade36495.r2.dev',
      'img.youtube.com',
      'images.unsplash.com'
    ],
    // unoptimized: true, // 이미지 최적화 활성화
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 실험적 기능
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  // 성능 최적화
  swcMinify: true,
  compress: true,

  // 캐시 비활성화 (프로덕션 동기화 문제 해결)
  generateBuildId: async () => {
    return Date.now().toString();
  },

  // public 폴더의 영상 파일에 대한 캐시 설정
  async headers() {
    return [
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
    ];
  },
};

module.exports = nextConfig;
