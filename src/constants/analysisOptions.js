export const CATEGORY_1_OPTIONS = [
  '수면',
  '정신건강',
  '운동',
  '식단',
  '만성질환',
  '여성건강',
  '유전자',
  '미용',
];

export const CATEGORY_2_OPTIONS = [
  '정보제공',
  '데이터기록관리',
  '매칭연결',
  '개입치료',
];

export const HEALTH_DATA_GROUPS = {
  lifestyle: '라이프스타일',
  biometric: '생체지표',
  sensitive: '민감정보',
  behavior: '행동데이터',
};

export const HEALTH_DATA_CATALOG = [
  { item_code: 'lifestyle_001', name: '걸음수', group: 'lifestyle', data_type: 'numeric', is_sensitive: false },
  { item_code: 'lifestyle_002', name: '수면 시간', group: 'lifestyle', data_type: 'numeric', is_sensitive: false },
  { item_code: 'lifestyle_003', name: '식단 기록', group: 'lifestyle', data_type: 'text', is_sensitive: false },
  { item_code: 'lifestyle_004', name: '운동 기록', group: 'lifestyle', data_type: 'text', is_sensitive: false },
  { item_code: 'lifestyle_005', name: '스트레스 기록', group: 'lifestyle', data_type: 'text', is_sensitive: false },
  { item_code: 'biometric_001', name: '심박수', group: 'biometric', data_type: 'numeric', is_sensitive: false },
  { item_code: 'biometric_002', name: '혈압', group: 'biometric', data_type: 'numeric', is_sensitive: false },
  { item_code: 'biometric_003', name: '체중·BMI', group: 'biometric', data_type: 'numeric', is_sensitive: false },
  { item_code: 'biometric_004', name: '체온', group: 'biometric', data_type: 'numeric', is_sensitive: false },
  { item_code: 'biometric_005', name: '산소포화도', group: 'biometric', data_type: 'numeric', is_sensitive: false },
  { item_code: 'sensitive_001', name: '혈당', group: 'sensitive', data_type: 'numeric', is_sensitive: true },
  { item_code: 'sensitive_002', name: '유전자 정보', group: 'sensitive', data_type: 'text', is_sensitive: true },
  { item_code: 'sensitive_003', name: '생리주기·임신', group: 'sensitive', data_type: 'text', is_sensitive: true },
  { item_code: 'sensitive_004', name: '복용 약물', group: 'sensitive', data_type: 'text', is_sensitive: true },
  { item_code: 'sensitive_005', name: '과거 병력·진단 이력', group: 'sensitive', data_type: 'text', is_sensitive: true },
  { item_code: 'behavior_001', name: '앱 체류시간', group: 'behavior', data_type: 'numeric', is_sensitive: false },
  { item_code: 'behavior_002', name: '구매 이력', group: 'behavior', data_type: 'text', is_sensitive: false },
  { item_code: 'behavior_003', name: '위치 정보', group: 'behavior', data_type: 'text', is_sensitive: false },
];

export const HEALTH_DATA_CATALOG_BY_CODE = Object.fromEntries(
  HEALTH_DATA_CATALOG.map((item) => [item.item_code, item])
);

export const HEALTH_DATA_CATALOG_BY_NAME = Object.fromEntries(
  HEALTH_DATA_CATALOG.map((item) => [item.name, item])
);

export const SOURCE_OPTIONS = [
  { value: 'user_input', label: '사용자 자가 입력', description: '앱에서 직접 기록' },
  { value: 'os_sync', label: 'OS 건강앱 연동', description: 'HealthKit·Google Fit 같은 OS 레이어 경유' },
  { value: 'institution_sync', label: '병원·임상 데이터 연동', description: 'EMR·병원 DB' },
  { value: 'device_sync', label: '기기 직접연동', description: '제조사 API·블루투스로 기기와 직접 통신' },
];

export const SOURCE_VALUES = SOURCE_OPTIONS.map((option) => option.value);

export const SERVICE_ACTION_OPTIONS = [
  { value: 'record', label: '단순 기록·저장', hasGateWarning: false },
  { value: 'visualize_trend', label: '비교·추이 분석', hasGateWarning: false },
  { value: 'alert', label: '위험 알림', hasGateWarning: true },
  { value: 'predict', label: '수치 예측·진단', hasGateWarning: true },
];

export const SERVICE_ACTION_VALUES = SERVICE_ACTION_OPTIONS.map((option) => option.value);

export const SERVICE_ACTION_WARNING =
  '의료기기 해당 가능성이 높아질 수 있어 GATE와 규제 위험도가 엄격하게 산출됩니다.';

export const UNKNOWN_HEALTH_DATA_ITEM_NOTICE =
  '기타 직접 입력 항목은 item_code가 없어 점수 계산에서 제외될 수 있습니다.';
