import type { ImageMetadata } from 'astro';
import patrula from '../assets/products/patrula.png';
import race from '../assets/products/race.png';
import casa from '../assets/products/casa.png';
import unicorn from '../assets/products/unicorn.png';
import tren from '../assets/products/tren.png';
import castel from '../assets/products/castel.png';
import miniMonstru from '../assets/products/mini-monstru.png';
import lateral from '../assets/gallery/lateral.png';
import detaliu from '../assets/gallery/detaliu.png';
import type { ProductId } from './catalog';
import { publicationMediaRights } from './publication-media';

export interface MediaRecord {
  readonly id: string;
  readonly image: ImageMetadata;
  readonly alt: string;
  readonly source: string;
  readonly permission: 'owner-supplied' | 'original';
  readonly displayApproved: boolean;
  readonly thirdPartyCleared: boolean;
}

const supplied = (id: string, image: ImageMetadata, alt: string, source: string): MediaRecord => {
  const rights = publicationMediaRights.find((item) => item.id === id);
  if (!rights) throw new Error(`Lipsesc drepturile media pentru ${id}.`);
  return { ...rights, image, alt, source, permission: 'owner-supplied' };
};

export const productMedia: Record<ProductId, MediaRecord> = {
  patrula: supplied('patrula', patrula, 'Gonflabil tematic roșu, albastru și galben, fotografiat frontal într-o sală.', 'photos/image.png'),
  race: supplied('race', race, 'Gonflabil Race cu trei culoare, pe fond alb.', 'docs/media/prepared-v02/race.png'),
  casa: supplied('casa', casa, 'Gonflabil Casă cu două rampe albastre și margini galbene, văzut oblic.', 'docs/media/prepared-v02/casa.png'),
  unicorn: supplied('unicorn', unicorn, 'Gonflabil Unicorn roz, galben și albastru; cotele din fișa furnizată sunt încă vizibile.', 'docs/media/prepared-v02/unicorn.png'),
  tren: supplied('tren', tren, 'Gonflabil în formă de tren, cu rampă laterală și cote din materialul furnizat.', 'docs/media/prepared-v02/tren.png'),
  castel: supplied('castel', castel, 'Gonflabil Castel cu turnuri roșii și rampă albastră, cu cote înscrise în fișă.', 'docs/media/prepared-v02/castel.png'),
  'mini-monstru': supplied('mini-monstru', miniMonstru, 'Gonflabil Mini-Monstru, cu rampă portocalie și cote din fișa furnizată.', 'docs/media/prepared-v02/mini-monstru.png'),
};

export const galleryMedia = [
  { ...productMedia.patrula, caption: 'Din față, cu toate culorile.' },
  { ...supplied('lateral', lateral, 'Același gonflabil tematic, fotografiat oblic în interior.', 'photos/image copy 2.png'), caption: 'Același model, alt unghi.' },
  { ...supplied('detaliu', detaliu, 'Detaliu al intrării și al materialului gonflabilului.', 'photos/image copy.png'), caption: 'Mai aproape de detalii.' },
] as const;

export const publicationMedia = [...Object.values(productMedia), ...galleryMedia.slice(1)];
