# Audit Lighthouse / PageSpeed — Jumping Fun

Data: **28 octombrie 2026**. Audit read-only al build-ului de producție local, fără modificarea implementării sau a dependențelor aplicației.

> **Actualizare ulterioară, autorizată de utilizator:** optimizarea 3D este implementată și reverificată. Homepage-ul final obține **98 mobil / 100 desktop**, TBT **0 ms**. Secțiunile de mai jos păstrează auditul inițial; comparația nouă este la final.

## Concluzie

**Problema principală este pornirea scenei 3D pe homepage, nu site-ul static în ansamblu.**

Homepage-ul obține **44/100 pe mobil** (mediana a trei rulări) și **62/100 pe desktop**. Catalogul obține **96/98**, iar formularul **100/100**. Într-un control diagnostic în care am blocat numai descărcarea chunk-ului scenei, homepage-ul mobil urcă la **98/100**, iar TBT scade la **0 ms**.

Controlul nu reprezintă o versiune reparată sau scorul actual al homepage-ului: activează fallback-ul existent, fără 3D live. El identifică subsistemul care trebuie optimizat, nu dovedește că orice amânare a scenei va reproduce acel scor.

## Metodă și limite

- **Lighthouse CLI 13.6.0**, Chromium for Testing **156**, macOS; browser separat de cel folosit interactiv în editor.
- Build static existent la `http://127.0.0.1:4327`, nu server de dezvoltare.
- Profil mobil standard: **412 × 823**, DPR emulat **1,75**, CPU **4×**, rețea simulată cu RTT **150 ms** și throughput **1.638,4 Kbps**.
- Profil desktop: presetul standard `desktop`. Configurația exactă este păstrată în fiecare raport JSON.
- WebGL prin **ANGLE SwiftShader software**, nu GPU-ul unui telefon real.
- **9 rulări succesive**, fără audituri concurente: homepage mobil ×3, catalog/ofertă mobil ×1, cele trei pagini desktop ×1, control mobil fără scena 3D ×1.
- Stocarea/cache-urile gestionate de Lighthouse sunt resetate implicit. Toate rulările au terminat fără `runtimeError` și fără avertismente de validitate.
- Scorurile și LCP/TBT sunt rezultate de laborator, cu throttling simulat. Nu sunt date CrUX, INP măsurat la utilizatori, un scor PageSpeed Insights public sau o certificare de fluiditate.
- Localhost elimină latențe reale DNS/TLS/CDN/server. WebGL software poate accentua costul scenei. Repetarea pe găzduirea finală și pe hardware mobil rămâne necesară.
- Accesibilitatea este verificarea automată Lighthouse/axe, **nu o certificare WCAG completă**. Auditul nu este un audit de securitate sau de conformitate juridică.

## Rezultate

Pentru homepage mobil, tabelul folosește mediana fiecărei metrici din cele trei rulări. Celelalte combinații pagină/profil au o singură rulare.

| Pagină | Profil | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Homepage | Mobil, mediană | **44** | 100 | 100 | 66 | **6,557 s** | **3.806 ms** | 0 |
| Homepage | Desktop | **62** | 100 | 100 | 66 | 1,604 s | **990 ms** | 0,00357 |
| Catalog | Mobil | **96** | 100 | 100 | 66 | 2,478 s | 0 ms | 0,00038 |
| Catalog | Desktop | **98** | **96** | 100 | 66 | 0,423 s | 0 ms | 0,00535 |
| Ofertă | Mobil | **100** | 100 | 100 | 63 | 0,752 s | 0 ms | 0,00034 |
| Ofertă | Desktop | **100** | 100 | 100 | 63 | 0,202 s | 0 ms | 0,00059 |

Homepage mobil, repetabilitate:

| Rulare | Performance | LCP | TBT |
| --- | ---: | ---: | ---: |
| 1 | 44 | 6,419 s | 3.666 ms |
| 2 | 42 | 7,078 s | 4.328 ms |
| 3 | 44 | 6,557 s | 3.806 ms |

Rezultatul slab al homepage-ului apare în toate cele trei rulări; nu este doar o singură valoare extremă.

### Control diagnostic

Cu `--blocked-url-patterns='*scene.*.js*'`, request-ul scenei are status `-1` și transfer **0 B**. Restul paginii și posterul rămân.

