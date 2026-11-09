import { beforeEach, describe, expect, it } from 'vitest';

import { createMemoryBlobStore, JsonStorage } from '../../../demo/storage';
import { LocalStore } from '../../data/LocalStore';
import { createSeedV5, migrateState, SCHEMA_VERSION, USERS_V5, type StateV5 } from '../../data/seed';
import { composeV5, type ServicesV5 } from '../../services';
import { summarize } from '../SplitOrderService';

let s: ServicesV5;
const { employee, owner } = USERS_V5;
const img = () => ({ data: new Blob(['x'], { type: 'image/jpeg' }), width: 10, height: 10 });

beforeEach(() => {
  s = composeV5(new LocalStore(new JsonStorage<StateV5>('t'), createMemoryBlobStore()));
});

async function packApprovedPallet(routeId: string) {
  const p = await s.registrations.startPallet(routeId, employee);
  for (const c of p.checks) await s.registrations.setCheck(p.id, c.key, true);
  await s.registrations.addPhoto({ pickrouteId: routeId, palletRecordId: p.id, image: img(), user: employee });
  return s.registrations.registerApproved(p.id, employee);
}
const route = async (id: string) => (await s.store.get('pickroutes', id))!;

describe('Testordrer', () => {
  it('1: kun H5 er ikke delt; 2 og 3 er delte med linjer pr. lagersted', async () => {
    const r1 = summarize(await route('pr-205101'));
    expect(r1.isSplit).toBe(false);
    expect(r1.decision).toBe('not_applicable');
    const r2 = summarize(await route('pr-205102'));
    expect(r2.isSplit).toBe(true);
    expect(r2.ownLines.map((l) => `${l.site}/${l.location}`)).toEqual(['H5/PLUK1']);
    expect(r2.flLines.map((l) => `${l.site}/${l.location}`)).toEqual(['FL/FL', 'FL/FL']);
    expect(r2.decision).toBe('consolidation');
    expect(summarize(await route('pr-205103')).decision).toBe('split');
  });
});

describe('Afslut Carlettis pakning', () => {
  it('kræver mindst én registreret palle og ingen paller under pakning', async () => {
    await expect(s.split.completeCarlettiPacking('pr-205101', employee)).rejects.toThrow(/mindst én palle/);
    const p = await s.registrations.startPallet('pr-205101', employee);
    expect((await route('pr-205101')).carlettiStatus).toBe('in_progress');
    expect(await s.split.completionBlockers('pr-205101')).toContain('En palle er stadig under pakning. Registrér eller annullér den.');
    await expect(s.split.completeCarlettiPacking('pr-205101', employee)).rejects.toThrow();
    await s.registrations.cancelPallet(p.id);
  });

  it('almindelig H5-ordre: Carletti færdig → afventer AX, IKKE samlet afsluttet', async () => {
    await packApprovedPallet('pr-205101');
    const { pickroute, events } = await s.split.completeCarlettiPacking('pr-205101', employee);
    expect(events.map((e) => e.type)).toEqual(['carletti_packing_completed']);
    expect(pickroute.axConfirmedComplete).toBe(false);
    expect(summarize(pickroute).overall).toBe('carletti_done_awaiting_ax');
    await expect(s.registrations.startPallet('pr-205101', employee)).rejects.toThrow(/afsluttet/);
    const done = await s.split.simulateAxAllPartsHandled('pr-205101');
    expect(summarize(done).overall).toBe('completed_in_ax');
  });

  it('DELT ORDRE: kun Carlettis del pakket → aldrig samlet afsluttet', async () => {
    for (const id of ['pr-205102', 'pr-205103']) {
      await packApprovedPallet(id);
      const { pickroute, events } = await s.split.completeCarlettiPacking(id, employee);
      expect(events.map((e) => e.type)).toEqual(['carletti_packing_completed', 'packing_completed_order_split', 'awaiting_fl']);
      expect(pickroute.carlettiStatus).toBe('completed');
      expect(pickroute.axConfirmedComplete).toBe(false);
      expect(summarize(pickroute).overall).toBe('awaiting_fl');
      // AX kan ikke bekræfte, så længe FL-linjer er åbne
      await expect(s.split.simulateAxAllPartsHandled(id)).rejects.toThrow(/stadig åbne/);
      expect((await route(id)).axConfirmedComplete).toBe(false);
      // Ingen hændelse må være en samlet færdigmelding
      const all = await s.split.listEvents(id);
      expect(all.every((e) => ['carletti_packing_completed', 'packing_completed_order_split', 'awaiting_fl', 'delivery_method_confirmed'].includes(e.type))).toBe(true);
    }
  });

  it('delt ordre afsluttes først, når FL-linjer er håndteret OG AX bekræfter', async () => {
    await packApprovedPallet('pr-205102');
    await s.split.completeCarlettiPacking('pr-205102', employee);
    await s.split.simulateAxFlLinesHandled('pr-205102');
    expect(summarize(await route('pr-205102')).overall).toBe('awaiting_fl');
    const done = await s.split.simulateAxAllPartsHandled('pr-205102');
    expect(summarize(done).overall).toBe('completed_in_ax');
  });
});

