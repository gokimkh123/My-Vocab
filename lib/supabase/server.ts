import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

// 데이터 쿼리용 - service role key로 RLS 우회
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// API 라우트에서 인증된 유저 가져오기 - 없으면 null 반환
export async function getAuthUser(): Promise<User | null> {
  const supabase = createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
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
