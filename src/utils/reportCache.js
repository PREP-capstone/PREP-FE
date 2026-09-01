const REPORT_CACHE_PREFIX = 'prep-report-cache:';
const REPORT_CACHE_TTL_MS = 10 * 60 * 1000;

function keyFor(sessionId) {
  return `${REPORT_CACHE_PREFIX}${sessionId}`;
}

export function saveReportCache(sessionId, report, ttlMs = REPORT_CACHE_TTL_MS) {
  if (!sessionId || !report) return;
  try {
    sessionStorage.setItem(
      keyFor(sessionId),
      JSON.stringify({
        expiresAt: Date.now() + ttlMs,
        report,
      })
    );
  } catch {
    // 캐시 실패는 리포트 조회 흐름을 막지 않는다.
  }
}

export function loadReportCache(sessionId) {
  if (!sessionId) return null;
  try {
    const raw = sessionStorage.getItem(keyFor(sessionId));
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached?.expiresAt || cached.expiresAt <= Date.now()) {
      sessionStorage.removeItem(keyFor(sessionId));
      return null;
    }

    return cached.report ?? null;
  } catch {
    return null;
  }
}

// 캐시된 리포트의 만료 시각(ms). 만료됐거나 없으면 null.
// 리포트 상단 "임시 보관" 안내 문구에 표시할 때 사용.
export function loadReportExpiry(sessionId) {
  if (!sessionId) return null;
  try {
    const raw = sessionStorage.getItem(keyFor(sessionId));
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached?.expiresAt || cached.expiresAt <= Date.now()) {
      return null;
    }
    return cached.expiresAt;
  } catch {
    return null;
  }
}

export function clearReportCache(sessionId) {
  if (!sessionId) return;
  try {
    sessionStorage.removeItem(keyFor(sessionId));
  } catch {
    // 캐시 삭제 실패도 저장/이동 흐름을 막지 않는다.
  }
}
