# 📚 My Vocab

나만의 영어 단어장 PWA 앱. 단어 추가부터 퀴즈, 오답 복습까지.

## Features

- **단어장 관리** — 그룹별로 단어 분류 (토익, LC, RC 등)
- **자동 품사 조회** — 영단어 입력 시 Free Dictionary API로 품사 자동 조회
- **퀴즈** — 영→한 / 한→영 선택, 문제 수 조절, 랜덤 셔플
- **오답 복습** — 퀴즈 기록 날짜별 저장, 틀린 단어만 재시험
- **PWA** — 아이폰/안드로이드 홈 화면에 앱처럼 추가 가능
- **보안** — Supabase RLS, 인증된 사용자만 접근 가능

## Tech Stack

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| 배포 | Vercel |
| 사전 API | Free Dictionary API |

## Getting Started

### 1. 레포 클론

```bash
git clone https://github.com/gokimkh123/My-Vocab.git
cd My-Vocab
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일에 Supabase 키 입력:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Supabase DB 설정

Supabase SQL Editor에서 아래 쿼리 실행:

```sql
create table groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  english text not null,
  korean text not null,
  part_of_speech text[],
  example_sentence text,
  created_at timestamptz default now()
);

create table quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references groups(id),
  quiz_type text not null,
  total_count int not null,
  correct_count int default 0,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references quiz_sessions(id) on delete cascade,
  word_id uuid references words(id),
  is_correct boolean not null,
  user_answer text,
  created_at timestamptz default now()
);
```

RLS 정책 설정 (본인 행만 접근):

```sql
alter table groups enable row level security;
alter table words enable row level security;
alter table quiz_sessions enable row level security;
alter table quiz_results enable row level security;

create policy "own rows" on groups for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on words for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on quiz_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on quiz_results for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

> 서버 라우트는 `SUPABASE_SERVICE_ROLE_KEY`로 RLS를 우회하고 코드에서 `user_id`로 직접 필터링한다. 위 정책은 키가 유출되더라도 데이터가 격리되도록 하는 방어선이다.

### 4. 로컬 실행

```bash
npm run dev
```

`http://localhost:3000` 접속

## 배포

Vercel에 GitHub 레포 연동 후 환경변수 입력하면 자동 배포됩니다.

## 비용

| 서비스 | 비용 |
|--------|------|
| Vercel | 무료 |
| Supabase | 무료 (500MB 한도) |
| Free Dictionary API | 무료 |

**총 운영 비용: $0**

## License

MIT
