export const catalog = [
  { id: 'patrula', shortName: 'XXXL', name: 'Patrula Cățelușilor XXXL', price: 1000, mediaId: 'patrula', description: 'Un model tematic, documentat și în fotografii din locație.' },
  { id: 'race', shortName: 'Race', name: '3-1 Race', price: 600, mediaId: 'race', description: 'Trei culoare colorate, într-un singur gonflabil.' },
  { id: 'casa', shortName: 'Casă', name: '2 în 1 Casă', price: 550, mediaId: 'casa', description: 'Două rampe și un spațiu de joacă, într-o structură colorată.' },
  { id: 'unicorn', shortName: 'Unicorn', name: 'Unicorn', price: 500, mediaId: 'unicorn', description: 'O combinație de roz, galben și albastru, cu tematică unicorn.' },
  { id: 'tren', shortName: 'Tren', name: 'Tren', price: 550, mediaId: 'tren', description: 'Un gonflabil cu formă de tren și rampă laterală.' },
  { id: 'castel', shortName: 'Castel', name: 'Castel', price: 450, mediaId: 'castel', description: 'Turnuri roșii, rampă albastră și o intrare rotunjită.' },
  { id: 'mini-monstru', shortName: 'Mini-Monstru', name: 'Mini-Monstru', price: 200, mediaId: 'mini-monstru', description: 'Un model ilustrat cu personaje și o rampă mică.' },
] as const;

export type Product = (typeof catalog)[number];
export type ProductId = Product['id'];
export const defaultProduct: ProductId = 'casa';
export const priceDisclaimer = 'Tarif în material. Durata și serviciile incluse se confirmă în ofertă.';

export function findProduct(id: string | null): Product | undefined {
  return catalog.find((product) => product.id === id);
}

export function formatPrice(price: number): string {
  return `${new Intl.NumberFormat('ro-RO').format(price)} lei`;
}
