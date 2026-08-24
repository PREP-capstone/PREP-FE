// PREP-BE(FastAPI, https://api.prepwell.shop) 실제 openapi.json(2026-08-24 확인) 기준 API 함수 모음.
// 모든 성공 응답은 { isSuccess, code, message, result } 형태로 감싸져 있어 unwrap()으로 result만 꺼낸다.

import { apiClient, unwrap } from './client';

/** GET /api/v1/health */
export async function checkHealth() {
  return apiClient.get('/api/v1/health');
}

/**
 * POST /api/v1/analysis-sessions
 * payload: { service_name, service_description, target_users?, service_type?, category_1?, category_2?, target? }
 * → { session_id, service_name, created_at }
 */
export async function createAnalysisSession(payload) {
  const res = await apiClient.post('/api/v1/analysis-sessions', payload);
  return unwrap(res);
}

/** GET /api/v1/analysis-sessions/{sessionId} → AnalysisSessionDetail (세션 입력값 원본) */
export async function getAnalysisSession(sessionId) {
  const res = await apiClient.get(`/api/v1/analysis-sessions/${sessionId}`);
  return unwrap(res);
}

/**
 * POST /api/v1/analysis-sessions/{sessionId}/health-data
 * payload: { health_data_items: [{name, data_type, unit?, source, is_sensitive?, item_code?}], processing_purpose?, service_actions? }
 * → { session_id, health_data_count }
 */
export async function createHealthData(sessionId, payload) {
  const res = await apiClient.post(`/api/v1/analysis-sessions/${sessionId}/health-data`, payload);
  return unwrap(res);
}

/** PATCH /api/v1/analysis-sessions/{sessionId}/health-data — 동일 payload, 갱신용 */
export async function updateHealthData(sessionId, payload) {
  const res = await apiClient.patch(`/api/v1/analysis-sessions/${sessionId}/health-data`, payload);
  return unwrap(res);
}

/** PATCH /api/v1/analysis-sessions/{sessionId}/category → 갱신된 AnalysisSessionDetail */
export async function updateCategory(sessionId, payload) {
  const res = await apiClient.patch(`/api/v1/analysis-sessions/${sessionId}/category`, payload);
  return unwrap(res);
}

/** POST /api/v1/category-classifier/predict — { service_description } → { category_1, category_1_confidence, category_2, category_2_confidence } */
export async function classifyCategory(serviceDescription) {
  const res = await apiClient.post('/api/v1/category-classifier/predict', { service_description: serviceDescription });
  return unwrap(res);
}

/**
 * POST /api/v1/analysis/evaluate — { session_id } 하나만 받아 GATE·규제·데이터·시장·BM 판정을 전부 실행.
 * → EvaluateResult:
 *   {
 *     session, gate, regulatory_risk, correction_candidates,
 *     data_feasibility, market_feasibility, business_model,
 *     section_links, next_actions
 *   }
 * GATE FAIL이면 data_feasibility/market_feasibility/business_model이 null로 온다.
 */
export async function evaluateSession(sessionId) {
  const res = await apiClient.post('/api/v1/analysis/evaluate', { session_id: sessionId });
  return unwrap(res);
}

/**
 * 검진 폼 제출 전체 흐름: 세션 생성 → (수집데이터 있으면) 등록 → 평가 실행.
 * sessionPayload / healthDataPayload 구성은 InputPage.jsx의 buildAnalysisPayload() 참고.
 */
export async function submitIdea({ sessionPayload, healthDataPayload }) {
  const session = await createAnalysisSession(sessionPayload);
  const sessionId = session?.session_id;
  if (!sessionId) {
    throw new Error('서버 응답에 session_id가 없어요.');
  }

  if (healthDataPayload?.health_data_items?.length) {
    await createHealthData(sessionId, healthDataPayload);
  }

  const report = await evaluateSession(sessionId);
  return { sessionId, report };
}
