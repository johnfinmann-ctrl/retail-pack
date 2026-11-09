# RetailPackPro Demo — ændringslog

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
