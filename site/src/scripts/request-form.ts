import { business } from '../config/business';
import { findProduct } from '../content/catalog';
import { localDate, whatsappRequestUrl, validateRequest, type RequestValues } from '../lib/request';

const form = document.querySelector<HTMLFormElement>('[data-request-form]');
if (form) {
  const summary = document.querySelector<HTMLElement>('[data-error-summary]');
  const submit = form.querySelector<HTMLButtonElement>('[data-whatsapp-button]');
  const status = form.querySelector<HTMLElement>('[data-whatsapp-status]');
  const model = form.querySelector<HTMLSelectElement>('#model');
  const date = form.querySelector<HTMLInputElement>('#date');
  if (!summary || !submit || !status || !model || !date) {
    throw new Error('Structura formularului este incompletă.');
  }
  const queryModel = new URLSearchParams(location.search).get('model');
  if (queryModel) {
    if (findProduct(queryModel)) model.value = queryModel;
    else {
      summary.hidden = false;
      summary.querySelector('p')!.textContent = 'Modelul din link nu există. Alege un model din listă.';
      console.warn('Model necunoscut în linkul de ofertă.');
    }
  }
  date.min = localDate();
  form.noValidate = true;
  submit.disabled = false;
  submit.type = 'submit';
  if (import.meta.env.DEV) {
    void import('../dev/request-fixtures').then(({ installRequestFixtures }) => installRequestFixtures(form));
  }
  const values = (): RequestValues => {
    const data = new FormData(form);
    const read = (key: string) => {
      const value = data.get(key);
      return typeof value === 'string' ? value : '';
    };
    return { model: read('model'), date: read('date'), locality: read('locality'), children: read('children'), ages: read('ages'), details: read('details') };
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = values();
    const errors = validateRequest(data);
    const list = summary.querySelector('ul')!;
    list.replaceChildren();
    status.textContent = '';
    for (const key of ['model', 'date', 'locality', 'children', 'ages', 'details'] as const) {
      const field = form.elements.namedItem(key);
      const error = document.getElementById(`${key}-error`);
      if (!error || !(field instanceof HTMLElement)) throw new Error(`Câmp lipsă: ${key}`);
      const text = errors[key];
      field.setAttribute('aria-invalid', String(Boolean(text)));
      error.hidden = !text;
      error.textContent = text ?? '';
      if (text) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${key}`;
        link.textContent = text;
        item.append(link);
        list.append(item);
      }
    }
    summary.hidden = Object.keys(errors).length === 0;
    if (!summary.hidden) {
      summary.querySelector('p')!.textContent = 'Mai avem câteva detalii de corectat.';
      summary.focus();
      return;
    }
    try {
      const url = whatsappRequestUrl(business, data);
      status.textContent = 'Se deschide WhatsApp. Mesajul nu a fost trimis automat.';
      window.location.assign(url);
    } catch (error) {
      console.error('WhatsApp nu s-a putut deschide.', error);
      status.textContent = 'WhatsApp nu s-a putut deschide. Folosește contactul direct de mai jos sau încearcă din nou.';
    }
  });
}
