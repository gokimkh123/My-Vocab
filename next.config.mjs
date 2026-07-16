import withPWAInit from '@ducanh2912/next-pwa';

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

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  // 아래 runtimeCaching은 기본 목록을 통째로 대체하지 않고, cacheName이 같은 항목만 덮어쓴다
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    skipWaiting: true,
    // woff2 font files are large and runtime-cached by the SW's font route rule.
    // Precaching all subset variants (91+ files) wastes install bandwidth.
    exclude: [/\.woff2$/],
    runtimeCaching: [
      {
        // 기본값은 NetworkFirst인데 타임아웃이 없다 → 앱을 열 때 네트워크가 느리면
        // 캐시에 멀쩡한 화면이 있어도 응답이 올 때까지 첫 픽셀조차 안 나온다.
        // 3초를 넘기면 캐시로 넘어가 일단 화면을 띄운다. (지하철·엘리베이터에서 체감 큼)
        urlPattern: ({ url: { pathname }, sameOrigin }) =>
          sameOrigin && !pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 32, maxAgeSeconds: 86400 },
        },
      },
    ],
  },
});

export default withPWA(nextConfig);