| Homepage mobil | Performance | LCP | TBT |
| --- | ---: | ---: | ---: |
| Normal, mediană | 44 | 6,557 s | 3.806 ms |
| Control fără descărcarea scenei | **98** | **2,102 s** | **0 ms** |

În control a fost auditată numai categoria Performance. Scorurile celorlalte categorii nu sunt presupuse sau extrapolate.

## Constatări prioritizate

### P1 — Inițializarea 3D ocupă firul principal în încărcarea inițială

**Dovezi:**

- În rularea mobilă 3, Lighthouse atribuie chunk-ului scenei aproximativ **7,86 s de Script Evaluation**, din aproximativ **8,1 s de muncă totală pe firul principal**.
- Stilul/layout-ul reprezintă aproximativ **43 ms** în același diagnostic; nu este cauza dominantă raportată.
- LCP este posterul din hero. Breakdown-ul trace-ului indică aproximativ **1.885 ms de întârziere la randarea elementului**, față de câțiva ms pentru încărcarea resursei pe localhost. Aceste durate observate nu trebuie confundate cu LCP-ul final de 6,557 s modelat de throttling.
- Rularea de control fără scenă elimină blocarea TBT.

**Cauza verificată în cod:** importul este dinamic, dar scena se află deja în/în apropierea viewport-ului. Observer-ul cu `rootMargin: '180px'` pornește imediat încărcarea, apoi `createScene()` construiește sincron renderer-ul și modelul, iar prima randare are loc pe firul principal. Separarea într-un chunk nu elimină automat costul de startup.

