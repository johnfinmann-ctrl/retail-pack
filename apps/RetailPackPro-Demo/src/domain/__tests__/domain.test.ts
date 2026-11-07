import { describe, expect, it, beforeEach } from 'vitest';

import { DemoDatabase } from '../../data/DemoRepositories';
import { COMPANY_ID, USERS, type DemoState } from '../../demo/seed';
import { createMemoryBlobStore, JsonStorage } from '../../demo/storage';
import { composeServices, type AppServices } from '../../services';
import { normalizeScannedCode } from '../ProductLookupService';
import { MAX_PHOTOS_PER_ORDER } from '../types';

let s: AppServices;

beforeEach(() => {
  s = composeServices(new DemoDatabase(new JsonStorage<DemoState>('test'), createMemoryBlobStore()));
});

const photo = () => ({ data: new Blob(['x'], { type: 'image/jpeg' }), width: 10, height: 10, mimeType: 'image/jpeg' });

describe('Opslag (Scan)', () => {
  it('finder vare på EAN, varenummer og navn', async () => {
    const product = s.db.state.products[0]!;
    expect((await s.lookup.lookup(COMPANY_ID, product.ean)).kind).toBe('product');
    expect((await s.lookup.lookup(COMPANY_ID, product.itemNumber.toLowerCase())).kind).toBe('product');
    expect((await s.lookup.lookup(COMPANY_ID, 'chokolade')).kind).toBe('multiple');
    expect((await s.lookup.lookup(COMPANY_ID, 'findes-ikke')).kind).toBe('none');
  });

  it('genkender ordrenummer, også uden præfiks', async () => {
    expect((await s.lookup.lookup(COMPANY_ID, 'ORD-10421')).kind).toBe('order');
    expect((await s.lookup.lookup(COMPANY_ID, '10421')).kind).toBe('order');
  });

  it('fjerner scanner-præfiks og GS1-notation', () => {
    expect(normalizeScannedCode(']E02000001001009')).toBe('2000001001009');
    expect(normalizeScannedCode('(01)02000001001009')).toBe('2000001001009');
  });
});

describe('Pakkevejledning (v0.3.0-service genbrugt)', () => {
  it('vareprioritet: specifik vejledning går forud for "alle varer"', async () => {
    const guide = await s.packGuide.getGuideFor(COMPANY_ID, 'c-nordhavn', 'p-ch1001');
    expect(guide?.profile.id).toBe('pp-nordhavn-heat');
    const general = await s.packGuide.getGuideFor(COMPANY_ID, 'c-nordhavn', 'p-lk3001');
    expect(general?.profile.id).toBe('pp-nordhavn-std');
  });

  it('kunde uden vejledning for varen giver null (ingen vejledning-skærm)', async () => {
    expect(await s.packGuide.getGuideFor(COMPANY_ID, 'c-fjordby', 'p-ch1001')).toBeNull();
  });

  it('kladde påvirker ikke medarbejderen før publicering', async () => {
    const published = s.db.state.profiles.find((p) => p.id === 'pp-carletti-std')!;
    const start = await s.packProfileEditing.startEditing(published, USERS.admin.id);
    if (start.outcome !== 'ready') throw new Error('forventede ready');
    await s.guideAdmin.saveDraft(start.draft.id, { maxHeightCm: 120, unitsPerLayer: 9 });

    const before = await s.packGuide.getGuideFor(COMPANY_ID, 'c-carletti', 'p-ch1001');
    expect(before?.profile.maxHeightCm).toBe(160);

    await s.packProfileEditing.publish(start.draft.id, USERS.admin.id, 'Lavere højde');
    const after = await s.packGuide.getGuideFor(COMPANY_ID, 'c-carletti', 'p-ch1001');
    expect(after?.profile.maxHeightCm).toBe(120);
    expect((after?.profile as unknown as { unitsPerLayer: number }).unitsPerLayer).toBe(9);

    const history = await s.packProfileEditing.listVersionHistory(published.lineageId);
    expect(history.map((h) => [h.version, h.isCurrent])).toEqual([
      [2, true],
      [1, false],
    ]);
  });
});

