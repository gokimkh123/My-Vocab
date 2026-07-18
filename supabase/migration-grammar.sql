-- 문법 카드: "to부정사를 목적어로 취하는 동사" 같은 규칙 하나 + 해당 단어들을 한 장으로 암기.
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요. 한 번만 돌리면 됩니다.

create table if not exists grammar_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text,                                -- 주제 묶음 (예: to부정사, 동명사, 가정법) — 자유 입력
  title text not null,                       -- 규칙 (예: to부정사를 목적어로 취하는 동사)
  items jsonb not null default '[]'::jsonb,  -- 해당 단어들 ["want","wish","hope"]
  memo text,                                 -- 암기팁 한 줄 (두문자 등)
  created_at timestamptz default now()
);

-- 다른 테이블과 동일하게 RLS만 켠다. 접근은 전부 서버 라우트(service_role)를 거치므로
-- 별도 정책 없이도 앱은 동작하고, anon 키로는 아무것도 못 읽는다.
alter table grammar_cards enable row level security;
