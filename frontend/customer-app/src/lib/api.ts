const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function buildHeaders(extra?: HeadersInit): HeadersInit {
  return { 'Content-Type': 'application/json', ...extra };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('auth_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(body);
      message = json.message || json.error || message;
    } catch {
      message = body || message;
    }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

export const api = {
  get: <T>(path: string) =>
    fetch(`${API_BASE}${path}`, { headers: buildHeaders(), credentials: 'include' }).then((r) =>
      handleResponse<T>(r),
    ),

  post: <T>(path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: buildHeaders(), credentials: 'include',
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  put: <T>(path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: buildHeaders(), credentials: 'include',
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  patch: <T>(path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: buildHeaders(), credentials: 'include',
      body: JSON.stringify(body),
    }).then((r) => handleResponse<T>(r)),

  delete: <T>(path: string) =>
    fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(), credentials: 'include',
    }).then((r) => handleResponse<T>(r)),
};