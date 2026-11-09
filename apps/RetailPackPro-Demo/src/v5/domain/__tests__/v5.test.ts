import { beforeEach, describe, expect, it } from 'vitest';

import { createMemoryBlobStore, JsonStorage } from '../../../demo/storage';
import { LocalStore } from '../../data/LocalStore';
import { USERS_V5, type StateV5 } from '../../data/seed';
import { composeV5, seedHistory, type ServicesV5 } from '../../services';
import { parseSscc } from '../RegistrationService';
import { MAX_PHOTOS_PER_ORDER } from '../types';

let s: ServicesV5;
const { employee, owner, reviewer } = USERS_V5;
const img = () => ({ data: new Blob(['x'], { type: 'image/jpeg' }), width: 10, height: 10 });

beforeEach(() => {
  s = composeV5(new LocalStore(new JsonStorage<StateV5>('t'), createMemoryBlobStore()));
});

const resolveWh = (chainId: string, warehouseId: string | null, formatId: string | null = null) =>
  s.rules.resolve({ chainId, formatId, warehouseId });

describe('Regelmotor', () => {
  it('rigtige kæder uden indlæst vejledning → "afventer"', async () => {
    for (const [chain, wh] of [
      ['ch-salling', 'wh-netto-aarslev'],
      ['ch-salling', 'wh-netto-koege'],
      ['ch-coop', null],
      ['ch-dagrofa', null],
      ['ch-reitan', null],
      ['ch-lidl', null],
    ] as const) {
      const r = await resolveWh(chain, wh);
      expect(r.status, chain).toBe('awaiting');
      expect(r.fields).toHaveLength(0);
    }
  });

  it('nedarvning: lager har forrang for kæde, resten arves', async () => {
    const r = await resolveWh('ch-test', 'wh-test-nord');
    expect(r.status).toBe('ok');
    const get = (k: string) => r.fields.find((f) => f.key === k);
    expect(get('maxHeightCm')).toMatchObject({ value: '180', level: 'warehouse' });
    expect(get('palletType')).toMatchObject({ value: 'EUR-palle 120 × 80 cm', level: 'chain', sourceRef: 'afsnit 2.1, s. 3' });
  });

  it('to lagre i samme kæde kan have forskellige krav', async () => {
    const nord = await resolveWh('ch-test', 'wh-test-nord');
    const syd = await resolveWh('ch-test', 'wh-test-syd');
    expect(nord.fields.find((f) => f.key === 'maxHeightCm')?.value).toBe('180');
    expect(syd.fields.find((f) => f.key === 'maxHeightCm')?.value).toBe('120');
    expect(syd.fields.find((f) => f.key === 'labelPlacement')?.value).toBe('Kun kortside, øverst til højre');
  });

  it('modstridende godkendte krav på samme niveau → STOP', async () => {
    const r = await resolveWh('ch-test', 'wh-test-vest');
    expect(r.status).toBe('stop');
    expect(r.conflicts[0]?.key).toBe('maxHeightCm');
    expect(r.conflicts[0]?.values.map((v) => v.value).sort()).toEqual(['140', '150']);
    expect(r.fields.find((f) => f.key === 'maxHeightCm')).toBeUndefined();
  });

  it('uklart krav og udløbet kildedokument → AFKLARING, ingen fallback til kædens krav', async () => {
    const r = await resolveWh('ch-test', 'wh-test-oest');
    expect(r.status).toBe('clarify');
    expect(r.unclear).toContain('specialRequirements');
    expect(r.expired.map((e) => e.key)).toContain('labelPlacement');
    expect(r.fields.find((f) => f.key === 'labelPlacement')).toBeUndefined();
  });

  it('udkast og "afventer kontrol" vises ikke', async () => {
    const r = await resolveWh('ch-test', 'wh-test-nord');
    expect(r.fields.find((f) => f.key === 'maxHeightCm')?.value).not.toBe('170'); // v2 afventer kontrol
    expect(r.fields.find((f) => f.key === 'interlayer')).toBeUndefined(); // udkast
  });

  it('obligatorisk felt uden værdi → AFKLARING', async () => {
    const d = await s.rules.createDraft({ scope: { level: 'chain', chainId: 'ch-lidl', formatId: null, warehouseId: null }, title: 'Lidl test' }, owner);
    const doc = await s.rules.saveDocument({ chainId: 'ch-lidl', title: 'Testdok', docVersion: '1', validFrom: '2026-01-01', validTo: null }, owner);
    await s.rules.updateDraft(d.id, { requiredFields: ['maxHeightCm', 'labels'], fields: { labels: { value: 'SSCC', sourceDocId: doc.id, sourceRef: 's. 1', unclear: false, checkpoint: true } } }, owner);
    const r = await s.rules.resolve({ chainId: 'ch-lidl', formatId: null, warehouseId: null, hypothetical: (await s.store.get('ruleSets', d.id))! });
    expect(r.status).toBe('clarify');
    expect(r.missing).toEqual(['maxHeightCm']);
  });
});

