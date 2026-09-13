// 제안서 자동 작성 — 지원사업 유형 3종.
// BE의 template_type은 category_1과 동일하게 닫힌 enum이 아니라 자유 텍스트라,
// 새 유형이 추가돼도 이 배열에 항목만 추가하면 되고 스키마 변경은 필요 없다. (API 명세서 §1 참고)
export const TEMPLATE_TYPE_OPTIONS = [
  {
    value: 'PSST',
    label: '창업사업화 지원사업',
    sublabel: 'PSST 표준형',
    description: '예비창업패키지·초기창업패키지·창업도약패키지 등',
  },
  {
    value: 'RND',
    label: 'R&D 과제형',
    sublabel: '기술개발사업',
    description: '창업성장기술개발사업 등, PSST와 다른 별도 양식',
  },
  {
    value: 'IR',
    label: '투자유치용',
    sublabel: 'IR',
    description: '민간 VC·엔젤 투자자 대상',
  },
];

export const TEMPLATE_TYPE_VALUES = TEMPLATE_TYPE_OPTIONS.map((option) => option.value);

// GET /field-definitions 응답의 category 값 표시 순서.
// 여기 없는 category가 응답에 새로 오면 화면 하단에 순서대로 덧붙여 렌더링한다 (누락 방지).
export const PROPOSAL_CATEGORY_ORDER = [
  '일반현황',
  '문제인식',
  '실현가능성',
  '성장전략',
  '팀구성',
  'PREP특화',
  'RND특화',
  'IR추가',
  '첨부서류',
];

// field_type 값. TABLE은 연도별 행 추가/삭제가 가능한 입력(예: growth_targets, annual_budget_exec).
export const PROPOSAL_FIELD_TYPES = {
  TEXT: 'TEXT',
  CHECKLIST: 'CHECKLIST',
  TABLE: 'TABLE',
};

export const PROPOSAL_REQUIREMENT = {
  REQUIRED: 'REQUIRED',
  OPTIONAL: 'OPTIONAL',
};

export const PROPOSAL_REPORT_MAX_BYTES = 10 * 1024 * 1024; // 10MB, funding.py의 _MAX_REPORT_BYTES와 동일 기준