describe('Ordrer og paller', () => {
  it('skønner antal paller ud fra kapacitet og mixpalle-regel', async () => {
    expect((await s.orders.getOverview('o-10421')).progress.palletsEstimated).toBe(5); // ikke-mix: 2+2+1
    expect((await s.orders.getOverview('o-10422')).progress.palletsEstimated).toBe(2);
    expect((await s.orders.getOverview('o-10423')).progress.palletsEstimated).toBe(3);
  });

  it('kan ikke pakke mere end ordren mangler, og kan først afsluttes når alt er pakket', async () => {
    await expect(
      s.orders.registerPallet('o-10422', [{ productId: 'p-jk5001', quantity: 25 }], USERS.employee.id),
    ).rejects.toThrow(/mangler kun 24/);
    await expect(s.orders.completeOrder('o-10422', USERS.employee.id)).rejects.toThrow(/mangler stadig/);

    let overview = await s.orders.getOverview('o-10422');
    while (overview.progress.remainingQuantity > 0) {
      const { suggestNextPallet } = await import('../OrderService');
      await s.orders.registerPallet('o-10422', suggestNextPallet(overview.progress, overview.guides), USERS.employee.id);
      overview = await s.orders.getOverview('o-10422');
    }
    expect(overview.pallets).toHaveLength(2); // mixpalle med CH-1001 + CH-1002, særskilt palle til julekalender
    expect(overview.pallets[0]!.lines).toEqual([
      { productId: 'p-ch1001', quantity: 48 },
      { productId: 'p-ch1002', quantity: 24 },
    ]);
    const done = await s.orders.completeOrder('o-10422', USERS.employee.id);
    expect(done.status).toBe('completed');
    await expect(
      s.orders.registerPallet('o-10422', [{ productId: 'p-ch1001', quantity: 1 }], USERS.employee.id),
    ).rejects.toThrow(/afsluttet/);
  });

  it('fortryd seneste palle sletter også pallens billeder', async () => {
    const pallet = await s.orders.registerPallet('o-10421', [{ productId: 'p-ch1001', quantity: 50 }], USERS.employee.id);
    await s.photos.addPhoto({ companyId: COMPANY_ID, orderId: 'o-10421', palletId: pallet.id, userId: USERS.employee.id, photo: photo() });
    await s.photos.addPhoto({ companyId: COMPANY_ID, orderId: 'o-10421', palletId: null, userId: USERS.employee.id, photo: photo() });
    await s.orders.undoLastPallet('o-10421');
    const overview = await s.orders.getOverview('o-10421');
    expect(overview.pallets).toHaveLength(0);
    expect(overview.photoCount).toBe(1);
    expect(overview.order.status).toBe('open');
  });
});

describe('Fotodokumentation', () => {
  it(`tillader højst ${MAX_PHOTOS_PER_ORDER} billeder pr. ordre`, async () => {
    for (let i = 0; i < MAX_PHOTOS_PER_ORDER; i++) {
      await s.photos.addPhoto({ companyId: COMPANY_ID, orderId: 'o-10421', palletId: null, userId: USERS.employee.id, photo: photo() });
    }
    expect(await s.photos.remainingSlots('o-10421')).toBe(0);
    await expect(
      s.photos.addPhoto({ companyId: COMPANY_ID, orderId: 'o-10421', palletId: null, userId: USERS.employee.id, photo: photo() }),
    ).rejects.toThrow(/højst gemmes 35/);
  });

  it('gemmer selve billedet, så det kan vises igen', async () => {
    const rec = await s.photos.addPhoto({ companyId: COMPANY_ID, orderId: 'o-10421', palletId: null, userId: USERS.employee.id, photo: photo() });
    const blob = await s.photos.getPhotoData(rec.id);
    expect(blob?.size).toBe(1);
  });
});

describe('Katalog-admin', () => {
  it('redigerer vare og afviser dubletter', async () => {
    const updated = await s.repos.catalog.updateProduct('p-ch1001', { name: 'Mørk chokolade 85 %' });
    expect(updated.name).toBe('Mørk chokolade 85 %');
    await expect(s.repos.catalog.updateProduct('p-ch1001', { itemNumber: 'CH-1002' })).rejects.toThrow(/Varenummeret/);
  });

  it('inaktiv kunde vises ikke for medarbejderen', async () => {
    await s.repos.catalog.updateCustomer('c-fjordby', { active: false });
    const active = await s.customers.listActiveCustomers(COMPANY_ID);
    expect(active.map((c) => c.id)).not.toContain('c-fjordby');
  });
});

describe('Palleregler fra pakkevejledningen', () => {
  it('afviser mixpalle, når vejledningen ikke tillader det', async () => {
    // ORD-10421: varmefølsom chokolade — mixpalle ikke tilladt
    await expect(
      s.orders.registerPallet(
        'o-10421',
        [
          { productId: 'p-ch1001', quantity: 10 },
          { productId: 'p-ch1002', quantity: 10 },
        ],
        USERS.employee.id,
      ),
    ).rejects.toThrow(/Mixpalle er ikke tilladt/);
  });

  it('afviser en palle, der overstiger kapaciteten (lag × kolli pr. lag)', async () => {
    await expect(
      s.orders.registerPallet('o-10421', [{ productId: 'p-ch1001', quantity: 51 }], USERS.employee.id),
    ).rejects.toThrow(/rummer mere/);
  });

  it('tillader mixpalle inden for kapaciteten', async () => {
    // ORD-10423: slik på halvpalle, mixpalle tilladt, 32 kolli pr. palle
    const pallet = await s.orders.registerPallet(
      'o-10423',
      [
        { productId: 'p-lk3001', quantity: 8 },
        { productId: 'p-vg4001', quantity: 24 },
      ],
      USERS.employee.id,
    );
    expect(pallet.number).toBe(2);
  });
});
