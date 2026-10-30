# Jumping Fun

Site în română, static Astro + TypeScript + Tailwind CSS 4. Formularul deschide WhatsApp cu un mesaj precompletat. Fără React, SSR, analytics sau backend de trimitere.

Direcția v02 a fost aprobată explicit: [decizia și referințele Figma](../docs/design-approved.md). Figma este parțială; implementarea completează rutele și interacțiunile discutate.

## Pornire

Node compatibil cu `engines` din [package.json](./package.json), npm 9.6.5+:

```sh
npm ci
npm run dev
```

Pentru build-ul static:

```sh
npm run check
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4327
```

Preview local: `http://127.0.0.1:4327`. Rute: `/`, `/tobogane/`, `/galerie/` (și paginile 2/3), `/informatii/`, `/oferta/`, `/confidentialitate/`, `/conditii-inchiriere/`.

### Comanda de build pentru Cloudflare

Dacă rădăcina repository-ului conține folderul `site/`:

```sh
cd site && npm ci && npm run build
```

Dacă în Cloudflare setezi **Root directory = `site`**, folosește `npm ci && npm run build`. Output-ul este `site/dist` față de rădăcina repository-ului, respectiv `dist` față de aplicație. În Workers, configurația/comanda de deploy trebuie să indice separat acest director de assets; un `cd` din build nu se păstrează automat pentru deploy.

Pentru câmpul **Deploy command** al unui Worker static fără configurare de assets existentă, de la rădăcina repository-ului:

```sh
npx wrangler deploy --name jumping-fun --assets ./site/dist
```

Cu Root directory `site`, calea devine `--assets ./dist`. Flag-urile sunt documentate în [Wrangler deploy](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy). Acestea sunt instrucțiuni pentru configurarea utilizatorului, nu comenzi executate în această sesiune.

Comanda construiește site-ul în starea curentă. Pentru lansarea finală folosește verificarea `build:release`, care refuză datele incomplete. `noindex` nu este control de acces: un site public rămâne accesibil prin URL. Nu s-a executat un deploy din această sesiune.

## Unde modific datele

**Unicul obiect de business este [src/config/business.ts](./src/config/business.ts).**

Brandul, identitatea juridică, telefonul, WhatsApp, e-mailul, URL-ul, rețelele sociale, zona și programul sunt importate din acest fișier. Header-ul, SEO, textul ofertei, zona deservită și paginile de contact folosesc aceeași configurație.

- Telefonul și WhatsApp au fost confirmate de utilizator și sunt active; ambele folosesc aceeași constantă `phone`.
- `status: 'verified'` nu este suficient pentru lansare: `publicationIssues()` verifică separat datele juridice, domeniul, condițiile comerciale și drepturile media. Cât timp există lipsuri, paginile rămân `noindex, nofollow`, iar robots exclude indexarea.
- Contactele sunt inactive pentru configurații neverificate. E-mailul este `null` și nu se afișează; formularul nu folosește e-mail.
- Lipsurile sunt `null` sau enumerate în `missingFields`, nu înlocuite cu identificatori fiscali/numere inventate.
- JSON-LD nu se emite pentru business demo sau cu date obligatorii lipsă.
- Nu pune secrete/API keys în configurație: este conținut public.

Catalogul este separat în [src/content/catalog.ts](./src/content/catalog.ts). Denumirile, prețurile, dimensiunile în metri (lungime/lățime/înălțime) și vârstele au fost confirmate direct de utilizator la 28 octombrie 2026. Nu se afișează `/zi`; durata, transportul și serviciile incluse se confirmă în ofertă. Numărul de copii din formular nu reprezintă o capacitate simultană admisă.

Formularul compune local un mesaj cu modelul, data, localitatea, numărul opțional de copii și detaliile. „Continuă pe WhatsApp” deschide `https://wa.me/...` cu textul codificat în URL; WhatsApp decide deschiderea aplicației sau a paginii web, în funcție de dispozitiv. **Mesajul nu se trimite automat**. Nu există POST către un backend al site-ului, rezervare automată sau salvare a formularului în localStorage. Din momentul navigării, textul ajunge la WhatsApp/Meta, lucru explicat în pagina de confidențialitate.

Numărul de copii este opțional; dacă este completat, trebuie să fie un întreg pozitiv reprezentabil sigur, fără un plafon comercial inventat.

## Fotografii și drepturi

- Fișierele folosite: [src/assets/products](./src/assets/products/) și [src/assets/gallery](./src/assets/gallery/).
- Asocierea, alt text și sursa: [src/content/media.ts](./src/content/media.ts).
- Drepturile folosite inclusiv de verificarea de lansare: [src/content/publication-media.ts](./src/content/publication-media.ts).
- Proveniența completă și filtrele aplicate copiilor: [manifestul media](../docs/media-manifest.json).
- Fotografii noi și consimțăminte: [additional-media-manifest.json](../docs/additional-media-manifest.json).
- Ordinea și legendele celor 24 de fotografii noi: [gallery-sources.ts](./src/content/gallery-sources.ts).

