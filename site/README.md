# Jumping Fun — preview v02

Site în română, static Astro + TypeScript + Tailwind CSS 4. Fără React, SSR, analytics, backend de trimitere sau deploy.

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

Preview: `http://127.0.0.1:4327`. Rute: `/`, `/tobogane/`, `/galerie/`, `/informatii/`, `/oferta/`, `/confidentialitate/`.

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

Comanda construiește demo-ul. Pentru lansarea finală folosește verificarea `build:release`, care refuză datele incomplete. `noindex` nu este control de acces: un preview public rămâne accesibil prin URL. Nu s-a executat un deploy din această sesiune.

## Unde modific datele

**Unicul obiect de business este [src/config/business.ts](./src/config/business.ts).**

Brandul, identitatea juridică, telefonul, WhatsApp, e-mailul, URL-ul, rețelele sociale, zona și programul sunt importate din acest fișier. Header-ul, SEO, textul ofertei, zona deservită și paginile de contact folosesc aceeași configurație.

- `status: 'demo'`: toate paginile sunt `noindex, nofollow`; robots exclude indexarea.
- Contactele sunt inactive până la `status: 'verified'` **și** `contact.verified: true`.
- Lipsurile sunt `null` sau enumerate în `missingFields`, nu înlocuite cu identificatori fiscali/numere inventate.
- JSON-LD nu se emite pentru business demo sau cu date obligatorii lipsă.
- Nu pune secrete/API keys în configurație: este conținut public.

Catalogul este separat în [src/content/catalog.ts](./src/content/catalog.ts). Tarifele sunt transcrise din materiale; nu implică `/zi`, transport, montaj sau disponibilitate. Nu sunt inventate capacități sau limite de siguranță.

Formularul pregătește mesajul **doar în memoria paginii**. Nu există cerere POST, trimitere, rezervare sau salvare a formularului în localStorage. Copierea este inițiată explicit de utilizator și are feedback separat de trimitere.

## Fotografii și drepturi

- Fișierele folosite: [src/assets/products](./src/assets/products/) și [src/assets/gallery](./src/assets/gallery/).
- Asocierea, alt text și sursa: [src/content/media.ts](./src/content/media.ts).
- Drepturile folosite inclusiv de verificarea de lansare: [src/content/publication-media.ts](./src/content/publication-media.ts).
- Proveniența completă și filtrele aplicate copiilor: [manifestul media](../docs/media-manifest.json).

Astro generează WebP și variante responsive la build. Originalele furnizate nu sunt modificate. Copiile curățate elimină antetele/prețurile din margini; cotele suprapuse pe produs și însemnele rămân. Nu s-au folosit generări externe sau fotografii stock.

Permisiunea proprietarului este documentată, dar drepturile terțe asupra personajelor/mărcilor din materiale trebuie clarificate înainte de lansare. `thirdPartyCleared` rămâne `false` până atunci.

Pentru a înlocui o fotografie: adaugă fișierul, schimbă importul și alt text-ul din modulul media, actualizează proveniența și drepturile, apoi reconstruiește. Nu hotlink-ui URL-uri temporare.

## 3D și motion

- [src/lib/three/spec.ts](./src/lib/three/spec.ts): dimensiuni și culori ale modelului original.
- [src/lib/three/model.ts](./src/lib/three/model.ts): geometrie procedurală, cusături, trepte și plasă; geometriile sunt combinate pe materiale.
- [src/lib/three/scene.ts](./src/lib/three/scene.ts): cameră și renderer OffscreenCanvas, executate în worker.
- [src/lib/three/scene.worker.ts](./src/lib/three/scene.worker.ts): construirea modelului, pregătirea shader-elor și randarea în afara firului UI.
- [src/lib/three/scene-controller.ts](./src/lib/three/scene-controller.ts): puntea cu DOM-ul, redimensionare, erori și lifecycle.
- [src/lib/three/scene-protocol.ts](./src/lib/three/scene-protocol.ts): mesaje tipate între pagină și worker.
- [src/scripts/motion/landing.ts](./src/scripts/motion/landing.ts): cădere, impact, compresie elastică, două reveniri mici descrescătoare și repaus.
- [src/scripts/scene-loader.ts](./src/scripts/scene-loader.ts): poster întâi, import dinamic, vizibilitate, preferințe, încărcare eșuată și fallback.
- [src/components/SlideScene.astro](./src/components/SlideScene.astro): poster și container; numai pe homepage.

Este un model **original ilustrativ**, nu o replică de închiriat. DPR este limitat la 1,5; randarea se oprește la repaus și când scena/tab-ul nu se vede. Nu există un loop permanent și **nu mai există rotație sau reacție la mișcarea mouse-ului**. Se păstrează numai intrarea verticală, la inițializare.

Nu există buton de comutare manuală între 3D și imagine. Posterul/fallback-ul sunt gestionate automat după preferințele dispozitivului și disponibilitatea rendererului.

Este un **Web Worker din browser**, nu un Cloudflare Worker/backend. Workerul deține Three.js și resursele GPU; pagina primește numai starea și câteva măsurători, nu actualizări DOM în fiecare frame. Contextul pierdut, workerul eșuat și limita de inițializare au fallback explicit. Posterul rămâne pe reduced-motion/save-data/fără WebGL sau fără suport pentru `transferControlToOffscreen`. Nu se revine în tăcere la randare grea pe firul UI.

Posterul este randat din model, nu un obiect diferit. După modificarea geometriei, pornește preview-ul și rulează:

```sh
npx tsx scripts/capture-poster.ts http://127.0.0.1:4327/
npm run build
```