describe('Arbejdsgang: udkast → kontrol → publiceret (firøjne)', () => {
  it('kontrollant godkender; forfatter kan ikke godkende; forrige version udgår', async () => {
    const nv = await s.rules.newVersion('rs-test-syd', owner);
    await s.rules.updateDraft(nv.id, { fields: { ...nv.fields, maxHeightCm: { ...nv.fields.maxHeightCm!, value: '110' } } }, owner);

    // Udkast påvirker ikke medarbejderen
    expect((await resolveWh('ch-test', 'wh-test-syd')).fields.find((f) => f.key === 'maxHeightCm')?.value).toBe('120');

    await s.rules.submitForReview(nv.id, 'Højde sænket', owner);
    await expect(s.rules.approveAndPublish(nv.id, '', owner)).rejects.toThrow(/Kun kontrollant/);
    expect((await resolveWh('ch-test', 'wh-test-syd')).fields.find((f) => f.key === 'maxHeightCm')?.value).toBe('120');

    await s.rules.approveAndPublish(nv.id, 'Kontrolleret mod dok. v2.0', reviewer);
    expect((await resolveWh('ch-test', 'wh-test-syd')).fields.find((f) => f.key === 'maxHeightCm')?.value).toBe('110');
    const hist = await s.rules.history('rs-test-syd');
    expect(hist.map((h) => `${h.version}:${h.status}`)).toEqual(['2:approved', '1:retired']);
  });

  it('kontrollant kan ikke godkende eget arbejde, og afvisning kræver begrundelse', async () => {
    const d = await s.rules.newVersion('rs-test-chain', owner);
    await s.rules.submitForReview(d.id, '', owner);
    const forged = { ...reviewer, id: owner.id }; // samme person i to roller
    await expect(s.rules.approveAndPublish(d.id, '', forged)).rejects.toThrow(/selv har udarbejdet/);
    await expect(s.rules.reject(d.id, '', reviewer)).rejects.toThrow(/hvorfor/);
    const back = await s.rules.reject(d.id, 'Side 4 passer ikke', reviewer);
    expect(back.status).toBe('draft');
  });

  it('krav uden kildehenvisning kan ikke sendes til kontrol', async () => {
    const d = await s.rules.createDraft({ scope: { level: 'chain', chainId: 'ch-coop', formatId: null, warehouseId: null }, title: 'Coop' }, owner);
    await s.rules.updateDraft(d.id, { fields: { maxHeightCm: { value: '170', sourceDocId: null, sourceRef: '', unclear: false, checkpoint: true } } }, owner);
    await expect(s.rules.submitForReview(d.id, '', owner)).rejects.toThrow(/kildedokument/);
  });
});

