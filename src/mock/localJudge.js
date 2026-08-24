// ⚠️ 임시 로컬 판정 로직 — 실제 백엔드(FastAPI) 없이 프론트만으로 화면을 완결시키기 위한 코드다.
//
// 반환하는 객체의 필드명·구조는 실제 openapi.json의 EvaluateResult(= POST /api/v1/analysis/evaluate 응답)와
// 최대한 동일하게 맞춰뒀다. 나중에 백엔드 연동 시에는:
//   InputPage.jsx  : runLocalJudge(...) 호출 부분을 src/api/analysisApi.js의 submitIdea(...) 호출로 교체
//   ReportContainer.jsx : loadReport(sessionId) 호출 부분을 evaluateSession(sessionId) 호출로 교체
// 이 두 곳만 바꾸면 되도록, 그 사이의 ReportPage.jsx는 이미 실제 API 응답 형태를 그대로 그리도록 짜여 있다.
//
// db_구축_설계서.md / 판정_기준값_확정표.md / 흐름도(PREP 판정 엔진 → 리포트 생성 아키텍처) 의
// 규칙(GATE 6칸 매트릭스, D×S 난이도표, 3축 점수 임계값 등)을 그대로 옮겨와 최대한 근접하게 흉내낸다.

// ── GATE Stage B: data_type × function_type 6칸 확정 매트릭스 ──
const GATE_MATRIX = {
  '생체지표|단순기록': 'PASS',
  '생체지표|비교·추이분석': 'CONDITIONAL',
  '생체지표|수치예측·진단': 'FAIL',
  '라이프스타일|단순기록': 'PASS',
  '라이프스타일|비교·추이분석': 'PASS',
  '라이프스타일|수치예측·진단': 'CONDITIONAL',
};

// STEP4 "데이터로 무엇을 하나요?" 4개 선택지 → GATE function_type 3종 매핑
const PURPOSE_TO_FUNCTION_TYPE = ['단순기록', '비교·추이분석', '수치예측·진단', '수치예측·진단'];

// db_구축_설계서.md §8.2 침습적 하드체크 키워드 (재현율 보강용, 정밀 판정은 아님)
const INVASIVE_KEYWORDS = ['침습', 'CGM', '연속혈당', '채혈', '채취', '란셋', '마이크로니들', '미세침', '피하삽입', '체내삽입', '이식형', '삽입형', '천자'];
const INVASIVE_NEGATIONS = ['비침습', '무침습', '비이식형', '비삽입형'];

const METHOD_TO_ACQUIRE = {
  device_sync: '기기연동',
  os_sync: 'OS연동',
  user_input: '수동입력',
  institution_sync: '기관연동',
};

const RISKY_TEXT_MAP = [
  { risky: '진단', safe: '분석 결과 안내', article: '제27조' },
  { risky: '치료', safe: '관리·개선', article: '제2조' },
  { risky: '처방', safe: '추천', article: '제27조' },
  { risky: '예측', safe: '추이 분석', article: '제24조' },
];

const ADVERTISING_KEYWORDS = ['거짓', '과대광고', '확실히 보증', '최고', '최상', '체험담', '보증하는 것으로', '지정·공인·추천'];

function scoreToGrade(score) {
  if (score >= 3) return '높음';
  if (score >= 2) return '중간';
  return '낮음';
}

function detectInvasiveSignal(text) {
  let cleaned = text;
  INVASIVE_NEGATIONS.forEach((n) => { cleaned = cleaned.split(n).join(''); });
  return INVASIVE_KEYWORDS.some((k) => cleaned.includes(k));
}

function judgeGate({ description, healthDataItems, method, functionType }) {
  const hasBiometric = healthDataItems.some((i) => i.data_type === '생체지표');
  const dataType = hasBiometric ? '생체지표' : '라이프스타일';
  const acquireMethod = method.length ? METHOD_TO_ACQUIRE[method[0]] ?? null : null;
  const invasiveSignal = detectInvasiveSignal(description);

  if (dataType === '생체지표' && acquireMethod === '기기연동' && invasiveSignal) {
    return { data_type: dataType, function_type: functionType, acquire_method: acquireMethod, invasive_signal: true, verdict: 'FAIL', hardcheck_fired: true };
  }

  const verdict = GATE_MATRIX[`${dataType}|${functionType}`] ?? 'CONDITIONAL';
  return { data_type: dataType, function_type: functionType, acquire_method: acquireMethod, invasive_signal: invasiveSignal, verdict, hardcheck_fired: false };
}

