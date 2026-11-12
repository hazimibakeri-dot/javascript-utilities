# javascript-utilities

Small, well-tested TypeScript utilities for everyday front-end and Node.js work: strings, dates,
arrays, objects, numbers, currency, validation, URLs and async control flow.

- **Zero runtime dependencies.** Built on standard APIs (`Intl`, `URL`, `URLSearchParams`,
  `AbortSignal`).
- **Typed.** Written in strict TypeScript with declaration files and source maps.
- **Tree-shakeable ES modules** with per-module entry points (`javascript-utilities/date`, …).
- **Explicit about edge cases.** Invalid input throws a `RangeError` or returns `null`/`false`
  as documented, never a silent `NaN` or `Invalid Date`.
- **Tested.** 173 unit tests, 100% line coverage, run in a time zone with daylight saving time.

## Installation

The package is not published to the npm registry. Build and pack it locally:

```bash
git clone https://github.com/hazimibakeri-dot/javascript-utilities.git
cd javascript-utilities
npm install
npm run build
npm pack                       # creates javascript-utilities-0.1.0.tgz
```

Then install the tarball in your project:

```bash
npm install ../path/to/javascript-utilities-0.1.0.tgz
```

## Usage

```ts
import { formatCurrency, retry, slugify, truncate } from 'javascript-utilities';
import { toISODate } from 'javascript-utilities/date';

slugify('Crème Brûlée & Co.'); // "creme-brulee-co"
truncate('The quick brown fox', 12, { wordBoundary: true }); // "The quick…"
formatCurrency(1234.5, 'EUR', { locale: 'de-DE' }); // "1.234,50 €"
toISODate('2026-03-01T23:30:00Z', { timeZone: 'Asia/Tokyo' }); // "2026-03-02"

const data = await retry(() => fetch('/api/items').then((r) => r.json()), { retries: 2 });
```

Run `npm run example` to build the library and execute [`examples/usage.js`](examples/usage.js),
a tour of the main functions.

## API

### String: `javascript-utilities/string`

| Function                                                                            | Description                                                                       |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `capitalize(value, locale?)`                                                        | Upper-cases the first character                                                   |
| `toWords(value)`                                                                    | Splits identifiers and phrases: `"XMLHttpRequest"` → `["XML", "Http", "Request"]` |
| `camelCase`, `pascalCase`, `snakeCase`, `kebabCase`, `constantCase`, `sentenceCase` | Case conversion via `toWords`                                                     |
| `titleCase(value, locale?)`                                                         | Capitalises each word in prose, keeping punctuation                               |
| `truncate(value, maxLength, options?)`                                              | Shortens to `maxLength` characters including the ellipsis; never splits emoji     |
| `slugify(value, options?)`                                                          | URL-friendly slug; removes Latin diacritics, keeps other scripts                  |
| `escapeHtml(value)`                                                                 | Escapes `& < > " '` for HTML text and quoted attributes                           |
| `normalizeWhitespace(value)`                                                        | Collapses whitespace runs and trims                                               |
| `pluralize(count, forms, locale?)`                                                  | Picks a plural form with `Intl.PluralRules`                                       |
| `graphemes(value)`                                                                  | Splits into user-perceived characters                                             |

### Date: `javascript-utilities/date`

| Function                                   | Description                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `isValidDate(value)`                       | `true` for a `Date` holding a valid time                                    |
| `parseDate(input)`                         | `Date`, timestamp or string → new `Date`, or `null`                         |
| `formatDate(input, options?)`              | `Intl.DateTimeFormat` with a `locale` option; defaults to medium date style |
| `formatRelativeTime(input, options?)`      | "3 hours ago", "in 2 days", "yesterday"                                     |
| `toISODate(input, { timeZone? })`          | Calendar date as `YYYY-MM-DD` in a time zone                                |
| `addDays(input, days)`                     | Adds local calendar days, keeping the clock time                            |
| `startOfDay(input)`                        | Local midnight                                                              |
| `isSameDay(a, b)`                          | Same local calendar day                                                     |
| `differenceInCalendarDays(later, earlier)` | Whole local calendar days between dates                                     |

### Array: `javascript-utilities/array`

`chunk`, `unique`, `uniqueBy`, `groupBy`, `partition`, `sortBy` (stable, natural string order,
nullish last), `range`, `compact` (removes only `null`/`undefined`), `intersection`,
`difference`, `shuffle`.

### Object: `javascript-utilities/object`

`isPlainObject`, `pick`, `omit`, `deepMerge` (immutable, prototype-pollution safe), `get` (by
path such as `"a.b[0].c"`), `mapValues`, `deepEqual` (handles Dates, RegExps, Maps, Sets and
circular references).

### Number: `javascript-utilities/number`

