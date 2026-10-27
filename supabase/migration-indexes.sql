-- 외래키 컬럼 인덱스. Postgres는 외래키에 인덱스를 자동으로 만들지 않는다.
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요. 한 번만 돌리면 됩니다. (안 돌려도 앱은 동작한다)
--
-- 없으면 데이터가 쌓일수록 느려지는 곳:
--  - 퀴즈 기록: 세션마다 푼 문제 수를 센다 (quiz_results(count)) → 세션 수 × 결과 행 수만큼 훑는다
--  - 단어장 목록: 단어장마다 단어 수를 센다 (words(count))
--  - 단어 삭제: 그 단어를 참조하는 퀴즈 결과를 찾는다 (quiz_results.word_id)

create index if not exists quiz_results_session_id_idx on quiz_results (session_id);
create index if not exists quiz_results_word_id_idx on quiz_results (word_id);
create index if not exists words_group_id_idx on words (group_id);
create index if not exists quiz_sessions_group_id_idx on quiz_sessions (group_id);
