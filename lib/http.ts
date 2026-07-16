// 개인화된 가변 데이터(단어·단어장·퀴즈 기록) 응답 헤더.
//
// max-age를 주면 안 된다. 단어를 추가한 뒤 SWR이 mutate()로 재검증을 걸어도
// fetch가 브라우저 HTTP 캐시에서 추가 이전 응답을 그대로 받아오기 때문이다
// (네트워크까지 가지도 않는다) → 강력 새로고침 전까지 새 단어가 안 보인다.
// 응답 자체는 리전을 맞춘 뒤 충분히 빠르므로 캐시로 아낄 이유가 없다.
export const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;
