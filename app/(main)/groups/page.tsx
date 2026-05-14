import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Group } from '@/lib/supabase/types';

export default async function GroupsPage() {
  const supabase = createClient();
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <p className="text-red-500">그룹을 불러오지 못했습니다.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">단어장</h1>
        <button className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">
          + 새 그룹
        </button>
      </div>

      {groups && groups.length === 0 && (
        <p className="text-center text-gray-400 mt-16">아직 단어장이 없습니다.</p>
      )}

      <ul className="space-y-3">
        {(groups as Group[])?.map((group) => (
          <li key={group.id}>
            <Link
              href={`/groups/${group.id}`}
              className="block p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
            >
              <p className="font-medium text-gray-800">{group.name}</p>
              {group.description && (
                <p className="text-sm text-gray-500 mt-1">{group.description}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