function judgeRegulatoryRisk({ description, healthDataItems }) {
  const hasSensitive = healthDataItems.some((i) => i.is_sensitive);
  const hasBiometric = healthDataItems.some((i) => i.data_type === '생체지표');

  const regulatoryScore = ['진단', '치료', '처방', '경감'].some((k) => description.includes(k)) ? 3
    : ['예측', '개선', '완화'].some((k) => description.includes(k)) ? 2
    : ['측정', '모니터'].some((k) => description.includes(k)) ? 1 : 0;

  const privacyScore = hasSensitive ? 3 : hasBiometric ? 2 : 1;
  const advertisingScore = ADVERTISING_KEYWORDS.some((k) => description.includes(k)) ? 3 : 0;

  const matchedRules = [];
  RISKY_TEXT_MAP.forEach(({ risky, article }) => {
    if (description.includes(risky)) {
      matchedRules.push({
        legal_basis: { document_id: 'LAW-MED-01', article, quote: null },
        exact_phrase_match: true,
      });
    }
  });

  const candidates = RISKY_TEXT_MAP
    .filter(({ risky }) => description.includes(risky))
    .map(({ risky, safe, article }) => ({
      risky_text: risky,
      safe_text: safe,
      legal_basis: { document_id: 'LAW-MED-01', article, quote: null },
      exact_phrase_match: true,
    }));

  const applicableLaws = [];
  if (regulatoryScore > 0) applicableLaws.push('의료기기법');
  if (privacyScore > 0) applicableLaws.push('개인정보 보호법');
  if (advertisingScore > 0) applicableLaws.push('의료기기법 시행규칙 제45조');

  return {
    regulatory_score: regulatoryScore,
    regulatory_grade: scoreToGrade(regulatoryScore),
    privacy_score: privacyScore,
    privacy_grade: scoreToGrade(privacyScore),
    advertising_score: advertisingScore,
    advertising_grade: scoreToGrade(advertisingScore),
    matched_rules: matchedRules,
    applicable_laws: applicableLaws,
    service_law_description: applicableLaws.length
      ? `${applicableLaws.join(', ')}이 적용될 가능성이 있습니다.`
      : null,
    _candidates: candidates, // correction_candidates 조립용 내부 임시 필드
  };
}

// data_difficulty(라이프스타일=1/생체지표=3) × collection_difficulty(수동1/OS2/기기4/기관10)
const DATA_WEIGHT = { 라이프스타일: 1, 생체지표: 3, 기타: 1 };
const METHOD_WEIGHT = { user_input: 1, os_sync: 2, device_sync: 4, institution_sync: 10 };

function judgeDataFeasibility({ healthDataItems, method }) {
  if (!healthDataItems.length) return null;

  const dataWeight = Math.max(...healthDataItems.map((i) => DATA_WEIGHT[i.data_type] ?? 1));
  const methodWeight = method.length ? Math.max(...method.map((m) => METHOD_WEIGHT[m] ?? 1)) : 1;
  const score = dataWeight * methodWeight;
  const riskLevel = score <= 3 ? 'LOW' : score <= 10 ? 'MEDIUM' : 'HIGH';

  const availableSources = [];
  if (healthDataItems.some((i) => i.data_type === '라이프스타일')) {
    availableSources.push({ data_name: '걸음수·수면 시간', source_type: 'public_api', source_name: 'Apple HealthKit / Google Fit' });
  }
  if (healthDataItems.some((i) => i.data_type === '생체지표')) {
    availableSources.push({ data_name: '심박수·혈압 등 생체지표', source_type: 'external_api', source_name: 'Samsung Health Data SDK' });
  }

  const privacyRisks = healthDataItems
    .filter((i) => i.is_sensitive)
    .map((i) => ({ data_name: i.name, reason: '개인정보보호법 제23조상 민감정보에 해당해 별도 동의가 필요합니다.' }));

  return { data_feasibility_score: score, risk_level: riskLevel, available_sources: availableSources, privacy_risks: privacyRisks };
}

const CATEGORY_COMPETITORS = {
  수면: [
    { name: '삼성 헬스', feature: '갤럭시 기기 연동, 종합 건강 관리', limitation: '수면 특화 기능 약함', badge: '진입 가능' },
    { name: 'Sleep Cycle', feature: '수면 분석·스마트 알람 특화', limitation: '국내 인지도 낮음', badge: '진입 가능' },
  ],
  정신건강: [
    { name: 'Calm', feature: '명상·정신건강 콘텐츠 강점', limitation: '국내 로컬라이징 약함', badge: '차별화 필요' },
    { name: '마인드카페', feature: '국내 심리상담 매칭', limitation: '자가 기록 기능 약함', badge: '진입 가능' },
  ],
};

