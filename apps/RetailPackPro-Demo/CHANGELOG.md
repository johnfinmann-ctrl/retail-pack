# RetailPackPro Demo — ændringslog

## v0.5.1-demo — Delte ordrer (Carletti H5 / Frode Laursen FL) og kamera på iPhone

**Delte ordrer**
- Ordrelinjer har lagersted (H5 / PLUK1 = Carletti, FL / FL = Frode Laursen fjernlager). En ordre med både H5 og FL markeres som **DELT ORDRE**.
- Varelinjer vises pr. lagersted. FL-linjer er markeret "Åben hos FL" eller "Håndteret (AX)".
- **Afslut Carlettis pakning** afslutter kun Carlettis del. Det kræver mindst én registreret palle og ingen paller under pakning.
- Leveringsform (**Afventer beslutning / Konsolidering hos FL / Delt levering**) bestemmes af Frode Laursen. RetailPackPro vælger den aldrig selv.
- RetailPackPro markerer aldrig en salgsordre som samlet afsluttet. Det sker kun, når AX bekræfter, at alle dele er håndteret.
- Udbakke til AX med hændelserne *Carletti-pakning afsluttet*, *Pakning afsluttet, men ordre delt*, *Afventer FL* og *Leveringsform bekræftet*.
- **AX-simulator** i admin, hvor man simulerer kvitteringer, Frode Laursens beslutning, at FL-linjer er håndteret, og at alle dele er håndteret. Der er ingen rigtig AX-integration.
- Tre nye testordrer: 205101 (kun H5), 205102 (H5+FL, konsolidering) og 205103 (H5+FL, delt levering).
- Data fra v0.5.0 kopieres frem ved første start: registreringer, fotos, dokumenter og regeländringer. v0.5.0's egne data røres ikke.

**Kamera (iPhone)**
- Foto: Der er nu to knapper. **Tag foto** åbner kameraet direkte. **Vælg foto** åbner iPhones menu med Fotobibliotek, Tag foto og Vælg fil, og der kan vælges flere fotos. Erstat kan også bruge et eksisterende foto.
- Kameraet kan altid åbnes igen. Et nyt filfelt bruges hver gang, og efterladte felter ryddes op.
- Live-scanning:
  - Bagkameraet bruges.
  - iOS-krav (playsinline, muted, autoplay) sættes, før videoen starter.
  - Kameraet stopper straks, når en kode er fundet.
- Fejlbeskeder skelner mellem fire tilfælde: kamera afvist af brugeren (med iPhone-vejledning og "Prøv igen"), spærret af indlejret visning (fx Claude), manglende https og ingen kamera-API. En teknisk linje viser https, kamera-API, indlejret visning og scannertype.
- Stregkodeformater er udvidet med Code 93, Codabar, Data Matrix og PDF417, fordi plukrutens format i AX endnu ikke er bekræftet.
- Appen beder browseren om vedvarende lagring, så Safari ikke rydder data efter 7 dage uden brug.

## v0.5.0-demo — Kædernes pakkekrav

**Nyt**
- Regelbank: detailkæde → kædeformat → modtagelager → regelsæt med kilde (dokument, afsnit/side) pr. krav.
- Kildedokumenter: upload af PDF/billede, dokumentversion og gyldighed fra/til.
- Regelmotor med nedarvning og forrang samt STOP ved konflikt. Afklaring ved uklare, manglende eller udløbne krav. "Afventer officiel vejledning" når der ikke er godkendte krav.
- Arbejdsgang Udkast → Afventer kontrol → Godkendt til visning → Udgået, med firøjne-princip (regelansvarlig og kontrollant er separate roller) og versionshistorik.
- Medarbejderforside: Pallevejledning, Ordrer & paller og Historik.
- Plukrute-scanning efter AX-pluklistens opbygning. Parti-ID og salgsordre genkendes og åbner ikke ordren. Det fremgår, at opslaget ikke sker i AX.
- Pallekontrol med kontrolpunkter. Godkendt til forsendelse kræver opfyldte krav og foto. Afvigelse kræver begrundelse og foto og bliver aldrig godkendt.
- Palle-ID dannes automatisk (plukrute-løbenummer) eller ved scanning af SSCC med kontrolciffer-validering.
- Fotos kan erstattes (og logges). Fotos på registrerede paller kan ikke slettes.
- Historik med søgning og filtre. Hver registrering gemmer, hvilke regelsæt og dokumenter der gjaldt.
- Admin: overblik over manglende vejledninger, kæder og lagre, vejledninger, pakkekrav, forhåndsvisning og testordrer.
- Test-pluklister med plukrute øverst og parti-ID'er nedenfor.

**Fjernet fra brugerfladen** (koden er bevaret i v0.4.0-referencen)
- Pakkevejledning pr. kunde og varenummer.
- Ordrelinjer, palleforslag, kolli-fordeling og kapacitets- og mixpalle-beregning.
- Genererede palletegninger som vejledning. Billeder mærkes nu "Godkendt reference" eller "Illustration — ikke dokumentation".

**Uændret / genbrugt**
- Designsystem, håndscanner, manuel indtastning, kamerascanning (live og foto), 35-fotogrænse, lokal lagring og nulstilling.

## v0.4.0-demo
Se `reference/retailpackpro-demo-v0.4.0.html` og git-tag `v0.4.0-demo`.
