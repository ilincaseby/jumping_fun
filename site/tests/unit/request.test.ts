import assert from 'node:assert/strict';
import test from 'node:test';
import { business } from '../../src/config/business';
import { localDate, requestMessage, validateRequest, type RequestValues } from '../../src/lib/request';

const future = new Date();
future.setFullYear(future.getFullYear() + 1);
const values: RequestValues = { model: 'casa', date: localDate(future), locality: 'București', details: '' };

test('valid optional fields remain optional', () => {
  assert.deepEqual(validateRequest(values), {});
  assert.deepEqual(validateRequest({ ...values, model: '' }), {});
});

test('missing values, unknown products, past dates and invalid calendar dates have explicit errors', () => {
  assert(validateRequest({ ...values, model: 'invented' }).model);
  assert(validateRequest({ ...values, locality: '   ' }).locality);
  assert(validateRequest({ ...values, date: '2020-01-01' }, '2026-10-28').date);
  assert(validateRequest({ ...values, date: '2027-02-30' }, '2026-10-28').date);
  assert(validateRequest({ ...values, date: '' }).date);
  assert(validateRequest({ ...values, details: 'a'.repeat(1501) }).details);
});

test('message uses the single business config and never claims delivery', () => {
  const text = requestMessage({ ...business, brand: 'TEST — alt brand' }, values);
  assert(text.includes('TEST — alt brand'));
  assert(text.includes('2 în 1 Casă'));
  assert(text.includes('București'));
  assert(!text.includes('Trimis cu succes'));
  assert(!text.includes('example.com'));
});

test('invalid input cannot generate a success-shaped message', () => {
  assert.throws(() => requestMessage(business, { ...values, date: '' }), /invalide/);
});

test('worst-case text is preserved as text, not silently discarded', () => {
  const input = { ...values, details: '<img src=x onerror=alert(1)> Șț 日本語 🙂' };
  assert(requestMessage(business, input).includes(input.details));
});
