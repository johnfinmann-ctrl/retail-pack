# Testvejledning — RetailPackPro Demo v0.5

Tid: ca. 15 minutter. *Menu (tandhjul) → Nulstil demo* starter forfra.
*Menu → Test-pluklister* viser stregkoder, som du kan scanne fra en anden skærm.

## A. Medarbejder (8 min)

1. Vælg **Medarbejder** → **Pallevejledning** → **Salling Group** → **Netto Årslev**.
   Forventet: "Afventer officiel vejledning".
2. Tilbage → **Testkæde** → **Testlager Nord**:
   - Kravene vises med kilde, og maks. højde er 180 cm.
   - Prøv **Testlager Syd** (120 cm), **Vest** (STOP) og **Øst** (afklaring).
3. Gå til forsiden → **Ordrer & paller**. Scan eller skriv `P26110471` (et parti-ID).
   Forventet: advarsel om, at det er et parti-ID.
4. Skriv `204874`. Plukruten for SuperBrugsen Vig (Coop) åbner og viser "Afventer officiel vejledning".
5. **Ny palle** → **Start palle**:
   - Godkend er spærret.
   - **Tag foto** → **Registrér afvigelse** med begrundelse.
6. Åbn plukrute `205001` → **Ny palle**:
   - Marker alle kontrolpunkter ✓ og tag et foto.
   - Tryk **Godkend til forsendelse**.
7. Tryk på fotoet → **Erstat**.
8. Gå til forsiden → **Historik**. Søg `204874` og filtrér på status. Genindlæs siden og tjek, at alt er der endnu.

## B. Regelansvarlig og kontrollant (7 min)

1. *Menu → Skift til regelansvarlig* → **Pakkekrav** → *Testlager Syd*:
   - **Ny version** → ret maks. højde → **Send til kontrol**.
   - Medarbejderen ser stadig den gamle højde.
2. *Menu → Skift til kontrollant*: Under **Overblik → Til din kontrol** åbner du regelsættet.
   - **Forhåndsvis** → **Godkend og publicér**.
   - Medarbejderen ser nu den nye højde, og v1 står som Udgået.
3. Kontrollant: *Testlager Nord v2* → **Send retur** med begrundelse.
4. Regelansvarlig:
   - **Vejledninger** → upload en PDF.
   - **Kæder & lagre** → nyt modtagelager.
   - **Pakkekrav** → nyt regelsæt med kilde og referencebillede → send til kontrol.
   - Lad kontrollanten godkende.
   - Som medarbejder vises billedet nu som "Godkendt reference".
5. **Testordrer** → opret en testordre og scan den som medarbejder.

## C. Delte ordrer og AX-simulering (v0.5.1, 6 min)

1. Medarbejder → **Ordrer & paller** → `205101` (kun H5).
   - Lagersted H5 · PLUK1, ingen DELT-markering.
   - Pak en palle → **Afslut Carlettis pakning**. Status: "Carletti færdig — afventer AX".
2. `205102`: Den røde **DELT ORDRE**-markering viser 2 linjer hos Frode Laursen, og leveringsformen er "Konsolidering hos FL".
   - Pak en palle → **Afslut Carlettis pakning**.
   - Status: "Afventer Frode Laursen". Salgsordren er **ikke** afsluttet.
3. `205103`: Samme forløb, men med leveringsformen "Delt levering".
4. *Menu → Skift til regelansvarlig* → **AX-simulator**:
   - Prøv "AX: Alle dele håndteret" på 205102. Det afvises, fordi FL-linjerne stadig er åbne.
   - Tryk derefter "AX: FL-linjer håndteret" og så "AX: Alle dele håndteret". Status bliver "Afsluttet i AX".
   - Tryk "Simulér kvittering" på en hændelse i udbakken.
5. **Testordrer** → ny ordre med varelinjerne `H5; …` og `FL; …`.
   - Medarbejderen ser "Afventer beslutning".
   - Vælg "FL: Delt levering" i simulatoren.

## D. Kamera på iPhone

Brug https-versionen (GitHub Pages) i Safari. På Claude-linket er live-kamera spærret. Se `IPHONE_TEST.md`.

1. **Ordrer & paller** → kameraknappen. Giv tilladelse, og scan plukruten fra **Menu → Test-pluklister** på en anden skærm.
2. Afvis tilladelsen én gang og tjek beskeden. Tryk så "Prøv kameraet igen".
3. Tryk **Tag billede** på stregkoden. Koden skal aflæses.
4. På en palle: **Tag foto** to gange i træk, derefter **Vælg foto** fra fotobiblioteket.
5. Genindlæs siden og tjek, at fotos og paller stadig er der.
