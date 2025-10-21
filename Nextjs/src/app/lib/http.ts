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

// クッキー取得（クライアントのみ）
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  );
  return m ? decodeURIComponent(m[1]) : null;
}

// 絶対URLかどうか
function isAbsoluteUrl(p: string): boolean {
  return /^https?:\/\//i.test(p);
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit & { json?: Json; timeoutMs?: number } = {}
): Promise<T> {
  // URL決定
  const url = isAbsoluteUrl(path) ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;

  // ヘッダ生成（FormDataなら Content-Type 付与しない）
  const isFormData = opts.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(opts.headers || {}),
  };

  // CSRFトークンがあれば自動付与（Django想定）
  const csrf = getCookie('csrftoken');
  if (csrf && typeof window !== 'undefined') {
    (headers as Record<string, string>)['X-CSRFToken'] = csrf;
  }

  // body 決定
  let body: BodyInit | null | undefined = undefined;
  if (opts.json !== undefined) {
    body = JSON.stringify(opts.json);
  } else if (isFormData) {
    body = opts.body as FormData;
  } else {
    body = opts.body ?? undefined;
  }

  // GET/HEAD のときは body を付けない
  const method = (opts.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    body = undefined;
  }

  // タイムアウト制御
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
    const message =
      err instanceof Error
        ? err.message
        : 'Network error';
    // ネットワーク層の例外を HttpError(0) に正規化
    throw new HttpError(0, null, message);
  } finally {
    if (timer) clearTimeout(timer);
  }

  // 204 No Content
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
