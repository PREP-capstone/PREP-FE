// 실제 서비스에서는 이 데이터가 백엔드 AI 분석 결과로 채워집니다.
// 지금은 프론트 화면 흐름을 보여주기 위한 목(mock) 데이터입니다.

export const passReport = {
  gate: 'pass',
  appName: '슬립케어 (SleepCare)',
  appSub: '직장인 수면 질 향상 앱',
  tags: ['수면 관리', '직장인 20~40대', '모바일 앱', '수면 시간 · 심박수', '웨어러블 연동'],
  indicators: {
    reg: { label: '중간', level: 'mid' },
    data: { label: '높음', level: 'low' },
    market: { label: '중간', level: 'mid' },
    biz: { label: '중간', level: 'mid' },
  },
  signal: {
    tone: 'yellow',
    emoji: '🟡',
    title: '주의: 비즈니스 모델 점검 권고',
    body: '규제·데이터 측면은 안정적이나, 수익 구조와 시장 진입 전략에서 추가 검토가 필요합니다. 삼성 헬스 등 대형 경쟁자 대비 차별화 포인트 명확화가 선행 조건입니다.',
  },
  classify: {
    category: '수면 관리',
    form: '모바일 앱 (iOS / Android)',
    data: '수면 시간, 심박수, 스트레스 기록',
    method: '웨어러블 연동 · 자가 입력 복합',
    target: '수면 부채를 겪고 있는 직장인 30~40대. 야근·스트레스로 수면의 질이 저하된 상태이며, 건강 앱 사용 경험은 있으나 수면 특화 솔루션을 찾고 있는 층.',
  },
  gateGrounds: [
    { level: 'low', text: '질병명·진단·치료·처방 등 의료행위를 직접 지시하는 표현이 서비스 설명에 포함되어 있지 않음' },
    { level: 'low', text: '수집 데이터(수면 시간·심박수)는 단순 기록·시각화 목적으로 한정되어 있어 의사 판단을 대체하지 않음' },
    { level: 'low', text: '수치 예측·진단 기능 없이 비교·추이 분석 수준에 머물러 있어 의료기기법 제2조의 의료기기 정의에 해당하지 않음' },
    { level: 'mid', text: '향후 "심박수 이상 감지", "부정맥 알림" 등 진단성 기능을 추가할 경우 GATE 재판정 필요' },
  ],
  regulation: {
    grounds: [
      { level: 'mid', text: '의료행위 표현: "수면 장애 개선" 등 치료 암시 표현 포함 가능성 — 의료법 제56조 위반 소지로 수정 필요' },
      { level: 'mid', text: '수집 데이터 민감도: 수면 시간·심박수는 건강정보에 해당하나 민감정보 수준은 아님 — 개인정보보호법 수집 동의 절차 필요' },
      { level: 'low', text: '서비스 형태 기반 적용 법령: 모바일 앱으로 전자상거래법 광고 규정, 정보통신망법 개인정보 보호 조항 적용' },
      { level: 'mid', text: '광고·마케팅 표현 위험: "수면 효과 입증", "임상 검증" 등 효능 표현 시 표시·광고법 위반 가능성' },
    ],
    beforeAfter: [
      { before: '수면 장애 개선', after: '수면 질 향상' },
      { before: '불면증 치료 도움', after: '수면 루틴 형성 지원' },
      { before: '수면 효과 임상 검증', after: '수면 데이터 기반 인사이트 제공' },
    ],
    actions: [
      { text: '서비스 내 모든 텍스트에서 의료행위 암시 표현 전수 검토 및 교체', ref: '참고: 의료법 제56조 (의료광고 금지 기준)' },
      { text: '개인정보 수집·이용 동의서 마련 — 수집 항목·목적·보유기간 명시', ref: '참고: 개인정보보호법 제15조·제22조' },
      { text: '식약처 비의료기기 웰니스 제품 가이드라인 확인 후 서비스 포지셔닝 문서화', ref: '참고: 식약처 디지털헬스케어 가이드라인 (2023)' },
    ],
    dataSource: '의료법 제21·22조 / 개인정보보호법(민감정보 분류) / 의료기기·비의료기기 판단 가이드라인 / 규제 위반 사례 RAG',
  },
  acquisition: {
    overview: [
      { level: 'easy', name: '수면 시간 · 패턴', desc: '웨어러블 API 즉시 연동' },
      { level: 'mid', name: '스트레스 지표', desc: '자가 입력으로 대체 가능' },
      { level: 'easy', name: '벤치마크 통계', desc: '국민건강영양조사 활용' },
    ],
    grounds: [
      { level: 'low', text: '핵심 데이터(수면 시간·패턴)는 HealthKit / Google Fit API로 즉시 수집 가능 — 확보 난이도 낮음' },
      { level: 'mid', text: '스트레스 기록은 자가 입력으로 대체 가능하며 정확도는 중간 수준으로 MVP에 적합' },
      { level: 'low', text: '공개 통계(국민건강영양조사 수면 항목)로 초기 알고리즘 튜닝 및 벤치마크 활용 가능' },
    ],
    now: [
      { name: 'Apple HealthKit / Google Fit', diff: 'easy', url: 'developer.apple.com' },
      { name: '국민건강영양조사 수면 항목', diff: 'easy', url: 'knhanes.kdca.go.kr' },
      { name: '사용자 자가 입력 (취침·기상·스트레스)', diff: 'easy', url: '앱 내 구현' },
      { name: '삼성 헬스 SDK', diff: 'mid', url: 'developer.samsung.com' },
    ],
    mvp: 'HealthKit / Google Fit 연동으로 수면 데이터를 자동 수집하고, 취침 전 스트레스를 자가 입력받아 수면-스트레스 상관 인사이트를 첫 핵심 기능으로 제공합니다.',
    roadmap: [
      { stage: 'STAGE 1 · MVP', name: '자가 입력 + 웨어러블', desc: 'HealthKit 연동 + 스트레스 자가 입력으로 수면 패턴 시각화', now: true },
      { stage: 'STAGE 2 · 검증', name: '데이터 정교화', desc: '100명+ 사용자 데이터로 수면-스트레스 상관 알고리즘 검증' },
      { stage: 'STAGE 3 · 확장', name: 'B2B 확장', desc: '기업 EAP 연계, 익명 집계 데이터로 기업 대상 웰니스 리포트' },
    ],
    dataSource: '공개 데이터 카탈로그(질병관리청·국민건강영양조사) / 웨어러블 API 연동 가능성 DB / 데이터 유형×난이도 룰 / MVP 전략 템플릿',
  },
  market: {
    overview: [
      { level: 'mid', name: '국내 수요', value: '중위권', desc: '검색량 완만한 성장세' },
      { level: 'mid', name: '경쟁 강도', value: '중간', desc: '대형 강자 존재, 틈새 미개척' },
      { level: 'high', name: '지불 의향', value: 'B2B 높음', desc: 'B2C 선례는 적은 편' },
    ],
    grounds: [
      { level: 'mid', text: '국내 수요 — 중위권: "수면 앱" 네이버 검색량 완만한 성장세, 30~40대 직장인 수면 콘텐츠 꾸준히 상위 노출' },
      { level: 'mid', text: '경쟁 강도 — 삼성 헬스(대형), Sleep Cycle(특화) 등 기존 강자 존재하나 직장인 특화 틈새는 미개척 상태' },
      { level: 'low', text: '지불 의향 — 수면 카테고리 유료 결제 선례 적음 (Sleep Cycle 연 3만원 수준), B2B EAP 시장은 지불 의향 높음' },
    ],
    competitors: [
      { name: '삼성 헬스', feat: '갤럭시 기기 연동, 종합 건강 관리', limit: '수면 특화 기능 약함, 직장인 루틴 미지원', badge: 'enter' },
      { name: 'Sleep Cycle', feat: '수면 분석·스마트 알람 특화', limit: '국내 인지도 낮음, 한국어 UX 미흡', badge: 'enter' },
      { name: 'Calm', feat: '정신건강·명상 콘텐츠 강점', limit: '수면 데이터 분석 없음, 구독료 높음', badge: 'caution' },
    ],
    diff: '삼성 헬스가 커버하지 않는 직장인 수면-업무 스트레스 연계 기능으로 차별화 가능 — 취침 전 업무 스트레스 기록 → 수면 질 상관 분석 → "오늘 야근이 수면을 N분 줄였어요" 형태의 인사이트 제공이 유효한 진입 포인트입니다.',
    dataSource: '카테고리별 경쟁 서비스 DB / 앱스토어 카테고리 순위 / 네이버 데이터랩·구글 트렌드 / 카테고리별 유료화 선례',
  },
  business: {
    cards: [
      {
        type: 'BM TYPE A',
        name: '프리미엄 구독',
        rows: [
          ['가격대', '월 3,900원 / 연 29,000원'],
          ['전환율 기준', '2~5% (수면 카테고리 평균)'],
          ['강점', '예측 가능한 반복 수익'],
          ['무료 기능', '기록·시각화 / 유료: 분석·알림'],
        ],
      },
      {
        type: 'BM TYPE B',
        name: 'B2B EAP 라이선스',
        rows: [
          ['가격대', '인당 연 1~3만원 (기업 계약)'],
          ['전환율 기준', '기업 복지 예산 활용 가능'],
          ['강점', '대규모 사용자 확보, 높은 ARPU'],
          ['진입 조건', 'MVP 이후 데이터 100명+ 확보 후'],
        ],
      },
    ],
    dataSource: '카테고리별 유료화 선례 DB(운동/수면/정신건강) / 국내외 경쟁 앱 가격 정책 / EAP·기업 복지 시장 정보 / 스타트업 IR·인터뷰 RAG',
  },
  summary: {
    text: '수면-스트레스 연계 직장인 특화 앱으로, 규제·데이터 측면에서 즉시 출시 가능한 구조입니다. 일부 의료 암시 표현 수정과 명확한 차별화 포인트 설정이 선행 조건이며, B2C 구독보다 B2B EAP 연계를 중기 목표로 설정하면 수익 구조가 더 견고해집니다.',
    groups: [
      {
        tag: 'now',
        label: '지금 당장',
        steps: [
          '서비스 텍스트 전수 검토 — 의료행위 암시 표현 제거 및 대체어 적용',
          'Apple HealthKit / Google Fit API 연동 개발 시작',
          '직장인 10~20명 인터뷰로 핵심 기능 우선순위 검증',
        ],
      },
      {
        tag: 'launch',
        label: '출시 전 필수',
        steps: [
          '개인정보 수집·이용 동의서 법무 검토 후 앱 내 적용',
          '식약처 비의료기기 웰니스 가이드라인 기준으로 서비스 포지셔닝 문서화',
          '삼성 헬스 대비 차별화 포인트(스트레스 연계)를 랜딩 페이지에 명확히 표현',
        ],
      },
    ],
  },
};