`clamp`, `roundTo` (half away from zero, `roundTo(1.005, 2) === 1.01`), `inRange`, `sum`,
`average`, `formatNumber`, `formatPercent`, `formatCompact` ("1.2K"), `formatBytes` ("1.5 kB" or
"1.5 KiB").

### Currency: `javascript-utilities/currency`

| Function                                           | Description                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `formatCurrency(amount, currency, options?)`       | Locale-aware money formatting                                       |
| `getCurrencyFractionDigits(currency)`              | 2 for USD, 0 for JPY, 3 for KWD                                     |
| `toMinorUnits(amount, currency)`                   | 19.99 USD → 1999                                                    |
| `fromMinorUnits(minorUnits, currency)`             | 1999 USD → 19.99                                                    |
| `formatMinorUnits(minorUnits, currency, options?)` | Formats integer minor units                                         |
| `allocateMinorUnits(total, ratios)`                | Splits money without losing a cent: 100 by [1, 1, 1] → [34, 33, 33] |

### Validation: `javascript-utilities/validation`

`isNonEmptyString`, `isEmail`, `isUrl` (absolute, allowed protocols), `isUuid` (RFC 9562,
optional version), `isHexColor`, `isNumeric`, `isIsoDateString` (real calendar dates),
`isE164Phone`. All are type guards.

### URL: `javascript-utilities/url`

`stringifyQuery`, `parseQuery`, `updateQuery` (set or remove parameters on absolute or relative
URLs), `removeQuery` (by name or predicate, for example tracking parameters), `joinPath`,
`buildUrl`, `isAbsoluteUrl`, `getHostname`.

### Async: `javascript-utilities/async`

`sleep` (abortable), `withTimeout` (rejects with `TimeoutError`), `retry` (exponential backoff,
`shouldRetry`, abortable), `debounce` (with `cancel`, `flush`, `pending`), `throttle` (leading
and trailing), `mapWithConcurrency` (ordered results, limited parallelism).

## Behaviour and limitations

### Locales

- Formatting uses the runtime's `Intl` data. Output can differ slightly between runtimes and
  versions (for example a narrow no-break space in some locales, or a currency symbol such as
  `$` versus `US$`). Do not compare formatted strings across environments.
- When `locale` is omitted, the runtime's default locale is used: the browser's language or the
  server's settings. Pass a locale explicitly for consistent output, especially on servers.
- `titleCase` does not apply style-guide rules (minor words such as "of" stay capitalised) and
  lower-cases acronyms. `toWords`, the case converters and `slugify` target identifiers and
  Latin-script text; other scripts are kept but not transliterated.

### Time zones

- `Date` objects are instants. "Which calendar day" depends on the time zone, so `toISODate`
  and `formatDate` accept a `timeZone` option. Without one they use the runtime's local zone.
- `addDays`, `startOfDay`, `isSameDay` and `differenceInCalendarDays` work in the **local** time
  zone. `addDays` keeps the local clock time, so across a daylight saving change a "day" can be
  23 or 25 hours.
- When parsing strings, ISO date-only values (`"2026-03-01"`) are treated as UTC midnight, while
  date-time values without an offset (`"2026-03-01T09:00"`) are local time. This follows the
  JavaScript specification. Prefer strings with `Z` or an explicit offset.
- `formatRelativeTime` approximates months as 30 days and years as 365 days.

### Numeric precision

- JavaScript numbers are binary floating point. `roundTo` avoids common surprises such as
  `1.005` rounding down, but its result is still a float.
- For money, store and add **integer minor units** (cents) with `toMinorUnits`, split with
  `allocateMinorUnits`, and convert back only for display. Amounts beyond
  `Number.MAX_SAFE_INTEGER` minor units need `BigInt` or a decimal library.

### Invalid input

- Functions that need a finite number throw a `RangeError` for `NaN` and `Infinity`.
- Date functions throw a `RangeError` for invalid dates; `parseDate` returns `null` instead.
- Validators never throw: non-string input returns `false`.
- Validators check format, not reality. An address that passes `isEmail` may not exist, and a
  number that passes `isE164Phone` may not be assigned. Always validate again on the server.
- `escapeHtml` is for HTML text and quoted attribute values only. It is not a sanitiser for
  untrusted HTML, URLs, CSS or script contexts.
- `shuffle` uses `Math.random` by default, which is not suitable for security-sensitive use.

## Runtime support

ES2022 output for current browsers and Node.js 20 or later. `truncate` and `graphemes` use
`Intl.Segmenter` when available and fall back to code points otherwise. Developing this
repository requires Node.js 22.12 or later (see `.nvmrc`).

## Development

```bash
npm install
npm test             # run the tests
npm run coverage     # tests with coverage thresholds
npm run check        # typecheck, lint, format check, coverage, build
npm run example      # build and run examples/usage.js
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
