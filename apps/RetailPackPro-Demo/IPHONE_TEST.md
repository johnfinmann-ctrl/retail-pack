# Kamera på iPhone — årsag, rettelser og test

## Hvorfor viste appen "Kamerascanning er ikke understøttet her"?

Live-kamera kræver tre ting: **https**, at browseren stiller **kamera-API'et** til rådighed,
og at siden **ikke kører i en ramme, der spærrer kameraet**.

| Hvor demoen åbnes | Live-scanning | Foto af stregkode / palle |
|---|---|---|
| Safari på iPhone via https (fx GitHub Pages) | Ja, efter tilladelse | Ja |
| Claude-linket (claude.ai, også i Claude-appen) | **Nej**. Visningen spærrer kameraet uden at spørge. | Ja, hvis visningen tillader filvalg* |
| HTML-filen åbnet fra Filer-appen eller via http | **Nej**. Siden er ikke https. | Ja |

*Skal bekræftes på en fysisk iPhone i Claude-appen.

Den mest sandsynlige årsag til fejlen er, at demoen blev åbnet via Claude-linket. Her kan
appen ikke slå live-kameraet til. Det kræver den selvstændige https-version. Se `GITHUB_PAGES.md`.
Appen viser nu præcis årsagen og tilbyder straks "Tag billede", "Vælg billede" eller "Indtast i stedet".

## Rettet i v0.5.1

1. Foto har to knapper: **Tag foto** (kamera direkte) og **Vælg foto** (fotobibliotek, flere ad gangen).
   Før åbnede alle knapper kun kameraet, så eksisterende fotos ikke kunne vælges på iPhone.
2. Kameraet kan åbnes igen efter første foto. Hvert tryk bruger et nyt filfelt, og efterladte felter ryddes op.
3. Live-scanning:
   - Bagkameraet bruges (`facingMode: environment`).
   - `playsinline`, `muted` og `autoplay` sættes før start. Ellers bliver videoen sort på iOS.
   - Kameraet stopper straks efter et fund.
4. Scanner: BarcodeDetector bruges, hvor den findes (Chrome på Android og Mac). Ellers bruges ZXing (JavaScript), som Safari på iPhone gør i dag.
5. Formater: Code 128, Code 39, Code 93, Codabar, EAN-13/8, UPC-A/E, ITF, QR, Data Matrix og PDF417.
6. Fejlbeskeder:
   - "Adgang til kameraet blev afvist" med vejledning: aA → Webstedsindstillinger → Kamera → Tillad, og en "Prøv igen"-knap.
   - "Spærret i denne visning".
   - "Kræver https".

## Testet i denne leverance (automatisk, Chromium med enhedsprofiler)

| Test | iPhone 13-profil | Android Pixel 5-profil | iPad-profil | PC |
|---|---|---|---|---|
| Live-scanning af plukrute med simuleret bagkamera | OK | OK | OK | OK |
| Kameraet stopper efter scanning | OK | | | |
| Kamera afvist → besked, iPhone-hjælp, Prøv igen, foto-alternativ | OK | | | |
| Indlejret ramme med anden oprindelse (som Claude) → "spærret", foto af stregkode aflæses | OK | | | |
| Tag foto (capture) / Vælg foto (bibliotek, flere) / genåbning | OK | | | |
| Foto af skævt og sløret stregkodebillede aflæses | OK (v0.4–v0.5) | | | |
| Fotos og registreringer bevares ved genindlæsning og ved opgradering fra v0.5.0 | OK | | | |

Profilerne efterligner skærm, berøring og browser-id, men motoren er Chromium og ikke Safari.
BarcodeDetector findes ikke i testmiljøet, så det er ZXing-vejen, der er testet.

## Kræver test på en fysisk iPhone (ikke muligt her)

- Safari: tilladelsesdialogen for kamera, live-scanning og at bagkameraet vælges.
- "Tag foto" åbner kameraet, og "Vælg foto" viser Fotobibliotek. Fotos i HEIC-format gemmes korrekt.
- Claude-appen på iPhone: om filvalg og kamera virker i dens visning.
- Aflæsning af Carlettis rigtige plukliste-stregkoder (formatet er ikke bekræftet).
- Safaris lagring over flere dage. Appen beder om vedvarende lagring, men Safari kan afvise det.
