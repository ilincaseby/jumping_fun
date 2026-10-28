import assert from 'node:assert/strict';
import test from 'node:test';
import { business } from '../../src/config/business';
import { businessStructuredData, contactLinks } from '../../src/lib/business';
import { publicationIssues } from '../../src/lib/publication';
import { publicationMediaRights } from '../../src/content/publication-media';
import { catalog, findProduct, formatPrice, formatDimension, formatAges } from '../../src/content/catalog';
import { gallerySources } from '../../src/content/gallery-sources';

test('confirmed phone and WhatsApp work without inventing legal data or email', () => {
  assert.deepEqual(contactLinks(business), { phone: 'tel:+40767850085', whatsapp: 'https://wa.me/40767850085', email: null });
  assert.equal(businessStructuredData(business), null);
});

test('release still rejects missing legal data and the missing domain', () => {
  const issues = publicationIssues(business, publicationMediaRights);
  assert(issues.some((issue) => issue.includes('CUI')));
  assert(issues.some((issue) => issue.includes('HTTPS')));
  assert(!issues.some((issue) => issue.includes('Media ')));
  assert(publicationIssues(business, [{ id: 'unapproved', displayApproved: true, thirdPartyCleared: false }]).some((issue) => issue.includes('Media unapproved:')));
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

test('all supplied names, ordered dimensions and age ranges match the confirmation', () => {
  assert.deepEqual(catalog.map((p) => [p.name, p.dimensions.length, p.dimensions.width, p.dimensions.height, p.ages.min, p.ages.max]), [
    ['Patrula Cățelușilor Uriaș XXXL', 8, 5, 6, 3, 14],
    ['Tobogan Race 3 în 1', 5.3, 2.5, 2.9, 1, 8],
    ['Tobogan 2 în 1 Casă', 4.7, 2.6, 2.4, 1, 8],
    ['Tobogan Tren', 4.35, 2.45, 2, 1, 7],
    ['Tobogan Unicorn', 3.45, 3, 2.1, 1, 7],
    ['Tobogan Castel', 3.3, 2.45, 2.15, 1, 7],
    ['Tobogan Mini-Monstru', 2.5, 1.8, 1.75, 1, 5],
  ]);
  assert.equal(formatDimension(8), '8,00 m');
  assert.equal(formatDimension(2.15), '2,15 m');
  assert.equal(formatAges(catalog[0].ages), '3–14 ani');
});

test('new photo permissions are explicit and unknown contacts do not activate', () => {
  assert.equal(gallerySources.length, 24);
  assert.equal(new Set(gallerySources.map((photo) => photo.file)).size, 24);
  for (const photo of gallerySources) assert(publicationMediaRights.some((item) => item.id === photo.id && item.displayApproved && item.thirdPartyCleared));
  assert.deepEqual(contactLinks({ ...business, contact: { ...business.contact, verified: false } }), { phone: null, whatsapp: null, email: null });
  assert.throws(() => contactLinks({ ...business, contact: { ...business.contact, phone: 'invalid' } }), /invalid/);
});
