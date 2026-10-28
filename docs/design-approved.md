# Aprobare pentru implementare — v02

Data: 28 octombrie 2026.

Utilizatorul a văzut v02 în Figma și a spus explicit: „am văzut în figma pe 02, da cam aia aveam în cap, poți să-i dai drumul la implementare”.

A confirmat apoi destinația **`jumping_fun/site/`**, cu **Astro + TypeScript + Tailwind CSS**, motion și Three.js în module separate.

## Referința aprobată

- [Home desktop v02](https://www.figma.com/design/Da73yGwUUhH0jLMUYme5hl?node-id=16-224).
- [Home mobil v02](https://www.figma.com/design/Da73yGwUUhH0jLMUYme5hl?node-id=16-298).
- [Catalog desktop v02](https://www.figma.com/design/Da73yGwUUhH0jLMUYme5hl?node-id=16-498).
- [Catalog mobil v02](https://www.figma.com/design/Da73yGwUUhH0jLMUYme5hl?node-id=16-961).
- [Foundation v02](https://www.figma.com/design/Da73yGwUUhH0jLMUYme5hl?node-id=15-222).

Figma v02 rămâne parțială și nu a trecut verificarea finală din cauza cotei MCP. Utilizatorul a fost informat și a autorizat implementarea direcției văzute; paginile lipsă urmează structura discutată, nu sunt prezentate ca frame-uri Figma finalizate.

## Comportament și structură

- Homepage compact, nu toate secțiunile pe o pagină lungă.
- Rute: `/`, `/tobogane/`, `/galerie/`, `/informatii/`, `/oferta/`.
- Se păstrează paleta, titlurile, cele șapte modele și imaginile furnizate.
- Navigare clară și scurtături de model în partea de sus.
- Catalog orizontal: card central clar, vecini ușor estompați, suprafață gummy-glass; swipe fluid, selecție directă, butoane și tastatură. Fără autoplay.
- Un singur tobogan 3D original, în hero. Mai multe detalii de volum, cusături și trepte; fără copierea personajelor, siglelor sau unui model comercial distinctiv.
- Intrare rară, la prima vizită: cădere, compresie moderată, salt mic și repaus. Textul și CTA-ul nu așteaptă scena.
- Reduced-motion, save-data sau lipsa WebGL: variantă statică. Reduced-transparency: suprafețe opace. Scena nu capturează scroll-ul.
- Șase copii media pregătite local sunt permise; originalele rămân intacte. Cotele suprapuse și însemnele nu sunt eliminate prin reconstrucție inventată.

## Limite păstrate

- HTML prerandat Astro. Nu se introduce React, SSR sau hidratarea întregii pagini.
- Date business centralizate în `src/config/business.ts`, cu statut demo și valori lipsă explicite.
- Formularul pregătește o previzualizare locală; nu trimite, nu rezervă și nu activează destinații neverificate.
- `noindex` și verificare de prepublicare care refuză demo, câmpuri obligatorii lipsă și drepturi media neconfirmate.
- Fără deploy sau publicare. Proiectul ISI și sursele skill-urilor nu se modifică.
- Aceasta este aprobare pentru implementarea direcției, nu aprobare juridică, de performanță sau de lansare.

## Revizie de motion autorizată ulterior

La 28 octombrie 2026, utilizatorul a cerut explicit optimizarea animației 3D, eliminarea mișcării stânga/dreapta și păstrarea căderii și a salturilor de început. Implementarea păstrează modelul original, cu două reveniri mici, fără rotație după mouse. Randarea este izolată într-un worker al browserului; aceasta nu introduce un backend Cloudflare și nu schimbă autorizația de publicare.

## Date comerciale, fotografii și contact confirmate ulterior

Utilizatorul a furnizat noile denumiri, dimensiunile și vârstele celor șapte modele și a confirmat că dimensiunile sunt în metri. A confirmat telefonul/WhatsApp `+40 767 850 085`, formularul cu deschidere WhatsApp și câmpul opțional „Număr de copii”, validat ca întreg pozitiv.

A cerut eliminarea etichetelor publice demo/preview și a e-mailului demonstrativ, înlocuirea fotografiei XXXL cu cea pe fond alb și adăugarea fotografiilor suplimentare. A confirmat utilizarea comercială și acordurile pentru persoanele recognoscibile, inclusiv acordurile părinților/reprezentanților legali.

Datele juridice și domeniul vor fi completate ulterior. Durata tarifelor se confirmă în ofertă; nu se introduce „pe zi”. Interfața poate folosi contactele verificate, dar noindex și verificarea de lansare rămân până la completarea datelor. Adăugarea SAL/ANPC și a paginilor informative nu este o certificare juridică și nu autorizează deploy-ul.
