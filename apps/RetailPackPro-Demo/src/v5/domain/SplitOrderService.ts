/**
 * Delte ordrer (v0.5.1): en salgsordre i AX kan have linjer fra Carletti
 * (H5 / PLUK1) og fra Frode Laursens fjernlager (FL / FL).
 *
 * Faste regler:
 * 1. Carletti afslutter KUN sin egen pakning ("Afslut Carlettis pakning").
 * 2. Leveringsformen (konsolidering hos FL / delt levering) bestemmes af
 *    Frode Laursen. RetailPackPro vælger den aldrig selv.
 * 3. RetailPackPro markerer ALDRIG en salgsordre som samlet afsluttet. Det
 *    sker kun, når AX bekræfter, at alle dele er håndteret (simuleret her).
 * 4. Hændelser til AX lægges i en udbakke. Ingen rigtig AX-integration endnu.
 */
import { NotFoundError, ValidationError } from '@platform/config';

import { newId } from '../../demo/storage';

import { CONFIG } from './config';
import type { DataStore, DemoUserV5 } from './store';
import type { AxEvent, AxEventType, AxInbound, DeliveryDecision, OrderLine, OverallOrderStatus, Pickroute } from './types';

const now = () => new Date().toISOString();

export interface OrderSummary {
  isSplit: boolean;
  ownLines: OrderLine[];
  flLines: OrderLine[];
  openFlLines: OrderLine[];
  carlettiStatus: Pickroute['carlettiStatus'];
  decision: DeliveryDecision;
  overall: OverallOrderStatus;
  axConfirmedComplete: boolean;
}

export function summarize(p: Pickroute): OrderSummary {
  const lines = p.lines ?? [];
  const ownLines = lines.filter((l) => l.site === CONFIG.ownSite);
  const flLines = lines.filter((l) => l.site === 'FL');
  const isSplit = ownLines.length > 0 && flLines.length > 0;
  let overall: OverallOrderStatus;
  if (p.axConfirmedComplete) overall = 'completed_in_ax';
  else if (p.carlettiStatus !== 'completed') overall = 'open';
  else if (isSplit) overall = 'awaiting_fl';
  else overall = 'carletti_done_awaiting_ax';
  return {
    isSplit,
    ownLines,
    flLines,
    openFlLines: flLines.filter((l) => l.status === 'open'),
    carlettiStatus: p.carlettiStatus,
    decision: isSplit ? p.deliveryDecision : 'not_applicable',
    overall,
    axConfirmedComplete: p.axConfirmedComplete,
  };
}

export const OVERALL_LABEL: Record<OverallOrderStatus, string> = {
  open: 'Under pakning hos Carletti',
  carletti_done_awaiting_ax: 'Carletti færdig — afventer AX',
  awaiting_fl: 'Afventer Frode Laursen',
  completed_in_ax: 'Afsluttet i AX',
};

export const DECISION_LABEL: Record<DeliveryDecision, string> = {
  not_applicable: 'Ikke delt',
  pending: 'Afventer beslutning',
  consolidation: 'Konsolidering hos FL',
  split: 'Delt levering',
};

export const CARLETTI_LABEL: Record<Pickroute['carlettiStatus'], string> = {
  not_started: 'Ikke startet',
  in_progress: 'Under pakning',
  completed: 'Carlettis pakning afsluttet',
};

export const EVENT_LABEL: Record<AxEventType, string> = {
  carletti_packing_completed: 'Carletti-pakning afsluttet',
  packing_completed_order_split: 'Pakning afsluttet, men ordre delt',
  awaiting_fl: 'Afventer FL',
  delivery_method_confirmed: 'Leveringsform bekræftet',
};

export class SplitOrderService {
  constructor(private readonly store: DataStore) {}

  private async route(id: string): Promise<Pickroute> {
    const p = await this.store.get('pickroutes', id);
    if (!p) throw new NotFoundError('Plukrute');
    return p;
  }

  private async queue(p: Pickroute, type: AxEventType, payload: AxEvent['payload'], user: string): Promise<AxEvent> {
    return this.store.insert('axEvents', {
      id: newId(),
      pickrouteId: p.id,
      routeNumber: p.routeNumber,
      salesOrder: p.salesOrder,
      type,
      payload,
      createdAt: now(),
      createdBy: user,
      status: 'queued',
      acknowledgedAt: null,
      simulated: true,
    });
  }

  private async log(p: Pickroute, kind: AxInbound['kind'], value: string | null) {
    await this.store.insert('axInbound', { id: newId(), pickrouteId: p.id, kind, value, receivedAt: now(), simulated: true });
  }

  /** Hvad mangler, før Carletti kan afslutte sin pakning? (tom liste = klar) */
  async completionBlockers(routeId: string): Promise<string[]> {
    const p = await this.route(routeId);
    if (p.carlettiStatus === 'completed') return ['Carlettis pakning er allerede afsluttet.'];
    const pallets = (await this.store.list('pallets')).filter((x) => x.pickrouteId === routeId);
    const blockers: string[] = [];
    if (pallets.filter((x) => x.status !== 'in_progress').length === 0) blockers.push('Registrér mindst én palle først.');
    if (pallets.some((x) => x.status === 'in_progress')) blockers.push('En palle er stadig under pakning. Registrér eller annullér den.');
    return blockers;
  }

