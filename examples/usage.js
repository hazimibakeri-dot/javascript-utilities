// Runnable tour of the library. It imports through the package's own "exports" map, exactly
// as a consumer would, so it also works as a smoke test of the built output.
// Run with: npm run example
import assert from 'node:assert/strict';
import {
  buildUrl,
  chunk,
  deepMerge,
  formatBytes,
  formatDate,
  formatRelativeTime,
  groupBy,
  isEmail,
  kebabCase,
  retry,
  roundTo,
  slugify,
  truncate,
} from 'javascript-utilities';
import { allocateMinorUnits, formatMinorUnits, toMinorUnits } from 'javascript-utilities/currency';

const show = (label, value) => console.log(`${label.padEnd(22)} ${JSON.stringify(value)}`);

// Strings
show('slugify', slugify('Crème Brûlée & Co.'));
show('kebabCase', kebabCase('XMLHttpRequest handler'));
show('truncate', truncate('The quick brown fox jumps', 15, { wordBoundary: true }));

// Dates (explicit locale and time zone give the same output everywhere)
const launch = '2026-03-01T23:30:00Z';
show('formatDate (Tokyo)', formatDate(launch, { locale: 'en-GB', timeZone: 'Asia/Tokyo' }));
show(
  'formatRelativeTime',
  formatRelativeTime(launch, { now: '2026-03-04T23:30:00Z', locale: 'en' }),
);

// Arrays and objects
show('chunk', chunk([1, 2, 3, 4, 5], 2));
show(
  'groupBy',
  groupBy(['apple', 'avocado', 'banana'], (word) => word[0]),
);
show('deepMerge', deepMerge({ theme: { color: 'blue', radius: 4 } }, { theme: { radius: 8 } }));

// Numbers and money: keep amounts as integer minor units
show('roundTo(1.005, 2)', roundTo(1.005, 2));
show('formatBytes', formatBytes(1_572_864, { binary: true, locale: 'en-US' }));
const totalCents = toMinorUnits(100, 'USD');
const shares = allocateMinorUnits(totalCents, [1, 1, 1]);
show(
  'split $100 three ways',
  shares.map((cents) => formatMinorUnits(cents, 'USD', { locale: 'en-US' })),
);

// Validation and URLs
show('isEmail', isEmail('name@example.com'));
show(
  'buildUrl',
  buildUrl('https://api.example.com', {
    path: ['v1', 'search'],
    query: { q: 'red shoes', page: 2 },
  }),
);

// Async: retry a flaky operation
let calls = 0;
const value = await retry(
  () => {
    calls += 1;
    if (calls < 3) throw new Error('temporary failure');
    return 'succeeded';
  },
  { delay: 10 },
);
show('retry', `${value} after ${calls} attempts`);

// Sanity checks so this file fails loudly if the build is broken.
assert.equal(slugify('Crème Brûlée & Co.'), 'creme-brulee-co');
assert.equal(roundTo(1.005, 2), 1.01);
assert.deepEqual(shares, [3334, 3333, 3333]);
assert.equal(
  shares.reduce((a, b) => a + b, 0),
  totalCents,
);
console.log('\nAll example checks passed.');
