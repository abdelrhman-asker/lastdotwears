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
}

let refreshPromise: Promise<void> | null = null;

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
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  headers.set('accept', 'application/json');

  if (options.body !== undefined && !isFormData) {
    headers.set('content-type', 'application/json');
  }

  const csrfToken = isUnsafeMethod(method) ? readCookie('csrf_token') : null;
  if (csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }

  const requestBody: BodyInit | undefined =
    options.body === undefined
      ? undefined
      : isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body);

  return fetch(`${clientEnvironment.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    body: requestBody,
    credentials: 'include',
    headers,
    method,
  });
}

async function refreshAuthentication(): Promise<void> {
  refreshPromise ??= (async () => {
    const response = await fetchApi('/auth/refresh', {
      method: 'POST',
      retryAuthentication: false,
    });
    await parseResponse(response);
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetchApi(path, options);
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

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
