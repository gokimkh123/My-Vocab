import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Group, Word } from '@/lib/supabase/types';

export default async function GroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: group, error: groupError }, { data: words, error: wordsError }] =
    await Promise.all([
      supabase.from('groups').select('*').eq('id', params.id).single(),
      supabase
        .from('words')
        .select('*')
        .eq('group_id', params.id)
        .order('created_at', { ascending: false }),
    ]);

  if (groupError || !group) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/groups" className="text-sm text-gray-500 hover:text-gray-700">
            ← 단어장 목록
          </Link>
          <h1 className="text-xl font-bold text-gray-800 mt-1">{(group as Group).name}</h1>
          {(group as Group).description && (
            <p className="text-sm text-gray-500">{(group as Group).description}</p>
          )}
        </div>
        <Link
          href="/words/add"
          className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
        >
          + 단어 추가
        </Link>
      </div>

      {wordsError && <p className="text-red-500">단어를 불러오지 못했습니다.</p>}

      {words && words.length === 0 && (
        <p className="text-center text-gray-400 mt-16">아직 단어가 없습니다.</p>
      )}

      <ul className="space-y-2">
        {(words as Word[])?.map((word) => (
          <li
            key={word.id}
            className="p-4 bg-white rounded-xl border border-gray-200 flex justify-between items-start"
          >
            <div>
              <p className="font-medium text-gray-800">
                {word.english}
                {word.part_of_speech && (
                  <span className="ml-2 text-xs text-gray-400">{word.part_of_speech}</span>
                )}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">{word.korean}</p>
              {word.example_sentence && (
                <p className="text-xs text-gray-400 mt-1 italic">{word.example_sentence}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
