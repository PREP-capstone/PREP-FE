// /report/preview/pass, /report/preview/fail 에서만 쓰는 디자인 확인용 목업 데이터.
// 실제 백엔드 응답(POST /api/v1/analysis/evaluate 의 EvaluateResult)과 동일한 형태로 맞춰뒀다.

export const passReport = {
  session: {
    session_id: 'preview-pass',
    service_name: '슬립케어 (SleepCare)',
    service_description: '수면 시간과 심박수를 분석해 맞춤형 수면 루틴을 추천하는 모바일 앱',
    target_users: ['수면 관심층', '30대', '40대'],
    service_type: '모바일 앱',
    category_1: '수면',
    category_2: '정보제공',
    target: '수면 관심층, 30대, 40대',
    health_data_items: [],
    processing_purpose: ['비교·추이분석'],
    service_actions: [],
  },
  gate: {
    data_type: '생체지표',
    function_type: '비교·추이분석',
    acquire_method: null,
    invasive_signal: false,
    verdict: 'CONDITIONAL',
    hardcheck_fired: false,
    reasoning: [
      '수면 시간과 심박수는 생체지표 기반 서비스로 분류됩니다.',
      '기능이 진단이 아닌 루틴 추천과 정보 제공에 머물러 조건부 통과로 판정됩니다.',
      '의료행위 표현을 줄이면 비의료기기 서비스로 운영 가능성이 높아집니다.',
      '민감정보 처리 고지와 별도 동의 흐름은 초기 설계에 포함해야 합니다.',
    ],
  },
  regulatory_risk: {
    regulatory_score: 1,
    regulatory_grade: '낮음',
    privacy_score: 2,
    privacy_grade: '중간',
    advertising_score: 0,
    advertising_grade: '낮음',
    matched_rules: [
      {
        legal_basis: { document_id: 'MFDS-G-2020-01', article: 'III.2.다', quote: '질병 언급 없는 측정·모니터링' },
        exact_phrase_match: true,
      },
    ],
    applicable_laws: ['의료기기법', '개인정보 보호법'],
    service_law_description: '모바일 앱 형태의 서비스로 전자상거래법 광고 규정과 정보통신망법 개인정보 보호 조항이 적용됩니다.',
  },
  correction_candidates: {
    candidates: [
      {
        risky_text: '수면 장애 개선',
        safe_text: '수면 질 향상',
        match_source: 'rule',
        legal_basis: { document_id: 'LAW-MED-01', article: '제56조', quote: null },
        exact_phrase_match: true,
      },
      {
        risky_text: '불면증 치료 도움',
        safe_text: '수면 루틴 형성 지원',
        match_source: 'llm',
        legal_basis: { document_id: 'LAW-MED-01', article: '제56조', quote: null },
        exact_phrase_match: false,
      },
    ],
  },
  data_feasibility: {
    data_feasibility_score: 3,
    risk_level: 'LOW',
    available_sources: [
      { data_name: '수면 시간·패턴', source_type: 'public_api', source_name: 'Apple HealthKit / Google Fit' },
      { data_name: '국민건강영양조사 수면 항목', source_type: 'public_api', source_name: 'KOSIS' },
    ],
    privacy_risks: [
      { data_name: '수면 시간', reason: '생체지표로 분류되어 개인정보보호법상 처리 원칙 준수가 필요합니다.' },
    ],
    standard_scale_candidates: [
      {
        scale_id: 'scale_isi',
        name: 'ISI',
        full_name: 'Insomnia Severity Index',
        category_1: '수면',
        item_count: 7,
        scoring_range: '0-28',
        license_type: '상업적 사용 시 유료·허가 필요',
        source_url: 'https://eprovide.mapi-trust.org/isi-insomnia-severity-index/',
        note: '불면 심각도 자가보고 척도이나 상업 서비스 적용 전 사용 허가 확인이 필요합니다.',
      },
    ],
    mvp_roadmap: [
      { stage: 1, title: '핵심 데이터만 수동 입력으로 검증', description: '초기에는 수동 입력 기반으로 데이터 가치를 검증합니다.' },
      { stage: 2, title: 'OS 건강앱 연동으로 검증 확장', description: 'HealthKit·Google Fit 연동 후 지속 사용률과 리텐션을 확인합니다.' },
      { stage: 3, title: '기기 직접연동은 인증 리스크 확인 후 확장', description: '제조사 API 연동은 개인정보와 의료기기 리스크를 검토한 뒤 진행합니다.' },
    ],
  },
  market_feasibility: {
    match_level: 'exact_match',
    match_scope_description: '서비스 형태는 제외하고 카테고리, 세부 기능, 타깃이 같은 선례를 기준으로 비교했습니다.',
    competitor_count: 4,
    saturation: 'Challenging',
    market_realism_grade: '중간',
    platform_competitor_exists: true,
    platform_competitor_summary: '유사 범위 안에 플랫폼급 경쟁사가 있어 차별화 근거를 더 강하게 제시해야 합니다.',
    payment_precedent: '연 3만원 수준 구독 선례 있음',
    competitor_cards: [
      { name: '삼성 헬스', feature: '갤럭시 기기 연동, 종합 건강 관리', limitation: '수면 특화 기능 약함', badge: '진입 가능' },
      { name: 'Sleep Cycle', feature: '수면 분석·스마트 알람 특화', limitation: '국내 인지도 낮음', badge: '진입 가능' },
      { name: 'Calm', feature: '정신건강·명상 콘텐츠 강점', limitation: '수면 데이터 분석 없음', badge: '차별화 필요' },
    ],
  },
  business_model: {
    match_level: 'relaxed_service_type',
    match_scope_description: '카테고리와 타깃이 유사한 웰니스 서비스의 수익화 선례를 기준으로 추천했습니다.',
    recommendations: [
      {
        bm_pattern: 'Freemium',
        frequency_score: 3,
        frequency_score_global: 6,
        precedent_level: '보통',
        precedent_services: ['삼성 헬스', 'Sleep Cycle'],
        bm_description: '기본 기록과 요약 기능은 무료로 제공하고, 고급 리포트나 개인화 기능을 유료로 전환하는 모델입니다.',
        contributing_competitor_ids: 'CP001,CP014,CP022',
      },
      {
        bm_pattern: 'Subscription',
        frequency_score: 2,
        frequency_score_global: 5,
        precedent_level: '적음',
        precedent_services: ['Calm'],
        bm_description: '월간 또는 연간 구독료를 받고 지속적인 관리 기능과 콘텐츠를 제공하는 모델입니다.',
        contributing_competitor_ids: 'CP003,CP019',
      },
    ],
  },
  section_links: [
    { target_section: 'regulatory', message: '민감정보 수집 시 개인정보보호법 제23조 별도 동의가 필요합니다.' },
  ],
  next_actions: [
    { action_text: '서비스 텍스트에서 의료행위 암시 표현을 전수 검토하고 대체어를 적용하세요.', ref_doc: 'LAW-MED-01 제56조', priority: 780 },
    { action_text: 'Apple HealthKit / Google Fit API 연동 개발을 시작하세요.', ref_doc: null, priority: 320 },
    { action_text: '삼성 헬스 대비 차별화 포인트를 랜딩 페이지에 명확히 표현하세요.', ref_doc: null, priority: 310 },
  ],
};