describe('Plukrute, pallekontrol og afvigelse', () => {
  it('plukrute findes; parti-ID og salgsordre genkendes og forveksles ikke', async () => {
    expect((await s.registrations.lookup('204874')).kind).toBe('pickroute');
    expect((await s.registrations.lookup('P26110471')).kind).toBe('batch');
    expect((await s.registrations.lookup('334327')).kind).toBe('salesOrder');
    expect((await s.registrations.lookup('999999')).kind).toBe('none');
  });

  it('godkendt til forsendelse kræver gældende krav, alle kontrolpunkter OK og foto', async () => {
    const p = await s.registrations.startPallet('pr-205001', employee);
    expect(p.palletId).toBe('205001-01');
    expect(p.checks.length).toBeGreaterThan(5);
    await expect(s.registrations.registerApproved(p.id, employee)).rejects.toThrow(/kontrolpunkter/);
    for (const c of p.checks) await s.registrations.setCheck(p.id, c.key, true);
    await expect(s.registrations.registerApproved(p.id, employee)).rejects.toThrow(/foto/);
    await s.registrations.addPhoto({ pickrouteId: 'pr-205001', palletRecordId: p.id, image: img(), user: employee });
    const done = await s.registrations.registerApproved(p.id, employee);
    expect(done.status).toBe('approved');
    expect(done.snapshot?.ruleSets.map((r) => r.id).sort()).toEqual(['rs-test-chain', 'rs-test-nord']);
  });

  it('afventer/konflikt: kan ALDRIG godkendes — kun afvigelse med begrundelse og foto', async () => {
    for (const pr of ['pr-204874', 'pr-205003', 'pr-205004']) {
      const p = await s.registrations.startPallet(pr, employee);
      await expect(s.registrations.registerApproved(p.id, employee)).rejects.toThrow();
      await expect(s.registrations.registerDeviation(p.id, 'Krav er uklart', employee)).rejects.toThrow(/foto/);
      await s.registrations.addPhoto({ pickrouteId: pr, palletRecordId: p.id, image: img(), user: employee });
      await expect(s.registrations.registerDeviation(p.id, '', employee)).rejects.toThrow(/begrundelse/);
      const dev = await s.registrations.registerDeviation(p.id, 'Krav ikke afklaret, aftalt med teamleder', employee);
      expect(dev.status).toBe('deviation');
    }
  });

  it('et ikke-opfyldt kontrolpunkt forhindrer godkendelse', async () => {
    const p = await s.registrations.startPallet('pr-205002', employee);
    for (const c of p.checks) await s.registrations.setCheck(p.id, c.key, c.key !== 'maxHeightCm');
    await s.registrations.addPhoto({ pickrouteId: 'pr-205002', palletRecordId: p.id, image: img(), user: employee });
    expect(await s.registrations.approvalBlockers(p.id)).toContain('Et eller flere kontrolpunkter er ikke opfyldt.');
  });

  it('SSCC som palle-ID valideres og skal være entydigt', async () => {
    expect(parseSscc('(00)357123450000000015')).toBe('357123450000000015');
    expect(parseSscc('357123450000000016')).toBeNull();
    await s.registrations.startPallet('pr-205001', employee, '357123450000000015');
    await expect(s.registrations.startPallet('pr-205002', employee, '357123450000000015')).rejects.toThrow(/allerede brugt/);
  });
});

describe('Fotodokumentation', () => {
  it(`højst ${MAX_PHOTOS_PER_ORDER} pr. ordre; erstat tæller ikke ekstra`, async () => {
    const p = await s.registrations.startPallet('pr-205001', employee);
    let last;
    for (let i = 0; i < MAX_PHOTOS_PER_ORDER; i++) {
      last = await s.registrations.addPhoto({ pickrouteId: 'pr-205001', palletRecordId: p.id, image: img(), user: employee });
    }
    await expect(s.registrations.addPhoto({ pickrouteId: 'pr-205001', palletRecordId: null, image: img(), user: employee })).rejects.toThrow(/højst gemmes 35/);
    const replaced = await s.registrations.replacePhoto(last!.id, img(), employee);
    expect(replaced.replacedAt).not.toBeNull();
    expect((await s.registrations.listPhotos('pr-205001')).length).toBe(35);
  });

  it('fotos på registreret palle kan erstattes men ikke slettes', async () => {
    const p = await s.registrations.startPallet('pr-204874', employee);
    const ph = await s.registrations.addPhoto({ pickrouteId: 'pr-204874', palletRecordId: p.id, image: img(), user: employee });
    await s.registrations.registerDeviation(p.id, 'Afventer vejledning', employee);
    await expect(s.registrations.removePhoto(ph.id)).rejects.toThrow(/kun erstattes/);
    await s.registrations.replacePhoto(ph.id, img(), employee);
  });
});

describe('Historik', () => {
  it('finder registreringer på plukrute, salgsordre, palle-ID og modtager', async () => {
    await seedHistory(s);
    expect((await s.registrations.history()).length).toBe(2);
    expect((await s.registrations.history({ query: 'vig' }))[0]?.pickroute.routeNumber).toBe('204874');
    expect((await s.registrations.history({ query: '334327' })).length).toBe(1);
    expect((await s.registrations.history({ query: '205002-01' })).length).toBe(1);
    expect((await s.registrations.history({ status: 'deviation' })).length).toBe(1);
  });
});
