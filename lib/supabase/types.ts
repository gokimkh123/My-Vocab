export type Group = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  word_count?: number;
};

export type Word = {
  id: string;
  group_id: string;
  english: string;
  korean: string;
  part_of_speech: string[] | null;
  example_sentence: string | null;
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
