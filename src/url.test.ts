import { describe, expect, it } from 'vitest';
import {
  buildUrl,
  getHostname,
  isAbsoluteUrl,
  joinPath,
  parseQuery,
  removeQuery,
  stringifyQuery,
  updateQuery,
} from './url.js';

describe('stringifyQuery and parseQuery', () => {
  it('serialises values, arrays and skips nullish values', () => {
    expect(
      stringifyQuery({
        q: 'red shoes',
        size: [40, 41],
        page: 2,
        sale: true,
        empty: null,
        none: undefined,
      }),
    ).toBe('q=red+shoes&size=40&size=41&page=2&sale=true');
  });

  it('encodes reserved characters', () => {
    expect(stringifyQuery({ 'a&b': 'c=d' })).toBe('a%26b=c%3Dd');
  });

  it('parses query strings, search parts and full URLs', () => {
    expect(parseQuery('?q=red+shoes&size=40&size=41')).toEqual({
      q: 'red shoes',
      size: ['40', '41'],
    });
    expect(parseQuery('https://example.com/p?a=1&a=2&a=3#top')).toEqual({ a: ['1', '2', '3'] });
    expect(parseQuery('x=%F0%9F%99%82')).toEqual({ x: '🙂' });
    expect(parseQuery('')).toEqual({});
  });

  it('stores dangerous keys safely', () => {
    const parsed = parseQuery('__proto__=1&constructor=2');
    expect(parsed.__proto__).toBe('1');
    expect(({} as Record<string, unknown>)['1']).toBeUndefined();
  });
});

describe('updateQuery and removeQuery', () => {
  it('replaces, adds and removes parameters on absolute URLs', () => {
    expect(
      updateQuery('https://example.com/search?q=old&page=2#results', {
        q: 'new',
        page: null,
        tag: ['a', 'b'],
      }),
    ).toBe('https://example.com/search?q=new&tag=a&tag=b#results');
  });

  it('works with relative URLs', () => {
    expect(updateQuery('/search?q=old', { q: 'new' })).toBe('/search?q=new');
    expect(updateQuery('search', { page: 1 })).toBe('search?page=1');
  });

  it('removes parameters by name or predicate', () => {
    const url = 'https://example.com/?id=7&utm_source=news&utm_medium=email&ref=x';
    expect(removeQuery(url, (key) => key.startsWith('utm_'))).toBe(
      'https://example.com/?id=7&ref=x',
    );
    expect(removeQuery('/p?id=7&ref=x', ['ref'])).toBe('/p?id=7');
  });
});

describe('joinPath', () => {
  it.each([
    [['https://api.example.com/', '/v1/', 'users'], 'https://api.example.com/v1/users'],
    [['/a/', '/b', 'c/'], '/a/b/c/'],
    [['a', '', 'b'], 'a/b'],
    [['/', '/'], '/'],
    [[], ''],
  ])('joins %j', (segments, expected) => {
    expect(joinPath(...segments)).toBe(expected);
  });
});

describe('buildUrl', () => {
  it('combines base, path, query and hash', () => {
    expect(
      buildUrl('https://api.example.com', {
        path: ['v1', 'users'],
        query: { page: 2, q: 'a b' },
        hash: 'top',
      }),
    ).toBe('https://api.example.com/v1/users?page=2&q=a+b#top');
  });

  it('keeps existing query parameters and supports relative bases', () => {
    expect(buildUrl('https://example.com/list?sort=asc', { query: { page: 3 } })).toBe(
      'https://example.com/list?sort=asc&page=3',
    );
    expect(buildUrl('/api', { path: 'items' })).toBe('/api/items');
  });
});

describe('isAbsoluteUrl and getHostname', () => {
  it('detects URL schemes', () => {
    expect(isAbsoluteUrl('https://example.com')).toBe(true);
    expect(isAbsoluteUrl('mailto:a@example.com')).toBe(true);
    expect(isAbsoluteUrl('/path')).toBe(false);
    expect(isAbsoluteUrl('//cdn.example.com')).toBe(false);
  });

  it('extracts hostnames', () => {
    expect(getHostname('https://www.example.com:8080/path')).toBe('www.example.com');
    expect(getHostname('/relative')).toBeNull();
    expect(getHostname('mailto:a@example.com')).toBeNull();
  });
});
