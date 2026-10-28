import type { BusinessConfig } from '../config/business';

interface PublicationMedia {
  readonly id: string;
  readonly displayApproved: boolean;
  readonly thirdPartyCleared: boolean;
}

export function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const phone = value.replace(/[\s()-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function publicationIssues(config: BusinessConfig, media: readonly PublicationMedia[]): string[] {
  const issues: string[] = [];
  if (config.status !== 'verified') issues.push('Configurația este încă în modul demo.');
  if (!config.legal.name?.trim() || config.legal.name.includes('DEMO')) issues.push('Denumirea juridică nu este verificată.');
  for (const [label, value] of Object.entries({
    CUI: config.legal.taxId,
    'Registrul comerțului': config.legal.registrationNumber,
    Sediu: config.legal.registeredAddress,
    'Adresă corespondență': config.legal.correspondenceAddress,
    Telefon: config.contact.phone,
  })) if (!value?.trim()) issues.push(`${label}: valoare obligatorie lipsă.`);
  if (!config.contact.verified) issues.push('Contactele nu sunt verificate.');
  if (!normalizePhone(config.contact.phone)) issues.push('Telefonul trebuie să fie un număr internațional valid.');
  if (!normalizePhone(config.contact.whatsapp)) issues.push('Numărul WhatsApp trebuie să fie valid.');
  if (config.contact.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contact.email) || config.contact.email.endsWith('@example.com'))) {
    issues.push('Adresa de e-mail este demonstrativă sau invalidă.');
  }
  if (!config.siteUrl || !URL.canParse(config.siteUrl) || new URL(config.siteUrl).protocol !== 'https:' ||
      /(^|\.)example\.(com|org|net)$/.test(new URL(config.siteUrl).hostname)) {
    issues.push('Este necesar un URL HTTPS de producție verificat.');
  }
  if (!config.serviceArea.length) issues.push('Zona deservită lipsește.');
  if (!config.commercialTermsVerified) issues.push('Tarifele și condițiile comerciale nu sunt verificate.');
  for (const field of config.missingFields) issues.push(`De confirmat: ${field}.`);
  for (const item of media) {
    if (!item.displayApproved || !item.thirdPartyCleared) issues.push(`Media ${item.id}: drepturi incomplete.`);
  }
  return issues;
}
