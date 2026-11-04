import { clientEnvironment } from '@/lib/env/client';

export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  detail: string;
  instance?: string;
  requestId?: string;
  timestamp?: string;
  errors?: string[];
}

export class ApiError extends Error {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = 'ApiError';
    this.problem = problem;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  retryAuthentication?: boolean;
  retryCsrf?: boolean;
}

interface CsrfTokenResponse {
  csrfToken: string;
}

let refreshPromise: Promise<void> | null = null;
let csrfPromise: Promise<string> | null = null;
let activeCsrfToken: string | null = null;

function apiBaseUrl(): string {
  return typeof window === 'undefined' ? clientEnvironment.NEXT_PUBLIC_API_URL : '/api/v1';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function isUnsafeMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  const availableToken = activeCsrfToken ?? readCookie('csrf_token');
  if (!forceRefresh && availableToken) {
    activeCsrfToken = availableToken;
    return availableToken;
  }

  csrfPromise ??= fetch(`${apiBaseUrl()}/auth/csrf`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
    method: 'GET',
  })
    .then(async (response) => {
      const result = await parseResponse<CsrfTokenResponse>(response);
      if (!result.csrfToken) {
        throw new Error('The API did not return a CSRF token.');
      }
      activeCsrfToken = result.csrfToken;
      return result.csrfToken;
    })
    .finally(() => {
      csrfPromise = null;
    });

  return csrfPromise;
}

async function isCsrfRejection(response: Response): Promise<boolean> {
  if (response.status !== 403) {
    return false;
  }

  try {
    const body = (await response.clone().json()) as Partial<ProblemDetails>;
    return body.detail === 'The CSRF token is missing or invalid.';
  } catch {
    return false;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  let problem: ProblemDetails;
  try {
    const body = (await response.json()) as Partial<ProblemDetails>;
    problem = {
      status: response.status,
      detail: body.detail ?? body.title ?? 'The request could not be completed.',
      ...body,
    };
  } catch {
    problem = {
      status: response.status,
      detail: 'The request could not be completed.',
    };
  }
  throw new ApiError(problem);
}

async function fetchApi(path: string, options: RequestOptions): Promise<Response> {
  const body = options.body;
  const requestOptions = { ...options };
  delete requestOptions.body;
  delete requestOptions.retryAuthentication;
  delete requestOptions.retryCsrf;
  const method = requestOptions.method ?? 'GET';

  if (isUnsafeMethod(method)) {
    await ensureCsrfToken();
  }

  const headers = new Headers(requestOptions.headers);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  headers.set('accept', 'application/json');

  if (body !== undefined && !isFormData) {
    headers.set('content-type', 'application/json');
  }

  const csrfToken = isUnsafeMethod(method) ? await ensureCsrfToken() : null;
  if (csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }

  const requestBody: BodyInit | undefined =
    body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body);

  return fetch(`${apiBaseUrl()}${path}`, {
    ...requestOptions,
    body: requestBody,
    credentials: 'include',
    headers,
    method,
  });
}

async function refreshAuthentication(): Promise<void> {
  refreshPromise ??= apiRequest<unknown>('/auth/refresh', {
    method: 'POST',
    retryAuthentication: false,
  })
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await fetchApi(path, options);
  const method = options.method ?? 'GET';
  const canRetryCsrf =
    options.retryCsrf !== false && isUnsafeMethod(method) && (await isCsrfRejection(response));

  if (canRetryCsrf) {
    await ensureCsrfToken(true);
    response = await fetchApi(path, { ...options, retryCsrf: false });
  }

  const canRefresh = options.retryAuthentication !== false && response.status === 401;

  if (canRefresh) {
    try {
      await refreshAuthentication();
      return parseResponse<T>(await fetchApi(path, { ...options, retryAuthentication: false }));
    } catch (error) {
      if (!(error instanceof ApiError) || error.problem.status !== 401) {
        throw error;
      }
    }
  }

  return parseResponse<T>(response);
}

export async function apiBlobRequest(path: string): Promise<Blob> {
  let response = await fetchApi(path, { method: 'GET' });
  if (response.status === 401) {
    try {
      await refreshAuthentication();
      response = await fetchApi(path, { method: 'GET', retryAuthentication: false });
    } catch (error) {
      if (!(error instanceof ApiError) || error.problem.status !== 401) throw error;
    }
  }
  if (!response.ok) return parseResponse<never>(response);
  return response.blob();
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