Astro generează WebP și variante responsive la build. Originalele furnizate nu sunt modificate. Copiile curățate elimină antetele/prețurile din margini; cotele suprapuse pe produs și însemnele rămân. Nu s-au folosit generări externe sau fotografii stock.

Utilizatorul a confirmat explicit utilizarea comercială și acordurile părinților/reprezentanților legali pentru persoanele recognoscibile. Drepturile fișierelor curente sunt marcate ca aprobate pe baza acestei declarații, nu a unui audit juridic independent. Nu extinde automat acordul la materiale adăugate ulterior.

Galeria include 24 de fotografii noi și cele 3 existente, cu paginare statică de câte 9, funcțională și fără JS. Imaginea XXXL din catalog este copia pe fundal alb; fotografia veche rămâne în galerie.

Pentru a înlocui o fotografie: adaugă fișierul, schimbă importul și alt text-ul din modulul media, actualizează proveniența și drepturile, apoi reconstruiește. Nu hotlink-ui URL-uri temporare.

## Fotografia statică de pe homepage și motion

[SlideScene.astro](./src/components/SlideScene.astro) afișează fotografia reală Patrula Cățelușilor Uriaș XXXL, fără canvas, animație de intrare sau încărcare Three.js/worker. Imaginea rămâne statică inclusiv fără JavaScript și indiferent de preferințele motion/save-data.

[patrula-home.webp](./src/assets/scene/patrula-home.webp) este copia transparentă a fotografiei existente [patrula-xxxl.jpg](./src/assets/products/patrula-xxxl.jpg), identificată și în atașamentul utilizatorului din 30 octombrie 2026. Fundalul alb exterior a fost eliminat local, cu margini netezite și spațiul exterior decupat; însemnele și detaliile albe din produs sunt păstrate. Originalul și fotografia din catalog nu sunt modificate. Proveniența și procesarea sunt în [manifestul suplimentar](../docs/additional-media-manifest.json).

WebP cu transparență păstrează detaliile fotografiei fără vectorizare SVG. Astro generează variante responsive; fundalul paginii și lumina difuză din spatele imaginii rămân vizibile. Pentru înlocuire, pregătește o copie transparentă, actualizează importul, alt text-ul și manifestul, apoi reconstruiește.

Codul 3D, posterul și scripturile istorice de captură/profilare rămân în repository, dar nu mai sunt conectate la homepage. `capture-poster.ts` și `measure-preview.ts` presupun scena veche și nu se folosesc pentru fotografia statică.

Fonturile Fredoka și DM Sans sunt self-hosted; copiile licențelor SIL OFL sunt în [public/licenses](./public/licenses/).

Catalogul folosește **Embla**, doar pe ruta sa, pentru drag, momentum și întrerupere. CSS gestionează suprafața gummy-glass; centrul rămâne clar. Există selecție directă, butoane și tastatură. Fără autoplay. Reduced-transparency/contrast crescut produc suprafețe opace. Fără JS există o listă orizontală nativă cu scroll-snap și ancore.

Homepage-ul nu dublează selectorul celor șapte modele; acesta rămâne în catalog. „Vezi catalogul” este CTA-ul principal galben, cu două pulsuri de luminozitate de câte 2 secunde, prin opacitatea unui strat CSS. Animația se încheie singură, este pusă în pauză la focus/hover/press (nu repornită de la zero) și este dezactivată pentru reduced-motion, reduced-transparency sau contrast crescut. „Cere o ofertă” rămâne vizibil și pe mobil. Nu s-a adăugat o nouă scenă 3D sau o bibliotecă de animație.

## Verificare

```sh
npm run check
npm test
npm run build
npm run test:e2e
npm run check:release
```

Ultima comandă **trebuie încă să eșueze** deoarece datele juridice, domeniul și condițiile comerciale complete nu au fost furnizate. Testele Playwright pornesc propriul server; portul implicit este 4322. Dacă este ocupat de alt proiect, folosește `PLAYWRIGHT_PORT=4326 npm run test:e2e`, fără să oprești serviciul celuilalt proiect. Dacă browserul lipsește, instalează-l cu `npx playwright install chromium`.

Testele acoperă configurația, blocarea publicării, valorile exacte din catalog, validarea opțională a numărului de copii, URL-ul WhatsApp și codificarea textului, paginarea galeriei, geometria/aterizarea istorică (unitar), rutarea, swipe/tastatură, dialogul galeriei, FAQ, lipsa JS, reduced-motion/save-data, transparența fotografiei, absența animației și a rendererului, încărcări eșuate și dimensiunile 1440/768/390/320. Navigarea WhatsApp este interceptată în teste: nu se face nicio solicitare reală către acel serviciu și nu se trimite niciun mesaj.

Capturile implementării sunt scrise în [docs/previews/implementation](../docs/previews/implementation/) de testul vizual. Planul standalone din [.tsupgrader/runtime-validation/eval-plan.json](./.tsupgrader/runtime-validation/eval-plan.json) reia comenzile proiectului; nu creează un workflow de upgrade.

### Fixture-uri dev-only

