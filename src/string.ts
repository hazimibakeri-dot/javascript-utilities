import { assertInteger } from './internal.js';

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : undefined;

/**
 * Splits text into user-perceived characters (grapheme clusters), so emoji sequences and
 * accented letters are not cut in half. Falls back to code points without Intl.Segmenter.
 */
export function graphemes(value: string): string[] {
  return segmenter
    ? Array.from(segmenter.segment(value), (part) => part.segment)
    : Array.from(value);
}

/** Upper-cases the first character and leaves the rest unchanged. */
export function capitalize(value: string, locale?: string): string {
  const [first = '', ...rest] = value;
  return first.toLocaleUpperCase(locale) + rest.join('');
}

// Acronym followed by a word ("XMLHttp" -> "XML", "Http"), a word, an acronym, digits, or
// letters from scripts without case (for example Chinese or Arabic).
const WORD_PATTERN = /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+|\p{Lu}+|\p{N}+|\p{Lo}+/gu;

/** Splits identifiers and phrases into words: "XMLHttpRequest" -> ["XML", "Http", "Request"]. */
export function toWords(value: string): string[] {
  return value.replace(/['’]/g, '').match(WORD_PATTERN) ?? [];
}

const lower = (word: string) => word.toLowerCase();
const upperFirst = (word: string) => capitalize(word.toLowerCase());

/** "Hello world" -> "helloWorld" */
export function camelCase(value: string): string {
  return toWords(value)
    .map((word, index) => (index === 0 ? lower(word) : upperFirst(word)))
    .join('');
}

/** "hello world" -> "HelloWorld" */
export function pascalCase(value: string): string {
  return toWords(value).map(upperFirst).join('');
}

/** "Hello world" -> "hello_world" */
export function snakeCase(value: string): string {
  return toWords(value).map(lower).join('_');
}

/** "Hello world" -> "hello-world" */
export function kebabCase(value: string): string {
  return toWords(value).map(lower).join('-');
}

/** "Hello world" -> "HELLO_WORLD" */
export function constantCase(value: string): string {
  return toWords(value)
    .map((word) => word.toUpperCase())
    .join('_');
}

/** "helloWorld" -> "Hello world" */
export function sentenceCase(value: string): string {
  return capitalize(toWords(value).map(lower).join(' '));
}

/**
 * Capitalises the first letter of every word and lower-cases the rest, keeping punctuation:
 * "the QUICK brown-fox!" -> "The Quick Brown-Fox!". It does not apply style-guide rules for
 * minor words ("of", "and") and lower-cases acronyms ("NASA" -> "Nasa").
 */
export function titleCase(value: string, locale?: string): string {
  return value.replace(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’]*/gu, (word) =>
    capitalize(word.toLocaleLowerCase(locale), locale),
  );
}

export interface TruncateOptions {
  /** Appended when text is cut. Defaults to "…". Counts towards `maxLength`. */
  ellipsis?: string;
  /** Cut at the last whole word that fits instead of mid-word. */
  wordBoundary?: boolean;
}

/**
 * Shortens text to at most `maxLength` user-perceived characters, including the ellipsis.
 * @throws {RangeError} if `maxLength` is not a non-negative integer.
 */
export function truncate(value: string, maxLength: number, options: TruncateOptions = {}): string {
  assertInteger(maxLength, 'maxLength', 0);
  const { ellipsis = '…', wordBoundary = false } = options;
  const characters = graphemes(value);
  if (characters.length <= maxLength) return value;

  const ellipsisCharacters = graphemes(ellipsis);
  if (maxLength <= ellipsisCharacters.length) {
    return ellipsisCharacters.slice(0, maxLength).join('');
  }

  let cut = characters.slice(0, maxLength - ellipsisCharacters.length).join('');
  if (wordBoundary) {
    const nextIsSpace = /\s/.test(characters[maxLength - ellipsisCharacters.length] ?? '');
    const lastSpace = cut.search(/\s\S*$/);
    if (!nextIsSpace && lastSpace > 0) cut = cut.slice(0, lastSpace);
  }
  return cut.trimEnd() + ellipsis;
}

export interface SlugifyOptions {
  /** Defaults to "-". */
  separator?: string;
  /** Defaults to true. */
  lowercase?: boolean;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Converts text to a URL-friendly slug: "Crème Brûlée & Co." -> "creme-brulee-co".
 * Latin diacritics are removed; letters from other scripts are kept as they are.
 */
export function slugify(value: string, options: SlugifyOptions = {}): string {
  const { separator = '-', lowercase = true } = options;
  const edges = new RegExp(
    `^(?:${escapeRegExp(separator)})+|(?:${escapeRegExp(separator)})+$`,
    'g',
  );
  const slug = value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, separator)
    .replace(edges, '');
  return lowercase ? slug.toLowerCase() : slug;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes the five HTML special characters for safe insertion into HTML text or quoted
 * attribute values. It is not a sanitiser: do not use it for URLs, scripts or CSS.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

/** Collapses runs of whitespace (including newlines) to single spaces and trims the ends. */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/**
 * Picks the correct plural form for `count` using the locale's plural rules.
 * @example pluralize(1, { one: 'file', other: 'files' }) // "file"
 */
export function pluralize(count: number, forms: PluralForms, locale = 'en'): string {
  const rule = new Intl.PluralRules(locale).select(count);
  return forms[rule] ?? forms.other;
}
