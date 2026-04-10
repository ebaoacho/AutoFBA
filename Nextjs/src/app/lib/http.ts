export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, '') || '';

type Json = Record<string, unknown> | null | undefined;

export class HttpError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown, message?: string) {
    super(message || `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

function safelyParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function hasDetail(x: unknown): x is { detail: unknown } {
  return typeof x === 'object' && x !== null && 'detail' in x;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function isAbsoluteUrl(p: string): boolean {
  return /^https?:\/\//i.test(p);
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit & { json?: Json; timeoutMs?: number } = {}
): Promise<T> {
  const method = (opts.method || 'GET').toUpperCase();
  const isSafeMethod = method === 'GET' || method === 'HEAD';

  const url = isAbsoluteUrl(path) ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  const isFormData = opts.body instanceof FormData;
  const headers: HeadersInit = {
    ...(!isSafeMethod && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {}),
  };

  const csrf = getCookie('csrftoken');
  if (!isSafeMethod && csrf && typeof window !== 'undefined') {
    (headers as Record<string, string>)['X-CSRFToken'] = csrf;
  }

  let body: BodyInit | null | undefined = undefined;
  if (opts.json !== undefined) {
    body = JSON.stringify(opts.json);
  } else if (isFormData) {
    body = opts.body as FormData;
  } else {
    body = opts.body ?? undefined;
  }

  if (isSafeMethod) {
    body = undefined;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutMs = opts.timeoutMs ?? 30000;
  const timer =
    controller && typeof setTimeout !== 'undefined'
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      method,
      headers,
      credentials: 'include',
      body,
      cache: 'no-store',
      signal: controller?.signal,
    });
  } catch (err) {
    if (timer) clearTimeout(timer);
    const message = err instanceof Error ? err.message : 'Network error';
    throw new HttpError(0, null, message);
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data: unknown = text ? safelyParseJSON(text) : null;

  if (!res.ok) {
    const msg =
      hasDetail(data) && typeof (data as { detail?: unknown }).detail === 'string'
        ? (data as { detail: string }).detail
        : res.statusText || `HTTP ${res.status}`;
    throw new HttpError(res.status, data, msg);
  }

  return data as T;
}