În `npm run dev`, `/oferta/?data=worst` afișează comutatorul **Demo data / Worst case / Empty**. Fixture-urile intră prin câmpurile reale: model opțional absent, localitate lungă, detalii la limita de 1.500 de caractere, diacritice, Unicode și text HTML literal. Nu sunt incluse în build-ul de producție.

Modelul este un enum cu 7 valori; data este validată calendaristic; localitatea are limita 140; detaliile 1.500; numărul de copii este opțional și întreg pozitiv. Fixture-urile se folosesc numai în dezvoltare; nu apăsa butonul WhatsApp cu date de test într-un browser neinterceptat.

### Ce nu dovedesc testele automate

Chromium pe macOS cu WebGL software și viewport emulat nu demonstrează fluiditatea pe telefon real. Înainte de lansare trebuie verificate Safari/iOS, Chrome/Android pe un dispozitiv mai vechi, tastatura virtuală, safe areas, orientarea, viteza gestului, zoom-ul real din browser și profilul GPU. Testul de text 200% verifică reflow-ul textului, nu pretinde că este test hardware.

Testele includ și zoom vizual 2× prin CDP, separat de mărirea fontului; acesta nu înlocuiește verificarea manuală a zoom-ului din browser pe hardware.

### Rezultate locale

Actualizarea catalogului/contactului/galeriei: typecheck fără erori, **16 teste unitare**, **19 teste browser**, build static reușit. Etichetele publice demo/preview și e-mailul demonstrativ au fost eliminate; verificarea de lansare rămâne blocată explicit pentru datele încă lipsă.

După optimizarea 3D din 28 octombrie 2026: typecheck fără erori, **12 teste unitare**, **18 teste browser**, build static reușit. Sunt verificate inclusiv absența rotației (comparație de pixeli), oprirea randării după aterizare, pierderea/restaurarea contextului în worker și schimbarea preferinței reduced-motion în timpul încărcării. Verificarea de publicare rămâne blocată intenționat pentru demo.

Un fixture temporar în configurația business a fost propagat anterior în toate cele șapte titluri/header-e, zona deservită, e-mailul de contact/confidențialitate și configurația client a mesajului; valorile originale au fost restaurate și build-ul final reverificat.

Modelul randat: **14.250 triunghiuri, 9 draw calls**. Workerul final: **138.418 B gzip**; controllerul: **1.021 B gzip**; posterul WebP maxim: **84.344 B**. Workerul încă are aproximativ 560 KB necomprimat; optimizarea mută execuția în afara firului UI, nu pretinde eliminarea întregii biblioteci sau a transferului ei.

Audit comparabil înainte/după: **homepage mobil 44 → 98**, desktop **62 → 100** în ultima rulare (99 în prima rulare optimizată); TBT **3.806 → 0 ms** pe mobil și **990 → 0 ms** pe desktop. Cele patru rulări mobile optimizate au avut toate scorul 98. [Raportul și condițiile Lighthouse](../docs/pagespeed-audit.md) păstrează și baseline-ul.

[performance.json](../docs/performance.json) este profilul local istoric de dinaintea mutării în worker. Poate fi regenerat cu `npx tsx scripts/measure-preview.ts`, cu preview-ul pornit. **Nu pretindem 60 fps pe mobil**: main-thread TBT 0 nu este un benchmark GPU și nu înlocuiește profilarea pe telefon real.

Testul dev-only a găsit inițial o suprapunere între comutator și toolbar-ul Astro. Comutatorul a fost mutat deasupra acestuia și verificat din nou. Datele-limită de 1.500 de caractere, lipsa modelului opțional și starea Empty nu au produs overflow la 320 px.

## Înainte de publicare

1. Completează și verifică identitatea juridică, sediul și domeniul în configurația business; nu inventa valori.
2. Confirmă tarifele, durata, transportul, condițiile și politicile aplicabile.
3. Confirmă drepturile tuturor materialelor, inclusiv cele terțe, și actualizează manifestul.
4. Verifică juridic textele de contact/confidențialitate/închiriere și practicile găzduirii finale.
5. Testează pe hardware, verifică accesibilitatea și măsoară performanța pe găzduirea finală.
6. Rulează `npm run build:release`. Refuză demo, lipsuri și media fără drepturi confirmate.
7. Cere autorizare separată pentru deploy. Nici build-ul, nici aprobarea designului nu autorizează publicarea.

## SAL și informații pentru consumatori

Footer-ul include pictograma SAL oferită de [ANPC](https://www.anpc.ro/sal), legată la [portalul SAL](https://reclamatiisal.anpc.ro/), plus link ANPC, confidențialitate și condiții de închiriere. Copia locală este în [public/legal/anpc-sal.png](./public/legal/anpc-sal.png), cu proveniența în manifestul suplimentar.

Nu este adăugat un badge SOL către vechea platformă europeană: [Comisia Europeană confirmă închiderea ei la 20 iulie 2025](https://consumer-redress.ec.europa.eu/site-relocation_en). Pictograma SAL nu reprezintă o certificare a business-ului și nu înlocuiește datele juridice ori verificarea legală a site-ului.
