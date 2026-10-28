import assert from 'node:assert/strict';
import test from 'node:test';
import { business } from '../../src/config/business';
import { businessStructuredData, contactLinks } from '../../src/lib/business';
import { publicationIssues } from '../../src/lib/publication';
import { publicationMediaRights } from '../../src/content/publication-media';
import { catalog, findProduct, formatPrice } from '../../src/content/catalog';

test('demo contacts are inactive and no real-business structured data is emitted', () => {
  assert.deepEqual(contactLinks(business), { phone: null, whatsapp: null, email: null });
  assert.equal(businessStructuredData(business), null);
});

test('release rejects demo, missing legal data and every uncleared media asset', () => {
  const issues = publicationIssues(business, publicationMediaRights);
  assert(issues.some((issue) => issue.includes('demo')));
  assert(issues.some((issue) => issue.includes('CUI')));
  assert(issues.some((issue) => issue.includes('HTTPS')));
  for (const media of publicationMediaRights) assert(issues.some((issue) => issue.includes(`Media ${media.id}:`)));
});

test('setting verified alone cannot publish placeholders or create structured data', () => {
  const incomplete = { ...business, status: 'verified' as const };
  assert(publicationIssues(incomplete, publicationMediaRights).length > 0);
  assert.equal(businessStructuredData(incomplete), null);
});

test('catalog contains exactly the seven documented prices without invented periods', () => {
  assert.equal(catalog.length, 7);
  assert.equal(new Set(catalog.map((p) => p.id)).size, 7);
  assert.equal(findProduct('casa')?.price, 550);
  assert.equal(findProduct('unknown'), undefined);
  assert.match(formatPrice(1000), /1[.\s]000 lei/);
  assert.deepEqual(catalog.map((p) => p.price).sort((a, b) => a - b), [200, 450, 500, 550, 550, 600, 1000]);
});
