export type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  word_count?: number;
};

/** 뜻 하나. 품사와 태그는 서로 독립이라 셋 다 가능하다 — 품사만, 태그만, 둘 다. */
export type Meaning = {
  pos: string | null;        // noun | verb | adjective | adverb, 없으면 null
  tags: string[];            // 직접 만든 라벨 (불가산명사, 자동사 …)
  korean: string;
};

export type Word = {
  id: string;
  group_id: string;
  english: string;
  meanings: Meaning[];
  // 아래 둘은 meanings에서 파생해 함께 저장한다. korean은 not null이고,
  // 퀴즈 결과·기록 화면이 단어 하나를 한 줄로 보여줄 때 읽는다.
  korean: string;
  part_of_speech: string[] | null;
  created_at: string;
};

export type QuizSession = {
  id: string;
  group_id: string;
  quiz_type: 'en_to_ko' | 'ko_to_en';
  total_count: number;
  correct_count: number;
  completed_at: string | null;
  created_at: string;
};

export type QuizResult = {
  id: string;
  session_id: string;
  word_id: string;
  is_correct: boolean;
  user_answer: string | null;
  created_at: string;
};

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};
