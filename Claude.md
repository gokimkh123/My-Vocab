# 나만의 영어 단어장 앱 (My Vocab)

## 프로젝트 개요
나만 사용하는 개인 영어 단어장 PWA 앱.
Next.js + TypeScript + Tailwind CSS + Supabase 기반 풀스택 웹앱.

## 기술 스택
- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **DB**: Supabase (PostgreSQL)
- **외부 API**: Free Dictionary API (https://api.dictionaryapi.dev/api/v2/entries/en/{word})
- **배포**: Vercel
- **인증**: Supabase Auth (나만 사용 - 단일 사용자)

## 환경변수 (절대 클라이언트에 노출 금지)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # 절대 클라이언트 노출 금지
```

## 디렉토리 구조
```
app/
├── (auth)/
│   └── login/page.tsx
├── (main)/
│   ├── layout.tsx
│   ├── page.tsx                  # 홈 (단어장 목록)
│   ├── groups/
│   │   ├── page.tsx              # 그룹 목록
│   │   └── [id]/page.tsx         # 그룹 상세 (단어 목록)
│   ├── words/
│   │   └── add/page.tsx          # 단어 추가
│   └── quiz/
│       ├── page.tsx              # 퀴즈 설정
│       ├── [sessionId]/page.tsx  # 퀴즈 진행
│       └── result/[sessionId]/page.tsx  # 퀴즈 결과
├── api/
│   ├── words/route.ts
│   ├── groups/route.ts
│   ├── quiz/route.ts
│   └── dictionary/route.ts       # Free Dictionary API 프록시
└── layout.tsx
```

## DB 스키마 (Supabase)

> 모든 테이블에 `user_id uuid`가 있고, 모든 API 쿼리는 `.eq('user_id', auth uid)`로 본인 데이터만 다룬다. `part_of_speech`는 복수 품사를 위해 `text[]` 배열이다.

### groups 테이블
```sql
create table groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,              -- 예: "토익 단어장", "LC 단어장"
  description text,
  created_at timestamptz default now()
);
```

### words 테이블
```sql
create table words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  english text not null,
  korean text not null,
  part_of_speech text[],           -- 복수 선택 가능: {noun, verb, adjective, adverb}
  example_sentence text,
  created_at timestamptz default now()
);
```

### quiz_sessions 테이블
```sql
create table quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references groups(id),
  quiz_type text not null,         -- 'en_to_ko' | 'ko_to_en'
  total_count int not null,
  correct_count int default 0,
  completed_at timestamptz,
  created_at timestamptz default now()
);
```

### quiz_results 테이블
```sql
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

## 기능 명세

### 1. 단어 추가
- 영어 단어 입력 시 Free Dictionary API 자동 호출
- 품사(part of speech) 자동 추천 (noun/verb/adjective/adverb)
- 한글 뜻 직접 입력
- 그룹 선택 (필수)
- API 호출은 반드시 /api/dictionary 서버 라우트를 통해서만 (클라이언트 직접 호출 금지)

### 2. 그룹 관리
- 그룹 생성/수정/삭제
- 그룹별 단어 목록 조회
- 단어 검색 기능

### 3. 퀴즈
- 퀴즈 설정:
  - 그룹 선택
  - 문제 수: 10개 ~ 해당 그룹 전체 단어 수 (슬라이더)
  - 방향: 영→한 또는 한→영
- 퀴즈 진행:
  - 단어 랜덤 셔플
  - 주관식 입력 방식
  - 현재 진행 상황 표시 (예: 3/10)
- 퀴즈 결과:
  - 점수 및 정답률 표시
  - 틀린 단어 목록 표시
  - 날짜별 퀴즈 기록 저장

### 4. 복습
- 날짜별 퀴즈 기록 조회
- 틀린 단어만 모아서 재시험 기능
- 오답 단어 복습 뷰

## 보안 규칙
- Supabase RLS(Row Level Security) 활성화
- 모든 API 라우트는 서버 사이드에서만 DB 접근
- 외부 Dictionary API는 반드시 서버 라우트(/api/dictionary)를 통해 프록시
- .env.local은 절대 커밋 금지 (.gitignore에 포함)
- SUPABASE_SERVICE_ROLE_KEY는 서버 사이드에서만 사용

## 인증
- Supabase Auth 이메일/패스워드 단일 계정
- 로그인하지 않으면 모든 페이지 접근 불가 (미들웨어로 처리)
- middleware.ts에서 인증 체크

## 코딩 컨벤션
- TypeScript strict mode 사용
- 모든 API 응답에 타입 정의
- 컴포넌트는 app/ 하위에서 관리
- 공통 컴포넌트는 components/ 폴더
- DB 접근 로직은 lib/supabase/ 에서 관리
- 에러 처리 필수

## 성공 기준 (MVP)
- [ ] 로그인/로그아웃 작동
- [ ] 그룹 CRUD 작동
- [ ] 단어 추가 시 Dictionary API 품사 자동 조회
- [ ] 단어 목록 그룹별 조회
- [ ] 퀴즈 설정 → 진행 → 결과 플로우 완성
- [ ] 날짜별 퀴즈 기록 조회
- [ ] 틀린 단어 재시험 기능
- [ ] Vercel 배포 완료
- [ ] PWA 설정 (홈 화면 추가 가능)

## 배포 순서
1. Supabase 프로젝트 생성 및 스키마 적용
2. .env.local 설정
3. 로컬 개발 및 테스트
4. GitHub 푸시
5. Vercel 연동 및 환경변수 설정
6. 배포 확인

## GitHub Public 레포 보안 규칙

### .gitignore 필수 포함
```
.env
.env.local
.env.*.local
.env.production
```

### 환경변수 관리 원칙
- 로컬 개발: .env.local 사용 (git 추적 안됨)
- Vercel 배포: Vercel 대시보드에서 환경변수 직접 입력
- GitHub에는 환경변수 값 절대 커밋 금지
- .env.example 파일은 커밋 가능 (키 이름만, 값은 비워서)

### .env.example (커밋용 - 값 없이)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### GitHub Actions / CI 사용 시
- GitHub Repository Settings > Secrets에 환경변수 등록
- 코드에 직접 값 입력 금지

### 커밋 전 체크리스트
- [ ] .env.local이 .gitignore에 있는지 확인
- [ ] 코드에 API 키 하드코딩 없는지 확인
- [ ] git status로 .env 파일 추적 안되는지 확인

### 실수로 커밋했을 때
```bash
# 즉시 Supabase에서 키 재발급
# git history에서 제거
git rm --cached .env.local
git commit -m "remove env file"
# 그래도 history에 남으므로 반드시 키 재발급
```

## 주의사항
- API 키는 절대 클라이언트 코드에 하드코딩 금지
- Free Dictionary API는 무료이며 키 불필요 (https://api.dictionaryapi.dev)
- Supabase anon key는 public이어도 되나 RLS 반드시 활성화
- GitHub public 레포이므로 커밋 전 항상 git diff로 확인