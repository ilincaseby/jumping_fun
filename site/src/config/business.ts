export interface BusinessConfig {
  readonly status: 'demo' | 'verified';
  readonly brand: string;
  readonly legal: {
    readonly name: string | null;
    readonly taxId: string | null;
    readonly registrationNumber: string | null;
    readonly registeredAddress: string | null;
    readonly correspondenceAddress: string | null;
  };
  readonly contact: {
    readonly phone: string | null;
    readonly whatsapp: string | null;
    readonly email: string | null;
    readonly verified: boolean;
  };
  readonly social: ReadonlyArray<{ readonly name: string; readonly url: string | null }>;
  readonly siteUrl: string | null;
  readonly serviceArea: readonly string[];
  readonly openingHours: string | null;
  readonly commercialTermsVerified: boolean;
  readonly missingFields: readonly string[];
}

const phone = '+40 767 850 085';

export const business: BusinessConfig = {
  status: 'verified',
  brand: 'Jumping Fun',
  legal: {
    name: null,
    taxId: null,
    registrationNumber: null,
    registeredAddress: null,
    correspondenceAddress: null,
  },
  contact: {
    phone,
    whatsapp: phone,
    email: null,
    verified: true,
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
    'Domeniu',
    'Durata tarifelor și serviciile incluse',
    'Condiții de transport, montaj și utilizare',
  ],
};
