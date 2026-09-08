import { extractApiErrorMessage } from './errors';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.prepwell.shop';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function doFetch(path, { method, body, headers, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  try {
    return await fetch(`${BASE_URL}${path}`, {
      method,
      // FormData(멀티파트)는 브라우저가 boundary 포함 Content-Type을 자동으로 붙여야 해서
      // 직접 헤더를 지정하면 안 된다. JSON 바디일 때만 명시적으로 지정한다.
      headers: isFormData ? headers : { 'Content-Type': 'application/json', ...headers },
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('서버 응답이 없어요 (타임아웃). 잠시 후 다시 시도해주세요.', 0, null);
    }
    throw new ApiError(
      `서버(${BASE_URL})에 연결할 수 없어요. 네트워크 연결을 확인해주세요.`,
      0,
      null
    );
  } finally {
    clearTimeout(timer);
  }
}

async function request(path, { method = 'GET', body, headers, timeoutMs = 20000 } = {}) {
  const res = await doFetch(path, { method, body, headers, timeoutMs });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(extractApiErrorMessage(res.status, data), res.status, data);
  }
  if (data && data.isSuccess === false) {
    throw new ApiError(extractApiErrorMessage(res.status, data), res.status, data);
  }

  return data;
}

/**
 * 응답 자체가 파일(binary)인 엔드포인트용 (예: GET /proposals/{id}/pdf).
 * 성공(2xx)이면 Blob을 반환하고, 실패면 JSON 에러 바디를 파싱해 ApiError를 던진다.
 */
async function requestBlob(path, { method = 'GET', headers, timeoutMs = 20000 } = {}) {
  const res = await doFetch(path, { method, body: undefined, headers, timeoutMs });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
    throw new ApiError(extractApiErrorMessage(res.status, data), res.status, data);
  }

  return res.blob();
}

export const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  /** body에 FormData(멀티파트)를 넘기면 request()가 Content-Type을 자동 처리한다. */
  postForm: (path, formData, opts) => request(path, { ...opts, method: 'POST', body: formData }),
  /** 응답이 JSON이 아니라 파일 자체인 GET 요청용 (예: PDF 다운로드). */
  getBlob: (path, opts) => requestBlob(path, { ...opts, method: 'GET' }),
};

/** 표준 래퍼 응답 { isSuccess, code, message, result } 에서 result만 꺼낸다 */
export function unwrap(response) {
  return response?.result;
}
