// Supabase 요청이 응답 없이 멈추는 경우(주로 프로덕션 환경) 로딩 상태가
// 영원히 풀리지 않는 걸 막기 위한 타임아웃 안전장치
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  );
  return Promise.race([Promise.resolve(promise), timeout]);
}
