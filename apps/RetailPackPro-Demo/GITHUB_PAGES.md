# Læg demoen online gratis (GitHub Pages)

Demoen er én fil: `dist/index.html` (ca. 0,8 MB). Der er intet build-trin hos
modtageren.

**Vigtigt:** GitHub Pages er kun gratis for **offentlige** repositories.
`retail-platform-core` er privat og skal forblive privat. Læg derfor
demofilen i et **separat, offentligt** repository, der kun indeholder demoen.
Det indeholder ingen kildekode og ingen rigtige data.

## Trin (ca. 5 minutter, kun i browseren)

1. Opret et nyt repository på github.com, fx `retailpackpro-demo`, og vælg **Public**.
2. **Add file → Upload files** → upload `dist/index.html`. Behold navnet `index.html`.
3. **Commit changes**.
4. **Settings → Pages** → *Source: Deploy from a branch* → Branch: `main`, mappe `/ (root)` → **Save**.
5. Efter 1–2 minutter er demoen på `https://<dit-brugernavn>.github.io/retailpackpro-demo/`.

Når der kommer en ny version: upload den nye `index.html` oven på den gamle.
Der er ingen service worker og ingen cache-versionering at holde styr på,
så alle får den nye version ved næste indlæsning.

## Hvorfor GitHub Pages ud over Claude-linket

På GitHub Pages (https) kan Safari og Chrome bruge **live-kameraet** til
stregkodescanning. I Claude-visningen er live-kamera blokeret af
sikkerhedsrammen. Her bruger appen i stedet "tag billede af stregkoden",
som virker der.

## Alternativ uden GitHub

[Netlify Drop](https://app.netlify.com/drop): træk `dist`-mappen ind i
browseren, og du får et gratis https-link.