  /**
   * "Afslut Carlettis pakning". Afslutter KUN Carlettis del — aldrig hele
   * salgsordren. For en delt ordre sendes også "ordre delt" og "afventer FL".
   */
  async completeCarlettiPacking(routeId: string, user: DemoUserV5): Promise<{ pickroute: Pickroute; events: AxEvent[] }> {
    const blockers = await this.completionBlockers(routeId);
    if (blockers.length) throw new ValidationError(blockers[0]!);
    const p = await this.route(routeId);
    const s = summarize(p);
    const pallets = (await this.store.list('pallets')).filter((x) => x.pickrouteId === routeId && x.status !== 'in_progress');
    const deviations = pallets.filter((x) => x.status === 'deviation').length;

    const events: AxEvent[] = [];
    let updated: Pickroute | null = null;
    await this.store.transaction(async () => {
      updated = await this.store.update('pickroutes', routeId, {
        carlettiStatus: 'completed',
        carlettiCompletedAt: now(),
        carlettiCompletedBy: user.id,
        // axConfirmedComplete ændres IKKE her — kun AX kan bekræfte hele ordren
      });
      events.push(
        await this.queue(p, 'carletti_packing_completed', { site: CONFIG.ownSite, location: CONFIG.sites.H5.location, pallets: pallets.length, deviations }, user.id),
      );
      if (s.isSplit) {
        events.push(await this.queue(p, 'packing_completed_order_split', { openFlLines: s.openFlLines.length, flLines: s.flLines.length }, user.id));
        events.push(await this.queue(p, 'awaiting_fl', { deliveryDecision: p.deliveryDecision }, user.id));
      }
    });
    return { pickroute: updated!, events };
  }

  // ------------------------------------------- Simulerede indgående beskeder

  /** SIMULERET besked fra Frode Laursen om leveringsform. */
  async simulateFlDecision(routeId: string, decision: 'consolidation' | 'split', user: DemoUserV5): Promise<Pickroute> {
    const p = await this.route(routeId);
    if (!summarize(p).isSplit) throw new ValidationError('Ordren er ikke delt — der skal ikke vælges leveringsform.');
    if (p.axConfirmedComplete) throw new ValidationError('Ordren er afsluttet i AX.');
    let updated: Pickroute | null = null;
    await this.store.transaction(async () => {
      await this.log(p, 'fl_delivery_decision', decision);
      updated = await this.store.update('pickroutes', routeId, { deliveryDecision: decision, deliveryDecisionAt: now() });
      await this.queue(p, 'delivery_method_confirmed', { deliveryDecision: decision, decidedBy: 'Frode Laursen' }, user.id);
    });
    return updated!;
  }

  /** SIMULERET besked fra AX: FL's ordrelinjer er håndteret. */
  async simulateAxFlLinesHandled(routeId: string): Promise<Pickroute> {
    const p = await this.route(routeId);
    let updated: Pickroute | null = null;
    await this.store.transaction(async () => {
      await this.log(p, 'ax_fl_lines_handled', null);
      updated = await this.store.update('pickroutes', routeId, {
        lines: p.lines.map((l) => (l.site === 'FL' ? { ...l, status: 'handled' as const } : l)),
      });
    });
    return updated!;
  }

  /**
   * SIMULERET bekræftelse fra AX: alle dele er håndteret. AX bekræfter kun,
   * når Carletti er færdig — og for en delt ordre, når leveringsform er
   * besluttet, og alle FL-linjer er håndteret.
   */
  async simulateAxAllPartsHandled(routeId: string): Promise<Pickroute> {
    const p = await this.route(routeId);
    const s = summarize(p);
    if (s.carlettiStatus !== 'completed') throw new ValidationError('AX kan ikke bekræfte: Carlettis pakning er ikke afsluttet.');
    if (s.isSplit && s.decision === 'pending') throw new ValidationError('AX kan ikke bekræfte: Frode Laursen har ikke besluttet leveringsform.');
    if (s.isSplit && s.openFlLines.length > 0) throw new ValidationError(`AX kan ikke bekræfte: ${s.openFlLines.length} ordrelinje(r) hos FL er stadig åbne.`);
    let updated: Pickroute | null = null;
    await this.store.transaction(async () => {
      await this.log(p, 'ax_all_parts_handled', null);
      updated = await this.store.update('pickroutes', routeId, { axConfirmedComplete: true, axConfirmedAt: now() });
    });
    return updated!;
  }

  /** SIMULERET kvittering fra AX for en udgående hændelse. */
  async simulateAck(eventId: string): Promise<AxEvent> {
    const e = await this.store.get('axEvents', eventId);
    if (!e) throw new NotFoundError('Hændelse');
    if (e.status === 'acknowledged') return e;
    return this.store.update('axEvents', eventId, { status: 'acknowledged', acknowledgedAt: now() });
  }

  async listEvents(routeId?: string): Promise<AxEvent[]> {
    // Nyeste først; ved samme tidsstempel bevares indsættelsesrækkefølgen (seneste først)
    return (await this.store.list('axEvents'))
      .filter((e) => !routeId || e.pickrouteId === routeId)
      .reverse()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listInbound(routeId?: string): Promise<AxInbound[]> {
    return (await this.store.list('axInbound')).filter((e) => !routeId || e.pickrouteId === routeId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }
}
