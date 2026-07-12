# RetailPackPro — Brugertestguide til Carletti (MVP v0.3.0)

## Testens formål

At finde ud af, om en rigtig lagermedarbejder kan lære og bruge RetailPackPro **uden
oplæring**, og om en rigtig administrator kan oprette og redigere en pakkemetode
**hurtigt og trygt** — før vi bygger videre. Vi tester ikke jer. Vi tester appen.
Alt, hvad der er svært eller forvirrende, er noget vi skal rette — ikke noget I gør forkert.

**Vigtigt at vide:** Denne version har tre bevidste begrænsninger (se
`apps/RetailPackPro/README.md`): ingen fil-upload af billeder (kun links), ingen
kamera-scanning (kun manuel indtastning/søgning), og ingen offline-understøttelse ved
godkendelse. Det er ikke fejl — det er ting, vi endnu ikke har bygget.

---

## Opgaver til medarbejderen

Test på en telefon eller tablet, som en almindelig arbejdsdag ville foregå.

1. **Åbn appen og log ind.** (Notér: forstod du med det samme, hvad du skulle gøre?)
2. **Vælg en kunde** (hvis der er mere end én at vælge imellem).
3. **Find en vare** ved at skrive dens stregkode/varenummer i feltet.
4. **Find den samme vare igen — denne gang ved at skrive navnet i stedet.**
5. **Se pakkemetoden**, der vises. Kig på billedet og tallene.
6. **Godkend pakningen.**
7. **Gentag trin 3-6 for 2-3 andre varer**, som en normal arbejdsgang.
8. **Prøv at skrive en stregkode, der ikke findes**, og se hvad der sker.

## Opgaver til admin

Test på en computer eller tablet.

1. **Log ind som admin.**
2. **Opret en ny kunde.**
3. **Opret et nyt produkt.**
4. **Opret en ny pakkemetode** til den nye kunde — gennemfør hele guiden, inklusiv
   preview, og publicér den.
5. **Gå ind og redigér** den pakkemetode, du lige har publiceret. Skift ét tal (fx
   antal lag), skriv en kort ændringsbeskrivelse, og publicér igen.
6. **Se tidligere versioner** af pakkemetoden — tjek at begge versioner er der.
7. **Gendan den første version.**
8. **Bed en kollega om at forsøge at redigere samme pakkemetode samtidig med dig**
   (mens du stadig er inde i redigeringen) — se hvad der sker.

## Observationer der skal noteres (undervejs, ikke bagefter)

For hver opgave, notér:

- **Tid:** ca. hvor lang tid tog opgaven?
- **Tøven:** stoppede personen op eller så usikker ud på noget tidspunkt? Hvor?
- **Spørgsmål:** stillede personen et spørgsmål til jer, mens de brugte appen? Hvilket?
- **Fejltryk:** trykkede personen forkert, eller på noget der ikke gjorde, hvad de troede?
- **Direkte citater:** skriv gerne præcis, hvad personen siger højt undervejs
  ("Hvad betyder det her?", "Nå, det var nemt", osv.) — de er ofte mere nyttige end
  jeres egen fortolkning.

## 5 spørgsmål efter testen

Stil disse til medarbejderen/admin, hver for sig, umiddelbart efter testen:

1. Var der noget, du var i tvivl om, mens du brugte appen?
2. Var der noget, du forventede skulle ske, men som ikke skete?
3. Hvis du skulle forklare en kollega, hvordan appen virker, hvad ville du sige?
4. Var der noget, der føltes unødvendigt eller i vejen?
5. På en skala fra 1-5: hvor sikker føler du dig på at bruge appen alene i morgen?
