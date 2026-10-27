import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthUser } from '@/lib/supabase/server';
import { NO_STORE, badRequest, readBody, text } from '@/lib/http';
import { cleanMeanings, deriveKorean, derivePos } from '@/lib/meanings';
import type { ApiResponse, Word } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

// example_sentence는 더 이상 쓰지 않는다 (화면에서 제거). 컬럼과 기존 데이터는 남아 있다.
const WORD_COLS = 'id, group_id, english, meanings, korean, part_of_speech, created_at';

// 화면은 전부 클라이언트 컴포넌트라 서버가 그린 HTML에 데이터가 없다.
// 그래서 쓰기 후 revalidatePath를 부르지 않는다 — 부르면 정적 페이지 캐시만 날아가
// 다음 방문 때 같은 껍데기를 다시 렌더하느라 함수 호출만 늘었다. 화면 갱신은 SWR 캐시가 맡는다.

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const groupId = request.nextUrl.searchParams.get('group_id');
  if (!groupId) {
    return NextResponse.json({ data: null, error: 'group_id가 필요합니다.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('words')
    .select(WORD_COLS)
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ data: null, error: '데이터를 불러오지 못했습니다.' }, { status: 500 });
  return NextResponse.json({ data, error: null }, { headers: NO_STORE });
}

/** ilike 패턴의 와일드카드(% _)와 이스케이프 문자를 글자 그대로 비교하게 만든다 */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, c => `\\${c}`);
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Word>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const body = await readBody(request);
  if (!body) return badRequest();
  const english = text(body.english);
  const groupId = text(body.group_id);
  const clean = cleanMeanings(body.meanings);
  if (!english || clean.length === 0 || !groupId) {
    return badRequest('영어 단어, 한글 뜻, 그룹은 필수입니다.');
  }

  const supabase = createClient();
  // 단어장 소유 확인 + 중복 확인은 서로 독립 → 병렬.
  // 소유 확인이 없으면 남의 단어장 id로 단어를 끼워넣을 수 있다 (service role이라 RLS가 막아주지 않는다).
  const [{ data: group }, { data: existing }] = await Promise.all([
    supabase.from('groups').select('id').eq('id', groupId).eq('user_id', user.id).maybeSingle(),
    supabase
      .from('words')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .ilike('english', escapeLike(english))
      .limit(1),
  ]);

  if (!group) return NextResponse.json({ data: null, error: '단어장을 찾을 수 없습니다.' }, { status: 404 });
  if (existing?.length) {
    return NextResponse.json(
      { data: null, error: '이 단어장에 이미 존재하는 단어입니다.' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('words')
    .insert({
      english,
      meanings: clean,
      // korean·part_of_speech는 meanings에서 파생 — 스키마 not null과 결과/기록 화면 때문에 유지
      korean: deriveKorean(clean),
      part_of_speech: derivePos(clean),
      group_id: groupId,
      user_id: user.id,
    })
    .select(WORD_COLS)
    .single();

  if (error) return NextResponse.json({ data: null, error: '단어 추가에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<Word>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const body = await readBody(request);
  if (!body) return badRequest();
  const id = text(body.id);
  const english = text(body.english);
  const clean = cleanMeanings(body.meanings);
  if (!id || !english || clean.length === 0) {
    return badRequest('필수 항목을 모두 입력해주세요.');
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('words')
    .update({
      english,
      meanings: clean,
      korean: deriveKorean(clean),
      part_of_speech: derivePos(clean),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select(WORD_COLS)
    .single();

  if (error) return NextResponse.json({ data: null, error: '수정에 실패했습니다.' }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ data: null, error: '인증이 필요합니다.' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return badRequest('id가 필요합니다.');

  const supabase = createClient();
  // 퀴즈에 한 번이라도 나온 단어는 quiz_results.word_id가 참조한다. 이 FK엔 on delete 동작이
  // 없어서(스키마 참고) 그대로 지우면 FK 위반으로 실패했다 → 이 단어의 채점 기록을 먼저 지운다.
  const { error: resultsError } = await supabase
    .from('quiz_results')
    .delete()
    .eq('word_id', id)
    .eq('user_id', user.id);

  const { error } = resultsError
    ? { error: resultsError }
    : await supabase.from('words').delete().eq('id', id).eq('user_id', user.id);

  if (error) {
    console.error('[api/words] DELETE', error.code, error.message);
    return NextResponse.json({ data: null, error: `삭제에 실패했습니다. [${error.code ?? 'unknown'}]` }, { status: 500 });
  }
  return NextResponse.json({ data: null, error: null });
}
