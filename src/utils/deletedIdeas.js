// 아이디어 삭제 시각을 프론트에서 로컬로 기록/조회하는 유틸.
//
// 백엔드 세션 응답에는 현재 deleted_at 필드가 없다(모델에 미존재). 그래서
// 삭제 시각의 소스는 두 가지가 될 수 있다:
//   1) 백엔드가 나중에 session.deleted_at 을 내려주면 그 값 (ReportPage에서 우선 사용)
//   2) 그 전까지는 프론트가 삭제 시점에 여기 localStorage 에 기록한 값 (폴백)
//
// 삭제 기능(아이디어 삭제 버튼)이 생기면 그 핸들러에서 markIdeaDeleted(sessionId)
// 를 호출하면 되고, 그러면 ReportPage 배너가 별도 수정 없이 자동으로 뜬다.
// 삭제 기능이 아직 없는 지금은 저장되는 값이 없어 배너도 뜨지 않는다(안전).

const STORAGE_KEY = 'prep:deletedIdeas';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 저장 실패(용량/프라이빗 모드 등)는 조용히 무시 — 삭제 흐름 자체를 막지 않는다.
  }
}

/** 아이디어를 삭제 처리할 때 호출 — 삭제 시각(ISO)을 로컬에 기록한다. */
export function markIdeaDeleted(sessionId, deletedAt = new Date().toISOString()) {
  if (!sessionId) return;
  const map = readAll();
  map[sessionId] = deletedAt;
  writeAll(map);
}

/** 로컬에 기록된 삭제 시각(ISO 문자열)을 반환. 없으면 null. */
export function getLocalDeletedAt(sessionId) {
  if (!sessionId) return null;
  return readAll()[sessionId] ?? null;
}

/** 로컬 삭제 기록을 지운다(복구/재검진 등). */
export function clearIdeaDeleted(sessionId) {
  if (!sessionId) return;
  const map = readAll();
  if (sessionId in map) {
    delete map[sessionId];
    writeAll(map);
  }
}
