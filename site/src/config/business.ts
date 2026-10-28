export interface BusinessConfig {
  readonly status: 'demo' | 'verified';
  readonly brand: string;
  readonly legal: {
    readonly name: string;
    readonly taxId: string | null;
    readonly registrationNumber: string | null;
    readonly registeredAddress: string | null;
    readonly correspondenceAddress: string | null;
  };
  readonly contact: {
    readonly phone: string | null;
    readonly whatsapp: string | null;
    readonly email: string;
    readonly verified: boolean;
  };
  readonly social: ReadonlyArray<{ readonly name: string; readonly url: string | null }>;
  readonly siteUrl: string | null;
  readonly serviceArea: readonly string[];
  readonly openingHours: string | null;
  readonly commercialTermsVerified: boolean;
  readonly missingFields: readonly string[];
}

export const business: BusinessConfig = {
  status: 'demo',
  brand: 'Jumping Fun',
  legal: {
    name: 'DEMO — firmă de completat',
    taxId: null,
    registrationNumber: null,
    registeredAddress: null,
    correspondenceAddress: null,
  },
  contact: {
    phone: null,
    whatsapp: null,
    email: 'contact@example.com',
    verified: false,
  },
  social: [
    { name: 'Instagram', url: 'https://www.instagram.com/jumpingfuntobogane/' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@jumpingfuntobogane' },
    { name: 'Facebook', url: 'https://www.facebook.com/people/Jumping-Fun-Inchiriere-Tobogane-Gonflabile-Bucuresti-Ilfov/61574460459048/' },
  ],
  siteUrl: null,
  serviceArea: ['București', 'Ilfov'],
  openingHours: null,
  commercialTermsVerified: false,
  missingFields: [
    'Date juridice',
    'Destinații de contact verificate',
    'Domeniu',
    'Durata tarifelor și serviciile incluse',
    'Condiții de transport, montaj și utilizare',
    'Verificarea drepturilor terțe din imagini',
  ],
};