describe('Leveringsform bestemmes af Frode Laursen', () => {
  it('ny delt ordre starter som "afventer beslutning"; RetailPackPro vælger ikke selv', async () => {
    const r = await s.registrations.savePickroute(
      {
        routeNumber: '205199',
        salesOrder: '900299',
        recipientName: 'Test',
        chainId: 'ch-test',
        formatId: 'fmt-test',
        warehouseId: 'wh-test-nord',
        demoBatchIds: [],
        lines: [
          { itemNumber: 'A', description: 'a', site: 'H5' },
          { itemNumber: 'B', description: 'b', site: 'FL' },
        ],
      },
      owner,
    );
    expect(r.deliveryDecision).toBe('pending');
    await packApprovedPallet(r.id);
    await s.split.completeCarlettiPacking(r.id, employee);
    expect((await route(r.id)).deliveryDecision).toBe('pending'); // ikke valgt automatisk
    await s.split.simulateAxFlLinesHandled(r.id);
    await expect(s.split.simulateAxAllPartsHandled(r.id)).rejects.toThrow(/leveringsform/);
    await s.split.simulateFlDecision(r.id, 'consolidation', owner);
    const ev = await s.split.listEvents(r.id);
    expect(ev[0]?.type).toBe('delivery_method_confirmed');
    expect(ev[0]?.payload.deliveryDecision).toBe('consolidation');
  });

  it('leveringsform kan ikke sættes på en ordre, der ikke er delt', async () => {
    await expect(s.split.simulateFlDecision('pr-205101', 'split', owner)).rejects.toThrow(/ikke delt/);
  });

  it('AX-kvittering simuleres pr. hændelse', async () => {
    await packApprovedPallet('pr-205103');
    const { events } = await s.split.completeCarlettiPacking('pr-205103', employee);
    const acked = await s.split.simulateAck(events[0]!.id);
    expect(acked.status).toBe('acknowledged');
    expect(acked.simulated).toBe(true);
  });
});

describe('Migrering fra v0.5.0 uden datatab', () => {
  it('bevarer paller, fotos, dokumenter og regeländringer og tilføjer testordrerne', () => {
    const v050 = JSON.parse(JSON.stringify(createSeedV5())) as Record<string, unknown> & StateV5;
    // Gør den til en ægte v0.5.0-tilstand (schema 1, uden de nye felter)
    v050.schemaVersion = 1;
    v050.pickroutes = v050.pickroutes
      .filter((p) => !['pr-205101', 'pr-205102', 'pr-205103'].includes(p.id))
      .map((p) => {
        const legacy: Record<string, unknown> = { ...p };
        for (const k of ['lines', 'carlettiStatus', 'carlettiCompletedAt', 'carlettiCompletedBy', 'deliveryDecision', 'deliveryDecisionAt', 'axConfirmedComplete', 'axConfirmedAt']) delete legacy[k];
        return legacy as never;
      });
    delete (v050 as Record<string, unknown>).axEvents;
    delete (v050 as Record<string, unknown>).axInbound;
    v050.pallets.push({ id: 'old-pallet', pickrouteId: 'pr-205001', palletId: '205001-01', palletIdKind: 'auto', number: 1, status: 'approved', checks: [], deviationReason: null, snapshot: null, createdAt: 'x', createdBy: 'u', registeredAt: 'x', registeredBy: 'u' });
    v050.photos.push({ id: 'old-photo', pickrouteId: 'pr-205001', palletRecordId: 'old-pallet', fileId: 'f1', createdAt: 'x', createdBy: 'u', replacedAt: null, replacedBy: null, width: 1, height: 1, sizeBytes: 1 });
    v050.ruleSets[0]!.title = 'Ændret i v0.5.0';

    const m = migrateState(v050);
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.pallets.find((p) => p.id === 'old-pallet')).toBeTruthy();
    expect(m.photos.find((p) => p.id === 'old-photo')?.fileId).toBe('f1');
    expect(m.ruleSets[0]!.title).toBe('Ændret i v0.5.0');
    expect(m.pickroutes.find((p) => p.id === 'pr-205001')?.carlettiStatus).toBe('in_progress');
    expect(m.pickroutes.find((p) => p.id === 'pr-204874')?.lines).toEqual([]);
    expect(m.pickroutes.filter((p) => ['pr-205101', 'pr-205102', 'pr-205103'].includes(p.id))).toHaveLength(3);
    expect(m.axEvents).toEqual([]);
  });

  it('LocalStore kopierer v0.5.0-data frem og lader v0.5.0-lageret være', () => {
    const mem = new Map<string, string>();
    const fake = (key: string) =>
      Object.assign(new JsonStorage<StateV5>(key), {
        read: () => (mem.has(key) ? JSON.parse(mem.get(key)!) : null),
        write: (v: StateV5) => (mem.set(key, JSON.stringify(v)), true),
      }) as JsonStorage<StateV5>;
    const old = { ...createSeedV5(), schemaVersion: 1 };
    mem.set('v050', JSON.stringify(old));
    const store = new LocalStore(fake('v051'), createMemoryBlobStore(), fake('v050'));
    expect(store.migratedFromPrevious).toBe(true);
    expect(JSON.parse(mem.get('v050')!).schemaVersion).toBe(1); // v0.5.0 urørt
    expect(JSON.parse(mem.get('v051')!).schemaVersion).toBe(SCHEMA_VERSION);
  });
});
