import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// 데이터 쿼리용 - service role key로 RLS 우회
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// access_token(JWT)의 sub(user id)만 로컬 디코드. 서명 검증은 안 하지만(아래 주석 참고),
// exp(만료)는 확인해서 만료된 토큰은 거부한다 — 심층 방어.
function decodeUserId(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) return null;
    return typeof claims.sub === 'string' ? claims.sub : null;
  } catch {
    return null;
  }
}

// API 라우트에서 인증된 유저 id 가져오기 - 없으면 null 반환
export async function getAuthUser(): Promise<{ id: string } | null> {
  const supabase = createAuthClient();
  // middleware.ts가 /api/* 포함 모든 매칭 경로에서 getUser()로 토큰을 이미 서버 검증함
  // (위변조·만료 시 /login으로 리다이렉트되어 이 핸들러까지 도달하지 못함).
  // 그래서 여기서 Auth 서버로 재검증(getUser, 네트워크 왕복)하지 않고,
  // 이미 검증된 쿠키의 access_token에서 sub만 로컬 디코드한다 → API 호출당 Auth 왕복 1회 절약.
  // (getSession().user를 직접 읽으면 auth-js가 매 요청 "insecure" 경고를 로그에 출력하므로 토큰을 디코드.)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  const id = decodeUserId(session.access_token);
  return id ? { id } : null;
}

// 인증 세션 확인용 - anon key + 쿠키 세션
export function createAuthClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
