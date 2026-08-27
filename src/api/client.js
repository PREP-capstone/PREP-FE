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

async function request(path, { method = 'GET', body, headers, timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

export const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
};

/** 표준 래퍼 응답 { isSuccess, code, message, result } 에서 result만 꺼낸다 */
export function unwrap(response) {
  return response?.result;
}