function judgeMarketFeasibility({ category1, gateVerdict }) {
  if (gateVerdict === 'FAIL') return null;
  const cards = CATEGORY_COMPETITORS[category1] ?? [];
  const count = cards.length;
  const saturation = count === 0 ? 'Opportunity' : count <= 2 ? 'Challenging' : 'Saturated';
  const grade = saturation === 'Opportunity' ? '높음' : saturation === 'Challenging' ? '중간' : '낮음';

  return {
    match_level: count > 0 ? 'relaxed_category_only' : 'insufficient_data',
    competitor_count: count,
    saturation,
    market_realism_grade: grade,
    platform_competitor_exists: cards.some((c) => c.name === '삼성 헬스'),
    payment_precedent: count > 0 ? '연 3만원 수준 구독 선례 있음' : null,
    competitor_cards: cards,
  };
}

function judgeBusinessModel({ marketFeasibility }) {
  if (!marketFeasibility || marketFeasibility.match_level === 'insufficient_data') {
    return { match_level: 'insufficient_data', recommendations: [] };
  }
  return {
    match_level: marketFeasibility.match_level,
    recommendations: [
      { bm_pattern: 'Freemium', frequency_score: 3, frequency_score_global: 6, precedent_level: '중간', contributing_competitor_ids: null },
      { bm_pattern: 'Subscription', frequency_score: 2, frequency_score_global: 5, precedent_level: '적음', contributing_competitor_ids: null },
    ],
  };
}

function buildNextActions({ gate, regulatoryRisk, dataFeasibility }) {
  const actions = [];
  if (gate.verdict === 'FAIL') {
    actions.push({ action_text: '의료기기 인증 트랙 검토 또는 기능 재정의(회피 경로)를 검토하세요.', ref_doc: 'MFDS-G-2026-05 제8조', priority: 950 });
  }
  if (regulatoryRisk.regulatory_grade === '높음') {
    actions.push({ action_text: '서비스 설명에서 의료행위 암시 표현을 대체어로 교정하세요.', ref_doc: 'LAW-MED-01 제27조', priority: 780 });
  }
  if (regulatoryRisk.privacy_grade === '높음') {
    actions.push({ action_text: '민감정보 수집 시 개인정보보호법 제23조에 따른 별도 동의를 받으세요.', ref_doc: 'LAW-PIPA-01 제23조', priority: 700 });
  }
  if (dataFeasibility?.risk_level === 'HIGH') {
    actions.push({ action_text: '데이터 확보 난이도가 높습니다. 자가 입력 기반 MVP부터 단계적으로 접근하세요.', ref_doc: null, priority: 520 });
  }
  actions.push({ action_text: '경쟁 서비스 대비 차별화 포인트를 명확히 정리해보세요.', ref_doc: null, priority: 310 });
  return actions;
}

/**
 * 실제 POST /api/v1/analysis/evaluate 응답(EvaluateResult)과 동일한 형태를 로컬에서 만들어낸다.
 * @param {object} sessionPayload - InputPage의 buildAnalysisPayload().sessionPayload
 * @param {object|null} healthDataPayload - InputPage의 buildAnalysisPayload().healthDataPayload
 */
export function runLocalJudge(sessionPayload, healthDataPayload) {
  const healthDataItems = healthDataPayload?.health_data_items ?? [];
  const method = healthDataItems.length
    ? [...new Set(healthDataItems.map((i) => i.source))]
    : [];
  const functionTypeIndex = healthDataPayload?._purposeIndex ?? 0;
  const functionType = PURPOSE_TO_FUNCTION_TYPE[functionTypeIndex] ?? '단순기록';

  const gate = judgeGate({ description: sessionPayload.service_description, healthDataItems, method, functionType });
  const regulatoryRiskFull = judgeRegulatoryRisk({ description: sessionPayload.service_description, healthDataItems });
  const { _candidates: candidates, ...regulatoryRisk } = regulatoryRiskFull;

  const dataFeasibility = gate.verdict === 'FAIL' ? null : judgeDataFeasibility({ healthDataItems, method });
  const marketFeasibility = judgeMarketFeasibility({ category1: sessionPayload.category_1, gateVerdict: gate.verdict });
  const businessModel = gate.verdict === 'FAIL' ? null : judgeBusinessModel({ marketFeasibility });

  const session = {
    session_id: null, // 호출부(InputPage)에서 채워 넣음
    service_name: sessionPayload.service_name,
    service_description: sessionPayload.service_description,
    target_users: sessionPayload.target_users,
    service_type: sessionPayload.service_type,
    category_1: sessionPayload.category_1,
    category_2: sessionPayload.category_2,
    target: sessionPayload.target,
    health_data_items: healthDataItems,
    processing_purpose: healthDataPayload?.processing_purpose ?? [],
    service_actions: [],
  };

  return {
    session,
    gate,
    regulatory_risk: regulatoryRisk,
    correction_candidates: { candidates },
    data_feasibility: dataFeasibility,
    market_feasibility: marketFeasibility,
    business_model: businessModel,
    section_links: [],
    next_actions: buildNextActions({ gate, regulatoryRisk, dataFeasibility }),
  };
}
