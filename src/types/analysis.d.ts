export type Category1 =
  | '수면'
  | '정신건강'
  | '운동'
  | '식단'
  | '만성질환'
  | '여성건강'
  | '유전자'
  | '미용';

export type Category2 = '정보제공' | '데이터기록관리' | '매칭연결' | '개입치료';

export type HealthDataItemCode =
  | 'lifestyle_001'
  | 'lifestyle_002'
  | 'lifestyle_003'
  | 'lifestyle_004'
  | 'lifestyle_005'
  | 'biometric_001'
  | 'biometric_002'
  | 'biometric_003'
  | 'biometric_004'
  | 'biometric_005'
  | 'sensitive_001'
  | 'sensitive_002'
  | 'sensitive_003'
  | 'sensitive_004'
  | 'sensitive_005'
  | 'behavior_001'
  | 'behavior_002'
  | 'behavior_003';

export type HealthDataSource = 'user_input' | 'os_sync' | 'institution_sync' | 'device_sync';
export type ServiceAction = 'record' | 'visualize_trend' | 'alert' | 'predict';
export type GateVerdict = 'PASS' | 'CONDITIONAL' | 'FAIL';
export type MatchSource = 'rule' | 'llm';

export interface ApiEnvelope<T> {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
}

export interface CreateAnalysisSessionRequest {
  service_name: string;
  service_description: string;
  target_users?: string[];
  service_type?: string | null;
  category_1?: Category1 | null;
  category_2?: Category2 | null;
  target?: string | null;
}

export interface CreateAnalysisSessionResponse {
  session_id: string;
  service_name: string;
  created_at: string;
}

export interface UpdateSessionCategoryRequest {
  category_1?: Category1 | null;
  category_2?: Category2 | null;
  target?: string | null;
}

export interface CategoryPredictionRequest {
  service_description: string;
}

export interface CategoryPredictionResponse {
  category_1: Category1;
  category_1_confidence?: number;
  category_2: Category2;
  category_2_confidence?: number;
}

export interface HealthDataItemInput {
  name: string;
  data_type: string;
  source: HealthDataSource;
  unit?: string | null;
  is_sensitive?: boolean;
  item_code?: HealthDataItemCode;
}

export interface SaveHealthDataRequest {
  health_data_items: HealthDataItemInput[];
  processing_purpose?: string[];
  service_actions?: ServiceAction[];
}

export interface SaveHealthDataResponse {
  session_id: string;
  health_data_count: number;
}

export interface AnalysisSessionDetail extends CreateAnalysisSessionRequest {
  session_id: string;
  created_at?: string;
  updated_at?: string;
  health_data_items?: HealthDataItemInput[];
  processing_purpose?: string[];
  service_actions?: ServiceAction[];
}

export interface EvaluateRequest {
  session_id: string;
}

export interface GateResult {
  data_type?: string | null;
  function_type?: string | null;
  acquire_method?: string | null;
  invasive_signal?: boolean;
  verdict: GateVerdict;
  hardcheck_fired?: boolean;
  avoidance_redesign?: string | null;
  avoidance_certification?: string | null;
  reasoning?: string[];
}

export interface RegulatoryRiskResult {
  regulatory_score?: number;
  regulatory_grade?: string;
  privacy_score?: number;
  privacy_grade?: string;
  advertising_score?: number;
  advertising_grade?: string;
  matched_rules?: unknown[];
  applicable_laws?: string[];
  service_law_description?: string | null;
}

export interface DataFeasibilityResult {
  data_feasibility_score?: number;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  available_sources?: Array<{
    data_name?: string;
    source_type?: string;
    source_name?: string;
  }>;
  privacy_risks?: Array<{
    data_name?: string;
    reason?: string;
  }>;
  standard_scale_candidates?: Array<{
    scale_id?: string;
    name?: string;
    full_name?: string;
    category_1?: Category1 | string;
    item_count?: number;
    scoring_range?: string;
    license_type?: string;
    source_url?: string;
    note?: string;
  }>;
  mvp_roadmap?: Array<{
    stage?: number;
    title?: string;
    description?: string;
  }>;
}

export interface MarketFeasibilityResult {
  match_level?: string;
  competitor_count?: number;
  saturation?: string;
  market_realism_grade?: string;
  platform_competitor_exists?: boolean;
  payment_precedent?: string | null;
  competitor_cards?: unknown[];
}

export interface BusinessModelResult {
  match_level?: string;
  recommendations?: unknown[];
}

export interface CorrectionCandidate {
  risky_text: string;
  safe_text: string;
  match_source?: MatchSource;
  legal_basis?: unknown;
  exact_phrase_match?: boolean;
}

export interface EvaluateResult {
  session: AnalysisSessionDetail;
  gate: GateResult;
  regulatory_risk: RegulatoryRiskResult;
  correction_candidates?: { candidates?: CorrectionCandidate[] };
  data_feasibility: DataFeasibilityResult | null;
  market_feasibility: MarketFeasibilityResult | null;
  business_model: BusinessModelResult | null;
  section_links?: unknown[];
  next_actions?: unknown[];
  overall_actions?: unknown[];
  differentiation_point?: string | null;
  bm_card_summaries?: unknown[];
  overall_signal?: '빨강' | '노랑' | '초록';
  overall_summary?: string;
  one_liner?: string;
}

export interface RagChunkLookupRequest {
  document_id: string;
  section_ids: string[];
}

export interface RagChunkLookupItem {
  chunk_id: string;
  document_id: string;
  section_id: string | null;
  section_title: string | null;
  chunk_text: string;
  source_url: string | null;
  page_start: number | null;
  page_end: number | null;
}

export interface RagDocumentListItem {
  document_id: string;
  title: string;
  doc_type: string;
  source_subtype: string | null;
  effective_date: string | null;
  status: string;
  tag_regulatory: boolean;
  tag_privacy: boolean;
  tag_advertising: boolean;
}

export interface RagSearchRequest {
  query: string;
  top_k?: number;
  tag_regulatory?: boolean | null;
  tag_privacy?: boolean | null;
  tag_advertising?: boolean | null;
  document_ids?: string[] | null;
}
