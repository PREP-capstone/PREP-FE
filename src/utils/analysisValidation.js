import {
  CATEGORY_1_OPTIONS,
  CATEGORY_2_OPTIONS,
  HEALTH_DATA_CATALOG_BY_CODE,
  HEALTH_DATA_CATALOG_BY_NAME,
  SERVICE_ACTION_VALUES,
  SOURCE_VALUES,
} from '../constants/analysisOptions';

export function isValidCategory1(value) {
  return CATEGORY_1_OPTIONS.includes(value);
}

export function isValidCategory2(value) {
  return CATEGORY_2_OPTIONS.includes(value);
}

export function isValidSource(value) {
  return SOURCE_VALUES.includes(value);
}

export function isValidServiceAction(value) {
  return SERVICE_ACTION_VALUES.includes(value);
}

export function getHealthDataCatalogItem(itemCode) {
  return HEALTH_DATA_CATALOG_BY_CODE[itemCode] ?? null;
}

export function getHealthDataCatalogItemByName(name) {
  return HEALTH_DATA_CATALOG_BY_NAME[name] ?? null;
}

export function isKnownHealthDataItemCode(itemCode) {
  return Boolean(getHealthDataCatalogItem(itemCode));
}

export function buildTargetFromUsers(targetUsers = []) {
  return targetUsers.map((value) => String(value).trim()).filter(Boolean).join(', ');
}

export function buildHealthDataItemFromCode(itemCode, source, overrides = {}) {
  const catalogItem = getHealthDataCatalogItem(itemCode);
  if (!catalogItem) return null;

  return {
    name: catalogItem.name,
    data_type: catalogItem.data_type,
    source,
    is_sensitive: catalogItem.is_sensitive,
    item_code: catalogItem.item_code,
    ...overrides,
  };
}

export function validateCategoryPayload(payload = {}) {
  const errors = [];
  if (payload.category_1 !== undefined && !isValidCategory1(payload.category_1)) {
    errors.push({ field: 'category_1', message: '목록에 없는 category_1 값입니다.' });
  }
  if (payload.category_2 !== undefined && !isValidCategory2(payload.category_2)) {
    errors.push({ field: 'category_2', message: '목록에 없는 category_2 값입니다.' });
  }
  return errors;
}

export function validateHealthDataPayload(payload = {}) {
  const errors = [];
  const items = payload.health_data_items ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    errors.push({ field: 'health_data_items', message: '검진 데이터 항목을 1개 이상 선택해주세요.' });
  }

  items.forEach((item, index) => {
    if (!item.name) {
      errors.push({ field: `health_data_items.${index}.name`, message: '검진 데이터 이름이 비어 있습니다.' });
    }
    if (!isValidSource(item.source)) {
      errors.push({ field: `health_data_items.${index}.source`, message: '지원하지 않는 수집방법입니다.' });
    }
    if (item.item_code && !isKnownHealthDataItemCode(item.item_code)) {
      errors.push({ field: `health_data_items.${index}.item_code`, message: '카탈로그에 없는 item_code입니다.' });
    }
  });

  const actions = payload.service_actions ?? [];
  if (actions.length > 0 && !actions.every(isValidServiceAction)) {
    errors.push({ field: 'service_actions', message: '지원하지 않는 활용 목적이 포함되어 있습니다.' });
  }

  return errors;
}

export function hasRegisteredHealthData(session) {
  return (session?.health_data_items?.length ?? 0) > 0;
}

export function assertNoValidationErrors(errors) {
  if (errors.length > 0) {
    const err = new Error(errors.map((item) => item.message).join('\n'));
    err.name = 'AnalysisValidationError';
    err.validationErrors = errors;
    throw err;
  }
}
