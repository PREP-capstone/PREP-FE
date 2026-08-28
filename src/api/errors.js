export const API_ERROR_CODES = {
  ANALYSIS_SESSION_NOT_FOUND: 'ANALYSIS_SESSION_NOT_FOUND',
  HEALTH_DATA_REQUIRED: 'HEALTH_DATA_REQUIRED',
  HEALTH_DATA_ALREADY_EXISTS: 'HEALTH_DATA_ALREADY_EXISTS',
  ANALYSIS_SESSION_LOCKED: 'ANALYSIS_SESSION_LOCKED',
  ANALYSIS_SESSION_ID_CONFLICT: 'ANALYSIS_SESSION_ID_CONFLICT',
  HEALTH_DATA_SOURCE_UNSUPPORTED: 'HEALTH_DATA_SOURCE_UNSUPPORTED',
  CATEGORY_MODEL_UNAVAILABLE: 'CATEGORY_MODEL_UNAVAILABLE',
};

export const API_ERROR_MESSAGES = {
  [API_ERROR_CODES.ANALYSIS_SESSION_NOT_FOUND]: '분석 세션을 찾을 수 없습니다.',
  [API_ERROR_CODES.HEALTH_DATA_REQUIRED]: '등록된 검진 데이터가 없습니다. 먼저 검진 데이터를 등록해주세요.',
  [API_ERROR_CODES.HEALTH_DATA_ALREADY_EXISTS]: '이미 등록된 검진 데이터가 있습니다. 수정으로 다시 저장해주세요.',
  [API_ERROR_CODES.ANALYSIS_SESSION_LOCKED]: '다른 요청이 이 세션을 처리 중입니다. 잠시 후 다시 시도해주세요.',
  [API_ERROR_CODES.ANALYSIS_SESSION_ID_CONFLICT]: '세션 ID 생성에 실패했습니다. 다시 시도해주세요.',
  [API_ERROR_CODES.HEALTH_DATA_SOURCE_UNSUPPORTED]: '지원하지 않는 데이터 수집 방법입니다. 백엔드 배포 상태 확인이 필요합니다.',
  [API_ERROR_CODES.CATEGORY_MODEL_UNAVAILABLE]: '카테고리 추천 모델을 사용할 수 없습니다. 직접 선택해주세요.',
};

export function isKnownApiErrorCode(code) {
  return Object.values(API_ERROR_CODES).includes(code);
}

export function isFastApiValidationError(data) {
  return Array.isArray(data?.detail);
}

export function formatFastApiValidationError(data) {
  if (!isFastApiValidationError(data)) return null;
  return data.detail
    .map((item) => {
      const loc = Array.isArray(item.loc) ? item.loc.join('.') : item.loc;
      return loc ? `${loc}: ${item.msg}` : item.msg;
    })
    .filter(Boolean)
    .join('\n');
}

export function getApiErrorCode(errorOrData) {
  return errorOrData?.data?.code ?? errorOrData?.code ?? null;
}

export function extractApiErrorMessage(status, data) {
  const knownMessage = API_ERROR_MESSAGES[data?.code];
  if (knownMessage) return knownMessage;
  if (data?.message) return data.message;

  const validationMessage = formatFastApiValidationError(data);
  if (validationMessage) return validationMessage;

  if (typeof data?.detail === 'string') return data.detail;
  return `요청이 실패했어요 (HTTP ${status})`;
}

export function normalizeApiError(error) {
  const code = getApiErrorCode(error);
  return {
    code,
    status: error?.status ?? 0,
    message: extractApiErrorMessage(error?.status ?? 0, error?.data) || error?.message,
    isValidationError: isFastApiValidationError(error?.data),
    raw: error,
  };
}

export function isHealthDataAlreadyExistsError(error) {
  return getApiErrorCode(error) === API_ERROR_CODES.HEALTH_DATA_ALREADY_EXISTS;
}

export function isSessionLockedError(error) {
  return getApiErrorCode(error) === API_ERROR_CODES.ANALYSIS_SESSION_LOCKED;
}
