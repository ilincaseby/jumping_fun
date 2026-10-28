import { localDate, type RequestValues } from '../lib/request';

export function installRequestFixtures(form: HTMLFormElement) {
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  const fixtures: Record<string, RequestValues> = {
    demo: { model: 'casa', date: localDate(future), locality: 'București', children: '12', details: '' },
    worst: {
      model: '',
      children: '',
      date: localDate(future),
      locality: 'București — sectorul 3, locație de eveniment cu acces separat; amplasarea exactă va fi confirmată împreună înainte de stabilirea ofertei.',
      details: [
        'Vă rugăm să confirmați spațiul necesar, accesul, transportul și intervalul orar înainte de închiriere.',
        'Mesaj în mai multe limbi: Ștefan și Ana-Maria / 日本語 / العربية. Nu sunt date reale despre participanți.',
        'Exemplu de text literal: <b>detaliu important</b>. Acesta trebuie afișat ca text, nu interpretat ca HTML.',
        ...Array<string>(12).fill('Locul este în curs de stabilire. Vom confirma detaliile de amplasare și acces înainte de acceptarea ofertei.'),
      ].join('\n').slice(0, 1500),
    },
    empty: { model: '', date: '', locality: '', children: '', details: '' },
  };
  const toolbar = document.createElement('div');
  toolbar.setAttribute('aria-label', 'Fixture-uri de dezvoltare');
  Object.assign(toolbar.style, {
    position: 'fixed', bottom: '72px', left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: '4px', padding: '6px', borderRadius: '12px', background: '#e5e7eb',
    color: '#111827', zIndex: '100', font: '13px system-ui', boxShadow: '0 4px 16px #0002',
  });
  const apply = (key: string) => {
    const fixture = fixtures[key];
    if (!fixture) throw new Error(`Fixture necunoscut: ${key}`);
    for (const [name, value] of Object.entries(fixture)) {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
        field.value = value;
      }
    }
    form.dispatchEvent(new Event('input', { bubbles: true }));
    const url = new URL(location.href);
    url.searchParams.set('data', key);
    history.replaceState(null, '', url);
    toolbar.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      const selected = button.dataset.fixture === key;
      button.setAttribute('aria-pressed', String(selected));
      button.style.background = selected ? 'white' : 'transparent';
    });
  };
  for (const [key, label] of [['demo', 'Demo data'], ['worst', 'Worst case'], ['empty', 'Empty']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.fixture = key;
    button.textContent = label;
    Object.assign(button.style, { padding: '8px 10px', minHeight: '44px', border: '0', borderRadius: '8px' });
    button.addEventListener('click', () => apply(key));
    toolbar.append(button);
  }
  document.body.append(toolbar);
  const query = new URLSearchParams(location.search).get('data');
  if (query && query in fixtures) apply(query);
}