Locații: [scene-loader.ts:37](../site/src/scripts/scene-loader.ts#L37), [scene-loader.ts:74](../site/src/scripts/scene-loader.ts#L74), [scene.ts:23](../site/src/lib/three/scene.ts#L23), [scene.ts:86](../site/src/lib/three/scene.ts#L86).

**Recomandare:** profilează separat crearea renderer-ului, geometria, compilarea shader-elor și prima randare; auditul de aici identifică scena, dar nu separă cu certitudine aceste costuri interne. Păstrează posterul pe traseul critic și verifică inițializarea/compilarea asincronă, materiale mai ieftine și o politică de activare 3D potrivită pentru mobil. Activarea numai la interacțiune sau animarea inițială a posterului ar fi alegeri de produs care trebuie aprobate, nu schimbări aplicate în acest audit.

Nu recomand eliminarea arbitrară a 3D-ului sau numai reducerea numărului de triunghiuri: modelul are deja un buget mic, iar costul observat trebuie profilat pe faze.

### P2 — Imaginile sunt livrate la dimensiuni mai mari decât conținutul desenat

- Hero mobil: poster **900 × 748**, aproximativ **84 KB**. Lighthouse estimează aproximativ **72 KiB** economisibili față de dimensiunea desenată de circa **313 × 260**.
- Catalog: Lighthouse estimează aproximativ **116 KiB pe mobil / 117 KiB pe desktop**, cumulat pentru imaginile raportate.
- `object-fit: contain` și transformarea cardurilor laterale fac imaginea desenată mai mică decât containerul folosit în `sizes`.

Locații: [SlideScene.astro:8](../site/src/components/SlideScene.astro#L8), [tobogane.astro](../site/src/pages/tobogane.astro), [global.css](../site/src/styles/global.css).

**Recomandare:** ajustează `sizes` și treptele `srcset` după dimensiunea efectivă a imaginii, cu verificare pentru DPR/Retina. Evaluează compresia și marginile posterului. Valorile Lighthouse sunt estimări, nu promisiuni că putem economisi toți acei octeți fără pierdere de claritate.

### P2 — Contrast scăzut pe CTA-urile cardurilor laterale din catalogul desktop

Lighthouse semnalează butoanele „Cere o ofertă” ale cardurilor **Race** și **Unicorn**, estompate lângă cardul central. Raportul măsoară **2,05:1**, sub ținta de **4,5:1** pentru textul respectiv. Categoria Accessibility ajunge astfel la **96** pe desktop.

Locații: [carousel.ts:55](../site/src/scripts/carousel.ts#L55), [global.css:114](../site/src/styles/global.css#L114).

**Context important:** estomparea este parte din direcția aprobată. Cardurile necentrale au `aria-hidden` și linkuri scoase din ordinea Tab; CTA-ul central este clar. Constatarea automată nu dovedește că trebuie eliminat efectul vizual și necesită evaluarea manuală a stării inactive.

**Recomandare:** păstrează blur-ul lateral, dar ascunde/dezactivează explicit CTA-ul până când cardul este central sau limitează estomparea la fotografie și decor. Apoi repetă măsurarea contrastului și testele de tastatură.

### P3 — Prioritatea imaginilor LCP din catalog poate fi mai precisă

- Pe mobil, candidatul LCP este imaginea **Casă**, deja `loading="eager"`, dar fără `fetchpriority="high"`.
- Pe desktop, candidatul raportat este imaginea laterală **Unicorn**, cu `loading="lazy"`.

**Recomandare:** prioritizează imaginea efectiv vizibilă/centrală și verifică raportul dintre imagini laterale, dimensiunea lor desenată și candidatul LCP. Nu seta toate imaginile la prioritate mare. Catalogul are deja scor bun, deci această ajustare vine după startup-ul homepage-ului.

### P3 — CSS și fonturi pe traseul inițial de randare

Lighthouse raportează aproximativ **130 ms** economisibili pentru resursele render-blocking pe profilul mobil. Fonturile sunt deja self-hosted.

**Recomandare:** verifică subseturile și preload-ul fonturilor realmente folosite, apoi CSS-ul critic. Nu este justificat să complicăm arhitectura înainte de rezolvarea scenei, al cărei cost este mult mai mare.

## Ce nu trebuie „reparat” pentru a umfla scorul

- **SEO 63–66 este intenționat:** toate rapoartele SEO eșuează la `is-crawlable`, deoarece demo-ul are `noindex` și `robots.txt` blocant. Ponderile auditurilor aplicabile explică diferența între pagini.
- Nu se elimină aceste protecții până la completarea datelor, drepturilor și autorizarea publicării.
- Compresia nu lipsește: GET-ul scenei răspunde cu **`Content-Encoding: gzip`**; Lighthouse vede **138.328 B transferați** pentru **555.267 B de resursă decomprimată**.
- Cache-ul local de preview este `no-cache`; politica finală de cache/CDN trebuie auditată după alegerea găzduirii. Nu deduc configurația de producție din preview.
- `valid-source-maps` este un diagnostic de depanare, nu explicația blocării inițiale și nu reduce aici Best Practices sub 100.

## Ce funcționează bine

- CLS este foarte mic în toate cele șase combinații normale.
- Catalogul și formularul au **TBT 0 ms** în profilurile rulate.
- Rutele fără 3D nu plătesc costul scenei, iar fallback-ul static păstrează homepage-ul utilizabil.
- Accessibility automată este 100 pe toate combinațiile, cu excepția catalogului desktop (96).
- Best Practices este 100 pe toate paginile/profilurile normale.

## Ordinea recomandată a optimizărilor

1. Pornirea scenei și prima randare: măsurători pe faze, apoi schimbare focalizată.
2. Posterul și dimensiunile responsive ale imaginilor.
3. Tratarea CTA-urilor inactive fără pierderea esteticii gummy-glass.
4. Prioritatea LCP în catalog și ajustările mici de font/CSS.
5. Repetarea acelorași audituri; homepage mobil de minimum trei ori. Verificare pe telefon real și ulterior pe găzduirea finală.

**Nicio remediere nu a fost aplicată în această rundă.** Manifestele npm sunt neschimbate; au fost adăugate numai rapoartele auditului.

## Rapoarte originale

HTML-urile se deschid local în browser; JSON-urile alăturate păstrează configurația, timpii și constatările integrale.

- Homepage mobil: [rularea 1](./pagespeed-2026-10-28/home-mobile-1.report.html), [rularea 2](./pagespeed-2026-10-28/home-mobile-2.report.html), [rularea 3](./pagespeed-2026-10-28/home-mobile-3.report.html).
- [Homepage desktop](./pagespeed-2026-10-28/home-desktop.report.html).
- [Catalog mobil](./pagespeed-2026-10-28/tobogane-mobile.report.html) / [desktop](./pagespeed-2026-10-28/tobogane-desktop.report.html).
- [Ofertă mobil](./pagespeed-2026-10-28/oferta-mobile.report.html) / [desktop](./pagespeed-2026-10-28/oferta-desktop.report.html).
- [Control mobil fără scena 3D](./pagespeed-2026-10-28/home-mobile-no-three-control.report.html).

Reproducere, cu preview-ul pornit și Chromium disponibil:

```sh
CHROME_PATH="/cale/catre/chromium" npm exec --yes --package=lighthouse@13.6.0 -- \
  lighthouse http://127.0.0.1:4327/ \
  --chrome-flags="--headless --use-angle=swiftshader --enable-unsafe-swiftshader" \
  --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output=html --output-path=home-mobile
```

Pentru desktop: adaugă `--preset=desktop`. Pentru controlul diagnostic: adaugă `--blocked-url-patterns='*scene.*.js*'` și folosește numai categoria `performance`. Rulează succesiv, nu în paralel.

## După optimizarea 3D cerută de utilizator

Utilizatorul a cerut eliminarea mișcării stânga/dreapta și păstrarea căderii și a câtorva salturi la început.

### Modificarea aplicată

- Rotația după pointer și listener-ele aferente au fost eliminate.
- Modelul original și randarea WebGL rămân reale; sunt mutate într-un **Web Worker cu OffscreenCanvas**, nu înlocuite numai cu un screenshot.
- Posterul poate fi afișat înainte de pornirea workerului; UI-ul nu așteaptă construcția modelului sau pregătirea shader-elor.
- Animația are cădere, compresie și două reveniri descrescătoare, apoi se oprește. Mișcarea mouse-ului nu generează randări și nu schimbă pixelii canvas-ului.
- Workerul rămâne lazy, numai pe homepage; reduced-motion/save-data și browserele incompatibile primesc posterul. Erorile de worker și context sunt explicite.
- Nu au fost schimbate tarife, contacte, `noindex`, paleta sau catalogul. Nu s-a făcut deploy.

### Comparație pe același profil Lighthouse

Lighthouse 13.6.0, același Chromium, aceeași emulare și aceleași flag-uri SwiftShader. Rulări succesive, fără URL-uri blocate în testele optimizate.

| Metrică homepage | Înainte, mobil (mediană ×3) | După, mobil (build final) | Înainte, desktop | După, desktop (build final) |
| --- | ---: | ---: | ---: | ---: |
| Performance | 44 | **98** | 62 | **100** |
| LCP | 6,557 s | **2,105 s** | 1,604 s | **0,483 s** |
| TBT | 3.806 ms | **0 ms** | 990 ms | **0 ms** |
| Accessibility | 100 | 100 | 100 | 100 |
| Best Practices | 100 | 100 | 100 | 100 |
| SEO | 66 | 66 | 66 | 66 |

Repetabilitate: cele trei rulări mobile inițiale după mutarea în worker au fost **98, 98, 98**, iar confirmarea build-ului final **98**. Desktop: **99** la prima rulare optimizată și **100** la confirmarea finală. Variația desktop este raportată, nu ascunsă.

Scorurile noi sunt ale paginii cu workerul 3D activ, nu ale controlului fără 3D. Testele browser confirmă `data-renderer="worker"`, geometria de **14.250 triunghiuri / 9 draw calls**, aterizarea și contextul WebGL efectiv. Workerul are **138.418 B gzip**, iar controllerul **1.021 B gzip**; volumul bibliotecii nu a dispărut, costul ei de execuție a fost separat de UI.

### Verificare și limitări

- `npm run check`: fără erori sau avertismente.
- `npm test`: **12/12**.
- `npm run test:e2e`: **18/18**, inclusiv comparație de pixeli înainte/după mișcarea mouse-ului, context pierdut/restaurat, worker neîncărcat, lipsa OffscreenCanvas, preferințe schimbate în timpul încărcării și toate rutele existente.
- Capturi actualizate desktop/mobil; modelul își păstrează aspectul la repaus.
- Aceste rezultate nu certifică 60 fps pe un telefon real. Workerul nu elimină costul GPU; testarea hardware rămâne necesară.
- Celelalte recomandări din audit (dimensiunile imaginilor, CTA-urile laterale din catalog) nu au fost modificate în această intervenție focalizată.

Rapoarte: [mobil final](./pagespeed-2026-10-28-after-3d/home-mobile-final.report.html), [desktop final](./pagespeed-2026-10-28-after-3d/home-desktop-final.report.html), [mobil 1](./pagespeed-2026-10-28-after-3d/home-mobile-1.report.html), [mobil 2](./pagespeed-2026-10-28-after-3d/home-mobile-2.report.html), [mobil 3](./pagespeed-2026-10-28-after-3d/home-mobile-3.report.html), [desktop inițial optimizat](./pagespeed-2026-10-28-after-3d/home-desktop.report.html). JSON-urile integrale sunt alături de fiecare HTML.
