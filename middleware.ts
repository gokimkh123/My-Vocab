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

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
