import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser()는 요청마다 Supabase Auth 서버에 토큰을 물어본다(네트워크 왕복 1회 — 화면 이동·API 호출 전부).
  // getClaims()는 프로젝트 공개키(JWKS, 10분 캐시)로 서명을 여기서 검증해 그 왕복이 없다.
  // 대칭키(HS256) 프로젝트면 알아서 getUser()로 되돌아가므로 지금보다 느려질 일은 없다.
  // 만료된 토큰은 getClaims 안의 getSession()이 갱신하고 setAll로 쿠키에 다시 써 준다.
  let user: { sub: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims ?? null;
  } catch {
    // 공개키 검증 중 예외(WebCrypto 등)가 미들웨어 전체를 500으로 만들지 않게 — 비로그인으로 취급
  }

  const { pathname } = request.nextUrl;

  if (!user && !pathname.startsWith('/login')) {
    // API 요청을 /login으로 리다이렉트하면 fetch가 리다이렉트를 따라가 HTML을 받고 r.json()에서 터진다.
    // 그래서 로그인이 만료됐을 뿐인데 화면엔 "퀴즈를 찾을 수 없습니다" 같은 엉뚱한 메시지가 떴다.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/groups';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  // 추가 정적 자산(manifest, sw, woff2)도 매칭에서 제외 → 미들웨어 호출 자체를 절약
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)',
  ],
};
