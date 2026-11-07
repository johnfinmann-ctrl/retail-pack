# Testvejledning — RetailPackPro Demo v0.4.0

Tid: ca. 15 minutter. Alle data er fiktive. *Menu (tandhjul) → Nulstil demo*
starter forfra. Har du ingen håndscanner, så åbn *Menu → Testkoder* på en
anden skærm og scan koderne med kameraet.

## A. Medarbejder — Scan → Se → Pak (5 min)

1. Vælg **Medarbejder** → **Pakkevejledning** → **Nordhavn Supermarked**.
2. Indtast `CH-1001` (eller scan stregkoden) og tryk Enter.
   - Gul særlig instruktion øverst.
   - Billede af færdig palle og vare.
   - Lag 5, kolli pr. lag 10, 150 cm, 500 kg.
   - Label, folie, mixpalle: Nej.
3. Tryk **Godkend**. Appen viser "Godkendt" og er klar til næste scanning.
4. Søg `chokolade`. Der er flere resultater, så du vælger selv varen.
5. Tilbage → vælg **Fjordby Grossist** → `CH-1001`.
   Forventet: "Vi har ikke en pakkevejledning …" (ingen vejledning vises).
6. Tryk på **kameraknappen** ved søgefeltet og scan en testkode.

## B. Medarbejder — Ordre og paller (6 min)

1. Gå til start → **Ordrer & paller**. Scan eller indtast `ORD-10421`.
2. Se status: "0 af ca. 5" paller, 190 kolli, tre varer.
3. **Pak palle 1**. Forslaget er 50 kolli efter vejledningen.
   - Prøv at sætte 5 kolli Mælkechokolade på samme palle: appen afviser,
     fordi mixpalle ikke er tilladt.
   - Sæt den tilbage til 0.
4. **Registrér palle 1** → **Tag billede af pallen**. Tælleren viser x / 35.
5. Pak resten (**Pak næste palle** × 4) → **Alt er pakket**.
6. **Afslut ordre** → bekræft. Ordren er nu låst.
7. Prøv også `ORD-10423`. Den har allerede én palle, og mixpalle er tilladt.

## C. Administrator (4 min)

1. *Menu → Skift til administrator* → **Pakkevejledninger** → *Chokolade · EUR-palle*.
2. **Redigér** → ret maks. højde til 130 → **Gem, men vis ikke endnu**.
   Skift til medarbejder: Carletti/`CH-1001` viser stadig **160 cm**.
3. Tilbage i admin: **Forhåndsvis** viser medarbejderens skærm med 130 cm.
4. **Publicér** med teksten "Lavere højde". Medarbejderen ser nu 130 cm.
5. **Se tidligere versioner** → v1 → **Gendan** giver en ny kladde. **Annullér redigering**.
6. **Varer** → **Ny vare**. **Pakkevejledninger** → **Ny pakkevejledning**:
   - tilføj referencebillede
   - publicér
   - scan varen som medarbejder
7. **Kunder** → sæt en kunde **Inaktiv**. Den forsvinder fra medarbejderens kundevalg.

## Notér gerne

- Kunne du løse opgaven uden at spørge?
- Hvor mange tryk føltes for mange?
- Manglede der information på pakkevejledningen?
