import { describe, expect, it } from 'vitest';
import {
  camelCase,
  capitalize,
  constantCase,
  escapeHtml,
  graphemes,
  kebabCase,
  normalizeWhitespace,
  pascalCase,
  pluralize,
  sentenceCase,
  slugify,
  snakeCase,
  titleCase,
  toWords,
  truncate,
} from './string.js';

describe('toWords', () => {
  it.each([
    ['helloWorld', ['hello', 'World']],
    ['XMLHttpRequest', ['XML', 'Http', 'Request']],
    ['snake_case-and kebab', ['snake', 'case', 'and', 'kebab']],
    ['version2Beta', ['version', '2', 'Beta']],
    ["don't stop", ['dont', 'stop']],
    ['ÉcoleNormale', ['École', 'Normale']],
    ['  ', []],
  ])('splits %j', (input, expected) => {
    expect(toWords(input)).toEqual(expected);
  });
});

describe('case conversion', () => {
  const input = 'Hello world-of XMLParsers';
  it('converts between common cases', () => {
    expect(camelCase(input)).toBe('helloWorldOfXmlParsers');
    expect(pascalCase(input)).toBe('HelloWorldOfXmlParsers');
    expect(snakeCase(input)).toBe('hello_world_of_xml_parsers');
    expect(kebabCase(input)).toBe('hello-world-of-xml-parsers');
    expect(constantCase(input)).toBe('HELLO_WORLD_OF_XML_PARSERS');
    expect(sentenceCase('helloWorldAgain')).toBe('Hello world again');
  });

  it('returns an empty string for input without words', () => {
    expect(camelCase('--')).toBe('');
    expect(sentenceCase('')).toBe('');
  });

  it('capitalises the first character only', () => {
    expect(capitalize('élan vital')).toBe('Élan vital');
    expect(capitalize('')).toBe('');
    expect(capitalize('istanbul', 'tr')).toBe('İstanbul');
  });

  it('title-cases prose while keeping punctuation', () => {
    expect(titleCase('the QUICK brown-fox, again!')).toBe('The Quick Brown-Fox, Again!');
    expect(titleCase("it's 3 o'clock")).toBe("It's 3 O'clock");
  });
});

describe('truncate', () => {
  it('leaves short strings unchanged', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('includes the ellipsis in the maximum length', () => {
    expect(truncate('Hello world', 8)).toBe('Hello w…');
    expect(truncate('Hello world', 8, { ellipsis: '...' })).toBe('Hello...');
  });

  it('can cut at a word boundary', () => {
    expect(truncate('The quick brown fox', 12, { wordBoundary: true })).toBe('The quick…');
    expect(truncate('The quick brown fox', 11, { wordBoundary: true })).toBe('The quick…');
    expect(truncate('Supercalifragilistic', 8, { wordBoundary: true })).toBe('Superca…');
  });

  it('never splits emoji or combined characters', () => {
    const family = '👨‍👩‍👧';
    expect(truncate(`${family}${family}${family}`, 2)).toBe(`${family}…`);
    expect(graphemes('éa')).toHaveLength(2);
  });

  it('handles very small limits', () => {
    expect(truncate('Hello', 1)).toBe('…');
    expect(truncate('Hello', 0)).toBe('');
    expect(truncate('Hello', 2, { ellipsis: '...' })).toBe('..');
  });

  it('rejects invalid lengths', () => {
    expect(() => truncate('Hello', -1)).toThrow(RangeError);
    expect(() => truncate('Hello', 2.5)).toThrow(RangeError);
  });
});

describe('slugify', () => {
  it('creates URL-friendly slugs', () => {
    expect(slugify('Crème Brûlée & Co.')).toBe('creme-brulee-co');
    expect(slugify("  What's new in 2026?  ")).toBe('whats-new-in-2026');
    expect(slugify('Hello World', { separator: '_', lowercase: false })).toBe('Hello_World');
  });

  it('keeps letters from scripts without Latin diacritics', () => {
    expect(slugify('東京 タワー')).toBe('東京-タワー');
    expect(slugify('नमस्ते दुनिया')).toBe('नमस्ते-दुनिया');
  });

  it('supports separators that are special in regular expressions', () => {
    expect(slugify('a b c', { separator: '.' })).toBe('a.b.c');
    expect(slugify('!!!')).toBe('');
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML special characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>Tom & Jerry</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;Tom &amp; Jerry&lt;/a&gt;',
    );
  });
});

describe('normalizeWhitespace', () => {
  it('collapses whitespace runs and trims', () => {
    expect(normalizeWhitespace('  a \n\t b   c ')).toBe('a b c');
  });
});

describe('pluralize', () => {
  it('uses locale plural rules', () => {
    expect(pluralize(1, { one: 'file', other: 'files' })).toBe('file');
    expect(pluralize(0, { one: 'file', other: 'files' })).toBe('files');
    const polish = { one: 'plik', few: 'pliki', many: 'plików', other: 'pliku' };
    expect(pluralize(2, polish, 'pl')).toBe('pliki');
    expect(pluralize(5, polish, 'pl')).toBe('plików');
  });

  it('falls back to "other" for missing forms', () => {
    expect(pluralize(2, { other: 'items' }, 'pl')).toBe('items');
  });
});