export const failReport = {
  ...passReport,
  session: {
    ...passReport.session,
    session_id: 'preview-fail',
    service_name: '슬립케어 플러스 (SleepCare+)',
    service_description: '심박수와 산소포화도를 분석해 수면무호흡증을 진단하는 앱',
  },
  gate: {
    data_type: '생체지표',
    function_type: '수치예측·진단',
    acquire_method: '기기연동',
    invasive_signal: true,
    verdict: 'FAIL',
    hardcheck_fired: true,
    avoidance_redesign: '진단·예측 표현을 제거하고 수면 기록·추이 시각화 중심으로 재설계하세요.',
    avoidance_certification: '수면무호흡증 진단 기능을 유지하려면 의료기기 인증 트랙 검토가 필요합니다.',
    reasoning: [
      '산소포화도와 심박수를 활용한 수면무호흡증 진단은 생체지표 기반 진단 기능입니다.',
      '기기 직접연동과 침습적 신호가 결합되어 하드체크가 발동했습니다.',
      'FAIL 판정에서는 데이터·시장·BM 섹션이 실행되지 않을 수 있습니다.',
      'MVP는 진단 대신 수면 기록과 일반 정보 제공으로 범위를 낮추는 방향이 안전합니다.',
    ],
  },
  regulatory_risk: {
    ...passReport.regulatory_risk,
    regulatory_grade: '높음',
    regulatory_score: 3,
  },
  data_feasibility: null,
  market_feasibility: null,
  business_model: null,
  next_actions: [
    { action_text: '의료기기 인증 트랙 검토가 필요합니다 (avoidance_certification).', ref_doc: 'MFDS-G-2026-05 제8조', priority: 950 },
    { action_text: '진단·수치예측 기능을 제거하고 단순 기록·시각화로 기능을 축소하는 방안을 검토하세요.', ref_doc: null, priority: 900 },
  ],
};
