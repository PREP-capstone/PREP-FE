import { apiClient, unwrap } from './client';

/**
 * POST /api/v1/funding/recommendations (multipart/form-data)
 * — app/api/funding.py 기준.
 *
 * request(FormData):
 *   file: File (필수, PREP 검진 리포트 PDF, 최대 10MB)
 *   region?: string          — 지역 필터/가중치 보정값
 *   startup_stage?: string   — 사업 단계 필터/가중치 보정값
 *   keywords?: string        — 쉼표로 구분한 추가 키워드
 *   top_k?: number           — 최대 추천 개수 (1~50, 기본 12)
 *
 * → FundingRecommendationsResult:
 *   {
 *     total: number,
 *     recommended_at: string,      // ISO8601 (+09:00) — 추천 버튼을 누른 시각
 *     basis_date: string,          // "YYYY-MM-DD" — 마감 여부 판단 기준 날짜
 *     sort_order: string[],        // ["match_score_desc", "deadline_asc", "max_amount_desc"]
 *     extracted_profile: {
 *       service_name: string | null,
 *       category_1: string | null,
 *       category_2: string | null,
 *       targets: string[],
 *       service_type: string | null,
 *       region: string | null,
 *       startup_stage: string | null,
 *       keywords: string[],
 *     },
 *     sources: string[],
 *     source_warnings: string[],
 *     recommendations: Array<{
 *       program_id: string,
 *       title: string,
 *       match_score: number,           // 0~100
 *       matched_reasons: string[],
 *       deadline: string | null,       // "YYYY-MM-DD"
 *       days_left: number | null,
 *       max_amount: number | null,     // 원 단위
 *       support_amount_text: string | null,
 *       region: string | null,
 *       stage: string | null,
 *       source: string | null,
 *       source_url: string | null,
 *       description: string | null,
 *       keywords: string[],
 *     }>,
 *   }
 *
 * 에러: 400 FUNDING_REPORT_PDF_REQUIRED / 413 FUNDING_REPORT_TOO_LARGE /
 *      422 FUNDING_REPORT_TEXT_EMPTY (또는 file 누락 시 FastAPI 자체 422 validation error)
 */
export async function getFundingRecommendations({ file, region, startupStage, keywords, topK } = {}) {
  if (!file) {
    throw new Error('리포트 PDF 파일이 필요해요.');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (region) formData.append('region', region);
  if (startupStage) formData.append('startup_stage', startupStage);
  if (keywords) formData.append('keywords', keywords);
  if (topK) formData.append('top_k', String(topK));

  const res = await apiClient.post('/api/v1/funding/recommendations', formData);
  return unwrap(res);
}
