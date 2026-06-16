import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['swr', '@supabase/ssr', '@supabase/supabase-js'],
  },
  async headers() {
    return [
      {
        // Next.js static assets are content-hashed → safe to cache aggressively
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        // PWA 아이콘은 잘 바뀌지 않음
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        // 모든 응답에 보안/네트워크 힌트 추가
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 클릭재킹 방지: 이 앱은 iframe에 넣을 일이 없음
          { key: 'X-Frame-Options', value: 'DENY' },
          // 안 쓰는 디바이스 기능 전면 차단 (지문 추적·권한 오남용 표면 축소)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // woff2 font files are large and runtime-cached by the SW's font route rule.
  // Precaching all subset variants (91+ files) wastes install bandwidth.
  exclude: [/\.woff2$/],
})(nextConfig);
