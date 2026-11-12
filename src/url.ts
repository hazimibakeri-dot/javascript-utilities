export type QueryPrimitive = string | number | boolean | bigint;
export type QueryValue =
  QueryPrimitive | null | undefined | readonly (QueryPrimitive | null | undefined)[];
export type QueryParams = Record<string, QueryValue>;

const toValues = (value: QueryValue): QueryPrimitive[] =>
  (Array.isArray(value) ? (value as readonly QueryValue[]) : [value]).filter(
    (item): item is QueryPrimitive => item !== null && item !== undefined,
  );

/** Whether the string starts with a URL scheme such as "https:" or "mailto:". */
export function isAbsoluteUrl(value: string): boolean {
  return /^[a-z][a-z\d+\-.]*:/i.test(value);
}

/**
 * Serialises parameters to a query string (without "?"). Arrays become repeated keys,
 * `null`/`undefined` are skipped, and encoding follows URLSearchParams (spaces become "+").
 * @example stringifyQuery({ q: 'red shoes', size: [40, 41] }) // "q=red+shoes&size=40&size=41"
 */
export function stringifyQuery(params: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of toValues(value)) search.append(key, String(item));
  }
  return search.toString();
}

/**
 * Parses a query string, a "?…" search part or a full URL into an object. Repeated keys
 * become arrays. The result has no prototype, so keys like "__proto__" are stored safely.
 */
export function parseQuery(input: string): Record<string, string | string[]> {
  const queryStart = input.indexOf('?');
  const withoutHash = input.split('#')[0] ?? '';
  const query = queryStart >= 0 ? withoutHash.slice(queryStart + 1) : withoutHash;
  const result = Object.create(null) as Record<string, string | string[]>;
  for (const [key, value] of new URLSearchParams(query)) {
    const existing = result[key];
    if (existing === undefined) result[key] = value;
    else result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return result;
}

const PLACEHOLDER_ORIGIN = 'http://placeholder.invalid';

function editUrl(url: string, edit: (parsed: URL) => void): string {
  const absolute = isAbsoluteUrl(url);
  const parsed = new URL(url, PLACEHOLDER_ORIGIN);
  edit(parsed);
  if (absolute) return parsed.toString();
  const path = url.startsWith('/') ? parsed.pathname : parsed.pathname.replace(/^\//, '');
  return `${path}${parsed.search}${parsed.hash}`;
}

/**
 * Sets query parameters on an absolute or relative URL, replacing existing values for the
 * same keys. Arrays set repeated keys; `null`/`undefined` remove the key.
 * @example updateQuery('/search?q=old&page=2', { q: 'new', page: null }) // "/search?q=new"
 */
export function updateQuery(url: string, params: QueryParams): string {
  return editUrl(url, (parsed) => {
    for (const [key, value] of Object.entries(params)) {
      parsed.searchParams.delete(key);
      for (const item of toValues(value)) parsed.searchParams.append(key, String(item));
    }
  });
}

/**
 * Removes query parameters by name or by predicate, e.g. tracking parameters:
 * removeQuery(url, (key) => key.startsWith('utm_')).
 */
export function removeQuery(
  url: string,
  keys: readonly string[] | ((key: string) => boolean),
): string {
  const shouldRemove = typeof keys === 'function' ? keys : (key: string) => keys.includes(key);
  return editUrl(url, (parsed) => {
    for (const key of [...new Set(parsed.searchParams.keys())]) {
      if (shouldRemove(key)) parsed.searchParams.delete(key);
    }
  });
}

/**
 * Joins path segments with single slashes, keeping a leading slash on the first segment, a
 * trailing slash on the last, and the "//" after a URL scheme.
 * @example joinPath('https://api.example.com/', '/v1/', 'users') // "https://api.example.com/v1/users"
 */
export function joinPath(...segments: string[]): string {
  const parts = segments.filter((segment) => segment !== '');
  if (parts.length === 0) return '';
  const leading = parts[0]!.startsWith('/') ? '/' : '';
  const trailing = parts.at(-1)!.endsWith('/') ? '/' : '';
  const middle = parts
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  if (middle === '') return leading || trailing;
  return `${leading}${middle}${trailing}`;
}

export interface BuildUrlOptions {
  /** One or more path segments appended to the base. */
  path?: string | readonly string[];
  query?: QueryParams;
  /** Fragment without "#". */
  hash?: string;
}

/**
 * Builds a URL from a base, path segments, query parameters and a fragment.
 * @example buildUrl('https://api.example.com', { path: ['v1', 'users'], query: { page: 2 } })
 * // "https://api.example.com/v1/users?page=2"
 */
export function buildUrl(base: string, options: BuildUrlOptions = {}): string {
  const { path, query, hash } = options;
  const withPath = path === undefined ? base : joinPath(base, ...[path].flat());
  return editUrl(withPath, (parsed) => {
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        for (const item of toValues(value)) parsed.searchParams.append(key, String(item));
      }
    }
    if (hash !== undefined) parsed.hash = hash;
  });
}

/** The hostname of an absolute URL ("www.example.com"), or `null` if it cannot be parsed. */
export function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}
