
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  toNumber,
  toIsoTimestamp
} = require('../src/urjaClient');

test('converts numeric strings to numbers', () => {
  assert.equal(toNumber('124.50'), 124.5);
  assert.equal(toNumber('52370'), 52370);
});

test('returns null for missing or invalid numeric values', () => {
  assert.equal(toNumber(null), null);
  assert.equal(toNumber(undefined), null);
  assert.equal(toNumber(''), null);
  assert.equal(toNumber('not-a-number'), null);
  assert.equal(toNumber(Infinity), null);
});

test('normalizes portal timestamps deterministically', () => {
  assert.equal(
    toIsoTimestamp('23/06/2026 23:30'),
    '2026-06-23T23:30:00.000Z'
  );
});

test('accepts seconds in portal timestamps', () => {
  assert.equal(
    toIsoTimestamp('23/06/2026 23:30:15'),
    '2026-06-23T23:30:15.000Z'
  );
});

test('preserves valid ISO timestamps', () => {
  assert.equal(
    toIsoTimestamp('2026-06-23T23:30:00.000Z'),
    '2026-06-23T23:30:00.000Z'
  );
});

test('rejects malformed and impossible dates', () => {
  assert.equal(toIsoTimestamp('invalid-date'), null);
  assert.equal(toIsoTimestamp('31/02/2026 12:00'), null);
  assert.equal(toIsoTimestamp(''), null);
  assert.equal(toIsoTimestamp(null), null);
});
