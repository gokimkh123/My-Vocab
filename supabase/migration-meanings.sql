-- 뜻을 품사별로 나누고 커스텀 태그를 붙일 수 있게 하는 마이그레이션.
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요. 한 번만 돌리면 됩니다.
--
-- 이전:  korean "달리다, 달리기" + part_of_speech {noun,verb}   ← 어느 뜻이 어느 품사인지 알 수 없음
-- 이후:  meanings [{pos:"noun", tags:[], korean:"달리기"},
--                  {pos:"verb", tags:["자동사"], korean:"달리다"}]
--
-- korean과 part_of_speech 컬럼은 지우지 않는다. korean은 not null이고, 퀴즈 결과·기록
-- 화면이 단어를 한 줄로 요약할 때 읽는다. 앱이 meanings에서 만들어 항상 동기화한다.

-- 1) 컬럼 추가
alter table words
  add column if not exists meanings jsonb not null default '[]'::jsonb;

-- 2) 기존 단어 이전
--    품사가 여러 개면 품사마다 항목을 만들고 뜻을 그대로 복제한다. 옛 데이터엔 뜻이 하나뿐이라
--    어느 뜻이 어느 품사인지 알 방법이 없다 → 정보를 버리지 않고 눈에 보이게 남겨서
--    앱에서 고치게 한다. (예: run이 [명사] 달리다,달리기 / [동사] 달리다,달리기 로 뜸)
update words
set meanings = case
  when part_of_speech is null or cardinality(part_of_speech) = 0
    then jsonb_build_array(
      jsonb_build_object('pos', null, 'tags', '[]'::jsonb, 'korean', korean)
    )
  else (
    select jsonb_agg(
      jsonb_build_object('pos', p, 'tags', '[]'::jsonb, 'korean', korean)
    )
    from unnest(part_of_speech) as p
  )
end
where meanings = '[]'::jsonb;

-- 3) 확인 — 이전이 안 된 행이 있는지
select count(*) as "이전 안 된 단어(0이어야 정상)"
from words
where meanings = '[]'::jsonb;
