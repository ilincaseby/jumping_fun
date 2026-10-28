import type { BusinessConfig } from '../config/business';
import { publicationIssues } from './publication';

export function contactLinks(config: BusinessConfig) {
  const enabled = config.status === 'verified' && config.contact.verified;
  return {
    phone: enabled && config.contact.phone ? `tel:${config.contact.phone.replace(/[^\d+]/g, '')}` : null,
    whatsapp: enabled && config.contact.whatsapp ? `https://wa.me/${config.contact.whatsapp.replace(/\D/g, '')}` : null,
    email: enabled && !config.contact.email.endsWith('@example.com') ? `mailto:${config.contact.email}` : null,
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