Scriptul necesită browserul Playwright disponibil. Generează [src/assets/scene/slide-poster.png](./src/assets/scene/slide-poster.png); Astro livrează variante WebP. Scena live nu este încărcată pe celelalte rute.

Fonturile Fredoka și DM Sans sunt self-hosted; copiile licențelor SIL OFL sunt în [public/licenses](./public/licenses/).

Catalogul folosește **Embla**, doar pe ruta sa, pentru drag, momentum și întrerupere. CSS gestionează suprafața gummy-glass; centrul rămâne clar. Există selecție directă, butoane și tastatură. Fără autoplay. Reduced-transparency/contrast crescut produc suprafețe opace. Fără JS există o listă orizontală nativă cu scroll-snap și ancore.

## Verificare

```sh
npm run check
npm test
npm run build
npm run test:e2e
npm run check:release
```

Ultima comandă **trebuie să eșueze în demo**. Testele Playwright pornesc și opresc propriul preview pe `127.0.0.1:4322`. Dacă browserul lipsește, instalează-l cu `npx playwright install chromium`.

Testele acoperă configurația, blocarea publicării, prețurile documentate, date invalide, previzualizarea fără trimitere, geometria/aterizarea, rutarea, swipe/tastatură, dialogul galeriei, FAQ, lipsa JS, reduced-motion/save-data, lipsa WebGL, pierderea contextului, încărcări eșuate și dimensiunile 1440/768/390/320.

Capturile implementării sunt scrise în [docs/previews/implementation](../docs/previews/implementation/) de testul vizual. Planul standalone din [.tsupgrader/runtime-validation/eval-plan.json](./.tsupgrader/runtime-validation/eval-plan.json) reia comenzile proiectului; nu creează un workflow de upgrade.

### Fixture-uri dev-only

În `npm run dev`, `/oferta/?data=worst` afișează comutatorul **Demo data / Worst case / Empty**. Fixture-urile intră prin câmpurile reale: model opțional absent, localitate lungă, detalii la limita de 1.500 de caractere, diacritice, Unicode și text HTML literal. Nu sunt incluse în build-ul de producție.

Modelul este un enum cu 7 valori; data este validată calendaristic; localitatea are limita 140; detaliile 1.500. Nu există liste de 1.000 de produse în acest catalog fix. Lipsa fotografiilor și a WebGL este verificată separat prin teste.

### Ce nu dovedesc testele automate

Chromium pe macOS cu WebGL software și viewport emulat nu demonstrează fluiditatea pe telefon real. Înainte de lansare trebuie verificate Safari/iOS, Chrome/Android pe un dispozitiv mai vechi, tastatura virtuală, safe areas, orientarea, viteza gestului, zoom-ul real din browser și profilul GPU. Testul de text 200% verifică reflow-ul textului, nu pretinde că este test hardware.

Testele includ și zoom vizual 2× prin CDP, separat de mărirea fontului; acesta nu înlocuiește verificarea manuală a zoom-ului din browser pe hardware.

### Rezultate locale

După optimizarea 3D din 28 octombrie 2026: typecheck fără erori, **12 teste unitare**, **18 teste browser**, build static reușit. Sunt verificate inclusiv absența rotației (comparație de pixeli), oprirea randării după aterizare, pierderea/restaurarea contextului în worker și schimbarea preferinței reduced-motion în timpul încărcării. Verificarea de publicare rămâne blocată intenționat pentru demo.

Un fixture temporar în configurația business a fost propagat anterior în toate cele șapte titluri/header-e, zona deservită, e-mailul de contact/confidențialitate și configurația client a mesajului; valorile originale au fost restaurate și build-ul final reverificat.

Modelul randat: **14.250 triunghiuri, 9 draw calls**. Workerul final: **138.418 B gzip**; controllerul: **1.021 B gzip**; posterul WebP maxim: **84.344 B**. Workerul încă are aproximativ 560 KB necomprimat; optimizarea mută execuția în afara firului UI, nu pretinde eliminarea întregii biblioteci sau a transferului ei.

Audit comparabil înainte/după: **homepage mobil 44 → 98**, desktop **62 → 100** în ultima rulare (99 în prima rulare optimizată); TBT **3.806 → 0 ms** pe mobil și **990 → 0 ms** pe desktop. Cele patru rulări mobile optimizate au avut toate scorul 98. [Raportul și condițiile Lighthouse](../docs/pagespeed-audit.md) păstrează și baseline-ul.

[performance.json](../docs/performance.json) este profilul local istoric de dinaintea mutării în worker. Poate fi regenerat cu `npx tsx scripts/measure-preview.ts`, cu preview-ul pornit. **Nu pretindem 60 fps pe mobil**: main-thread TBT 0 nu este un benchmark GPU și nu înlocuiește profilarea pe telefon real.

Testul dev-only a găsit inițial o suprapunere între comutator și toolbar-ul Astro. Comutatorul a fost mutat deasupra acestuia și verificat din nou. Datele-limită de 1.500 de caractere, lipsa modelului opțional și starea Empty nu au produs overflow la 320 px.

## Înainte de publicare

1. Completează și verifică datele business; elimină demo doar după verificare.
2. Confirmă tarifele, durata, transportul, condițiile și politicile aplicabile.
3. Confirmă drepturile tuturor materialelor, inclusiv cele terțe, și actualizează manifestul.
4. Verifică juridic textele de contact/confidențialitate; cele existente descriu numai demo-ul.
5. Testează pe hardware, verifică accesibilitatea și măsoară performanța pe găzduirea finală.
6. Rulează `npm run build:release`. Refuză demo, lipsuri și media fără drepturi confirmate.
7. Cere autorizare separată pentru deploy. Nici build-ul, nici aprobarea designului nu autorizează publicarea.
