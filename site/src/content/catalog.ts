export const catalog = [
  { id: 'patrula', shortName: 'XXXL', name: 'Patrula Cățelușilor Uriaș XXXL', price: 1000, dimensions: { length: 8, width: 5, height: 6 }, ages: { min: 3, max: 14 }, description: 'Un gonflabil tematic de dimensiuni generoase.' },
  { id: 'race', shortName: 'Race', name: 'Tobogan Race 3 în 1', price: 600, dimensions: { length: 5.3, width: 2.5, height: 2.9 }, ages: { min: 1, max: 8 }, description: 'Trei culoare colorate, într-un singur gonflabil.' },
  { id: 'casa', shortName: 'Casă', name: 'Tobogan 2 în 1 Casă', price: 550, dimensions: { length: 4.7, width: 2.6, height: 2.4 }, ages: { min: 1, max: 8 }, description: 'Două rampe și un spațiu de joacă, într-o structură colorată.' },
  { id: 'tren', shortName: 'Tren', name: 'Tobogan Tren', price: 550, dimensions: { length: 4.35, width: 2.45, height: 2 }, ages: { min: 1, max: 7 }, description: 'Un gonflabil cu formă de tren și rampă laterală.' },
  { id: 'unicorn', shortName: 'Unicorn', name: 'Tobogan Unicorn', price: 500, dimensions: { length: 3.45, width: 3, height: 2.1 }, ages: { min: 1, max: 7 }, description: 'O combinație de roz, galben și albastru, cu tematică unicorn.' },
  { id: 'castel', shortName: 'Castel', name: 'Tobogan Castel', price: 450, dimensions: { length: 3.3, width: 2.45, height: 2.15 }, ages: { min: 1, max: 7 }, description: 'Turnuri roșii, rampă albastră și o intrare rotunjită.' },
  { id: 'mini-monstru', shortName: 'Mini-Monstru', name: 'Tobogan Mini-Monstru', price: 200, dimensions: { length: 2.5, width: 1.8, height: 1.75 }, ages: { min: 1, max: 5 }, description: 'Un model ilustrat cu personaje și o rampă mică.' },
] as const;

export type Product = (typeof catalog)[number];
export type ProductId = Product['id'];
export const defaultProduct: ProductId = 'casa';
export const priceDisclaimer = 'Durata închirierii, transportul și serviciile incluse se confirmă în ofertă.';

export function findProduct(id: string | null): Product | undefined {
  return catalog.find((product) => product.id === id);
}

export function formatPrice(price: number): string {
  return `${new Intl.NumberFormat('ro-RO').format(price)} lei`;
}

export function formatDimension(metres: number): string {
  return `${new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(metres)} m`;
}

export function formatAges(ages: Product['ages']): string {
  return `${ages.min}–${ages.max} ani`;
}
