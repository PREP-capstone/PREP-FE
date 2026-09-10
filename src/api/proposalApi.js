import { apiClient, unwrap } from './client';

function proposalPath(proposalId, suffix = '') {
  return `/api/v1/proposals/${encodeURIComponent(proposalId)}${suffix}`;
}

/**
 * GET /api/v1/proposals/field-definitions?template_type={PSST|RND|IR}
 * → { template_type, fields: [{ field_key, category, label, field_type, requirement, display_order }] }
 * requirement가 EXCLUDED인 필드는 매핑 행 자체가 없어 응답에서 자연히 빠진다.
 */
export async function getProposalFieldDefinitions(templateType) {
  const query = new URLSearchParams({ template_type: templateType }).toString();
  const res = await apiClient.get(`/api/v1/proposals/field-definitions?${query}`);
  return unwrap(res);
}

/**
 * POST /api/v1/proposals/generate (multipart/form-data)
 * - report: 검진 결과 리포트 PDF (File)
 * - template_type: 'PSST' | 'RND' | 'IR'
 * - field_values: 사용자가 화면에서 채운 값 (JSON 문자열)
 * → { proposal_id, template_type, sections: [{ field_key, label, generated_text }] }
 *
 * 이 시점(완료 전)에는 서버가 캐시에 저장하지 않는다 — 재요청 시 매번 새로 생성된다.
 */
export async function generateProposal({ reportFile, templateType, fieldValues }) {
  const formData = new FormData();
  formData.append('report', reportFile);
  formData.append('template_type', templateType);
  formData.append('field_values', JSON.stringify(fieldValues ?? {}));

  const res = await apiClient.postForm('/api/v1/proposals/generate', formData);
  return unwrap(res);
}

/**
 * POST /api/v1/proposals/{proposalId}/complete
 * payload: { sections: [{ field_key, final_text }] }
 * → { proposal_id, expires_at }
 *
 * "완료"/"PDF 저장하기" 클릭 시 호출. 동기 방식 — 이 응답이 오는 시점에
 * PDF 생성까지 이미 끝나 있고 expires_at도 함께 온다. 별도 폴링은 없다.
 * 호출 이후에는 재수정·재완료를 지원하지 않는다 (팀 결정, 완료 전 확인 안내로 대체).
 */
export async function completeProposal(proposalId, sections) {
  const res = await apiClient.post(proposalPath(proposalId, '/complete'), { sections });
  return unwrap(res);
}

/**
 * GET /api/v1/proposals/{proposalId}/pdf
 * 응답 자체가 PDF 파일(Blob)이다. 10분 이내에만 다운로드 가능하며,
 * 완료 전이거나 만료된 경우 404(PROPOSAL_NOT_FOUND)가 온다 — 호출부에서 status 확인해 안내한다.
 */
export async function downloadProposalPdf(proposalId) {
  return apiClient.getBlob(proposalPath(proposalId, '/pdf'));
}
