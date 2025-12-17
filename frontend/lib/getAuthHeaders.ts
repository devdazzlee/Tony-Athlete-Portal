/**
 * Get Authorization headers with token from localStorage
 * Use this for all fetch API calls
 */

type AuthHeaderOptions = {
  /**
   * Set to `null` to omit the `Content-Type` header (useful for FormData requests).
   * Defaults to `"application/json"`.
   */
  contentType?: string | null;
};

const DEFAULT_CONTENT_TYPE = "application/json";

export function getAuthHeaders(
  options: AuthHeaderOptions = {}
): Record<string, string> {
  const resolvedContentType =
    options.contentType === undefined
      ? DEFAULT_CONTENT_TYPE
      : options.contentType;

  const headers: Record<string, string> = {};

  if (resolvedContentType) {
    headers["Content-Type"] = resolvedContentType;
  }

  if (typeof window === "undefined") {
    return headers;
  }

  const token = localStorage.getItem("accessToken");

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make a fetch request with automatic auth headers
 */
type FetchWithAuthOptions = RequestInit & { authHeadersOptions?: AuthHeaderOptions };

export async function fetchWithAuth(
  url: string,
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const { authHeadersOptions, headers: overrideHeaders, ...restOptions } =
    options;

  const headers: Record<string, string> = {
    ...getAuthHeaders(authHeadersOptions),
  };

  if (overrideHeaders) {
    if (overrideHeaders instanceof Headers) {
      overrideHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(overrideHeaders)) {
      overrideHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, overrideHeaders as Record<string, string>);
    }
  }

  Object.keys(headers).forEach((key) => {
    if (headers[key] === undefined) {
      delete headers[key];
    }
  });

  return fetch(url, {
    ...restOptions,
    headers,
    credentials: "omit", // Don't send cookies anymore
  });
}