export const failReport = {
  ...passReport,
  gate: 'fail',
  appName: '슬립케어 플러스 (SleepCare+)',
  appSub: '수면무호흡증 진단 및 심박수 이상 감지 앱',
  tags: ['수면 관리', '직장인 20~40대', '모바일 앱', '심박수 · 산소포화도', '수면무호흡증 진단'],
  indicators: {
    ...passReport.indicators,
    reg: { label: '높음', level: 'high' },
  },
  signal: {
    tone: 'red',
    emoji: '🔴',
    title: '의료기기 가능성 — 진행 보류',
    body: 'GATE 판정 결과 의료기기에 해당할 소지가 있어, 규제 위험도 점검 결과만 제공됩니다. 데이터 확보·시장 현실성·수익 구조는 GATE 통과 후 확인 가능합니다.',
  },
  gateGrounds: [
    { level: 'high', text: '서비스 설명에 "불면증 진단", "수면무호흡증 감지" 등 진단·치료를 지시하는 표현이 포함되어 있음' },
    { level: 'high', text: '수집 데이터(심박수·산소포화도)를 기반으로 "이상 여부 판정"을 수행 — 의사의 진단 판단을 대체할 가능성이 있음' },
    { level: 'high', text: '수치 예측·진단 목적의 알림 기능이 의료기기법 제2조 2호(질병의 진단·치료·경감·처치 목적 기기)에 해당할 소지' },
    { level: 'high', text: '식약처 의료기기 인허가(또는 디지털헬스 규제 샌드박스) 검토 없이는 출시 시 의료기기법 위반 소지' },
  ],
};

// 검진 입력 내용을 바탕으로 GATE 판정을 흉내내는 간단한 규칙 기반 판정.
// 실제 서비스에서는 이 판정을 AI 분석 백엔드가 수행합니다.
export function evaluateGate({ description, purposeIndex }) {
  const diagnosticKeywords = ['진단', '질환 판정', '질병 판정', '치료 도움', '이상 감지', '무호흡증'];
  const text = description || '';
  const hasDiagnosticText = diagnosticKeywords.some((k) => text.includes(k));
  const isPredictivePurpose = purposeIndex === 3; // "수치 예측·진단"

  if (hasDiagnosticText || isPredictivePurpose) {
    return 'fail';
  }
  return 'pass';
}
