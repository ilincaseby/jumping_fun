import type { BusinessConfig } from '../config/business';
import { findProduct } from '../content/catalog';
import { contactLinks } from './business';

export interface RequestValues {
  model: string;
  date: string;
  locality: string;
  children: string;
  ages: string;
  details: string;
}
export type RequestErrors = Partial<Record<keyof RequestValues, string>>;

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function validateRequest(values: RequestValues, today = localDate()): RequestErrors {
  const errors: RequestErrors = {};
  if (values.model && !findProduct(values.model)) errors.model = 'Alege un model din listă sau „Nu am decis încă”.';
  const parsed = new Date(`${values.date}T12:00:00Z`);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(values.date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === values.date;
  if (!validDate) errors.date = 'Alege o dată validă pentru eveniment.';
  else if (values.date < today) errors.date = 'Alege data de azi sau o dată viitoare.';
  if (!values.locality.trim()) errors.locality = 'Completează localitatea evenimentului.';
  else if (values.locality.trim().length > 140) errors.locality = 'Folosește cel mult 140 de caractere pentru localitate.';
  const children = values.children.trim();
  if (children && (!/^\d+$/.test(children) || !Number.isSafeInteger(Number(children)) || Number(children) < 1)) {
    errors.children = 'Introdu un număr întreg pozitiv sau lasă câmpul necompletat.';
  }
  if (values.ages.length > 100) errors.ages = 'Folosește cel mult 100 de caractere pentru vârsta copiilor.';
  if (values.details.length > 1500) errors.details = 'Folosește cel mult 1.500 de caractere pentru detalii.';
  return errors;
}

export function requestMessage(config: BusinessConfig, values: RequestValues): string {
  const errors = validateRequest(values);
  if (Object.keys(errors).length) throw new Error('Nu se poate pregăti un mesaj cu date invalide.');
  const product = findProduct(values.model);
  const date = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${values.date}T12:00:00Z`));
  const subject = product ? product.name : 'un tobogan potrivit evenimentului meu';
  return [
    `Bună, ${config.brand}! Aș dori o ofertă pentru ${subject}.`,
    `Data: ${date}`,
    `Localitate: ${values.locality.trim()}`,
    ...(values.children.trim() ? [`Număr de copii: ${Number(values.children)}`] : []),
    ...(values.ages.trim() ? [`Vârsta copiilor: ${values.ages.trim()}`] : []),
    ...(values.details.trim() ? [`Detalii: ${values.details.trim()}`] : []),
    'Îmi puteți confirma disponibilitatea?',
  ].join('\n');
}

export function whatsappRequestUrl(config: BusinessConfig, values: RequestValues): string {
  const destination = contactLinks(config).whatsapp;
  if (!destination) throw new Error('Numărul WhatsApp nu este configurat sau verificat.');
  const url = new URL(destination);
  url.searchParams.set('text', requestMessage(config, values));
  return url.href;
}
