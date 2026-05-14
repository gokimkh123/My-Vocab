-- ================================================================
-- Migration: Add user_id to all tables for per-user data isolation
-- Date: 2026-05-14
-- Run in: Supabase SQL Editor
-- ================================================================

-- ----------------------------------------------------------------
-- STEP 1: Add user_id columns
-- ----------------------------------------------------------------
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE words
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE quiz_results
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------
-- STEP 2: Performance indexes
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_groups_user_id        ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_words_user_id         ON words(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id  ON quiz_results(user_id);

-- ----------------------------------------------------------------
-- STEP 3: Enable RLS (idempotent)
-- ----------------------------------------------------------------
ALTER TABLE groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE words         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results  ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- STEP 4: Drop ALL existing policies (이름 몰라도 전부 삭제)
-- ----------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('groups', 'words', 'quiz_sessions', 'quiz_results')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------
-- STEP 5: 새 RLS 정책 — 본인 user_id 일치 시에만 모든 CRUD 허용
-- ----------------------------------------------------------------
CREATE POLICY "own_groups" ON groups
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_words" ON words
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_quiz_sessions" ON quiz_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_quiz_results" ON quiz_results
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- STEP 6 (선택): 기존 데이터 마이그레이션
-- 기존 데이터가 있는 경우 아래 주석을 해제하고
-- '<YOUR_UUID>'를 Supabase → Authentication → Users 에서 확인한
-- 본인 UUID로 교체한 뒤 실행하세요.
-- ================================================================
-- UPDATE groups        SET user_id = '<YOUR_UUID>' WHERE user_id IS NULL;
-- UPDATE words         SET user_id = '<YOUR_UUID>' WHERE user_id IS NULL;
-- UPDATE quiz_sessions SET user_id = '<YOUR_UUID>' WHERE user_id IS NULL;
-- UPDATE quiz_results  SET user_id = '<YOUR_UUID>' WHERE user_id IS NULL;
