/**
 * Validators answer "is this well-formed?", not "is this real?". Confirm emails by sending a
 * message, phone numbers by SMS or a lookup service, and always validate again on the server.
 */

/** A string with at least one non-whitespace character. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Pragmatic email format check: one "@", no spaces, a dotted domain, no consecutive dots,
 * local part up to 64 and total length up to 254 characters. It does not implement every
 * RFC 5322 edge case (quoted local parts, IP-literal domains).
 */
export function isEmail(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 254) return false;
  const at = value.lastIndexOf('@');
  if (at < 1 || at > 64) return false;
  const local = value.slice(0, at);
  if (local.startsWith('.') || local.endsWith('.') || value.includes('..')) return false;
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value);
}

export interface IsUrlOptions {
  /** Allowed protocols, including the colon. Defaults to http: and https:. */
  protocols?: readonly string[];
}

/** An absolute URL that the WHATWG URL parser accepts, with an allowed protocol and a host. */
export function isUrl(value: unknown, options: IsUrlOptions = {}): value is string {
  if (typeof value !== 'string') return false;
  const { protocols = ['http:', 'https:'] } = options;
  try {
    const url = new URL(value);
    const needsHost = url.protocol === 'http:' || url.protocol === 'https:';
    return protocols.includes(url.protocol) && (!needsHost || url.hostname.length > 0);
  } catch {
    return false;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-([1-8])[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * An RFC 9562 UUID string (versions 1–8), optionally of a specific version. The nil
 * (all zeros) and max (all f) UUIDs are accepted only when no version is requested.
 */
export function isUuid(value: unknown, version?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8): value is string {
  if (typeof value !== 'string') return false;
  if (
    version === undefined &&
    /^(?:0{8}-0{4}-0{4}-0{4}-0{12}|f{8}-f{4}-f{4}-f{4}-f{12})$/i.test(value)
  ) {
    return true;
  }
  const match = UUID_PATTERN.exec(value);
  return match !== null && (version === undefined || Number(match[1]) === version);
}

/** A CSS hex colour: #rgb, #rgba, #rrggbb or #rrggbbaa. */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

/**
 * A finite number, or a string written as a plain decimal number ("42", "-3.5", ".5", "1e3").
 * Strings with thousands separators or locale-specific decimal commas are rejected.
 */
export function isNumeric(value: unknown): value is number | string {
  if (typeof value === 'number') return Number.isFinite(value);
  return (
    typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
  );
}

/** A real calendar date written as YYYY-MM-DD ("2026-02-29" is rejected; 2026 is not a leap year). */
export function isIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * The E.164 international phone format: "+" then up to 15 digits, not starting with 0.
 * Checks format only: it does not confirm that the number exists or is reachable.
 */
export function isE164Phone(value: unknown): value is string {
  return typeof value === 'string' && /^\+[1-9]\d{1,14}$/.test(value);
}
