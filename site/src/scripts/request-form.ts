import { business } from '../config/business';
import { findProduct } from '../content/catalog';
import { localDate, requestMessage, validateRequest, type RequestValues } from '../lib/request';

const form = document.querySelector<HTMLFormElement>('[data-request-form]');
if (form) {
  const summary = document.querySelector<HTMLElement>('[data-error-summary]');
  const panel = document.querySelector<HTMLElement>('[data-preview-panel]');
  const message = document.querySelector<HTMLElement>('[data-preview-text]');
  const submit = form.querySelector<HTMLButtonElement>('[data-preview-button]');
  const copy = document.querySelector<HTMLButtonElement>('[data-copy]');
  const edit = document.querySelector<HTMLButtonElement>('[data-edit]');
  const copyStatus = document.querySelector<HTMLElement>('[data-copy-status]');
  const model = form.querySelector<HTMLSelectElement>('#model');
  const date = form.querySelector<HTMLInputElement>('#date');
  if (!summary || !panel || !message || !submit || !copy || !edit || !copyStatus || !model || !date) {
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
    return { model: read('model'), date: read('date'), locality: read('locality'), details: read('details') };
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = values();
    const errors = validateRequest(data);
    const list = summary.querySelector('ul')!;
    list.replaceChildren();
    for (const key of ['model', 'date', 'locality', 'details'] as const) {
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
      panel.hidden = true;
      summary.focus();
      return;
    }
    message.textContent = requestMessage(business, data);
    copyStatus.textContent = '';
    panel.hidden = false;
    panel.focus();
  });
  form.addEventListener('input', () => { panel.hidden = true; });
  edit.addEventListener('click', () => {
    panel.hidden = true;
    model.focus();
  });
  copy.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API indisponibil.');
      await navigator.clipboard.writeText(message.textContent ?? '');
      copyStatus.textContent = 'Mesaj copiat. Nu a fost trimis.';
    } catch (error) {
      console.warn('Copierea mesajului nu a reușit.', error);
      copyStatus.textContent = 'Copierea automată nu este disponibilă. Poți selecta și copia manual textul de mai sus.';
    }
  });
}
