/**
 * Audit Trail-kontrakt (PRS §19/§29). audit_log er append-only i databasen —
 * denne pakke definerer den fælles form, alle apps skal skrive audit-events i,
 * så historikken ser ens ud uanset hvilken app en ændring kom fra.
 */

export interface AuditEvent {
  companyId: string;
  appKey: string;
  userId: string;
  /** Fx "pack_profile.published", "user.invited", "company.branding_updated". */
  action: string;
  entityType: string;
  entityId: string;
  /** Værdier FØR ændringen — udelades ved oprettelse. */
  before?: Record<string, unknown> | null;
  /** Værdier EFTER ændringen — udelades ved sletning. */
  after?: Record<string, unknown> | null;
}

export interface AuditLogger {
  record(event: AuditEvent): Promise<void>;
}

/**
 * Til unit-tests og lokal udvikling uden Supabase-forbindelse.
 * Den rigtige implementering (Supabase-insert i audit_log) tilføjes i
 * "Supabase integration"-leverancen og skal implementere samme interface —
 * ingen kaldende kode skal ændres den dag.
 */
export class InMemoryAuditLogger implements AuditLogger {
  public readonly events: Array<AuditEvent & { recordedAt: string }> = [];

  async record(event: AuditEvent): Promise<void> {
    this.events.push({ ...event, recordedAt: new Date().toISOString() });
  }
}
