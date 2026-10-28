import type { BusinessConfig } from '../config/business';
import { normalizePhone, publicationIssues } from './publication';

export function contactLinks(config: BusinessConfig) {
  const enabled = config.status === 'verified' && config.contact.verified;
  const phone = normalizePhone(config.contact.phone);
  const whatsapp = normalizePhone(config.contact.whatsapp);
  if (enabled && ((config.contact.phone && !phone) || (config.contact.whatsapp && !whatsapp))) {
    throw new Error('Configurația conține un număr de contact invalid.');
  }
  return {
    phone: enabled && phone ? `tel:${phone}` : null,
    whatsapp: enabled && whatsapp ? `https://wa.me/${whatsapp.slice(1)}` : null,
    email: enabled && config.contact.email && !config.contact.email.endsWith('@example.com') ? `mailto:${config.contact.email}` : null,
  };
}

export function businessStructuredData(config: BusinessConfig) {
  if (publicationIssues(config, []).length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config.brand,
    legalName: config.legal.name,
    url: config.siteUrl,
    areaServed: config.serviceArea,
    ...(config.contact.phone ? { telephone: config.contact.phone } : {}),
    ...(config.legal.registeredAddress ? { address: config.legal.registeredAddress } : {}),
  };
}
