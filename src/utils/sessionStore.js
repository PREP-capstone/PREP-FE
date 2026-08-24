// 백엔드 없이 프론트만으로 화면을 완결시키기 위한 임시 저장소.
// sessionStorage를 사용해 새로고침에도 리포트가 유지되도록 한다.
// 실제 백엔드 연동 시에는 이 파일 대신 src/api/analysisApi.js의 evaluateSession()으로 대체하면 된다.

const KEY_PREFIX = 'prep-report:';

export function saveReport(sessionId, report) {
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${sessionId}`, JSON.stringify(report));
  } catch {
    // sessionStorage 사용 불가 환경(예: 프라이빗 모드 제약)이어도 화면 흐름은 막지 않는다.
  }
}

export function loadReport(sessionId) {
  try {
    const raw = sessionStorage.getItem(`${KEY_PREFIX}${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
