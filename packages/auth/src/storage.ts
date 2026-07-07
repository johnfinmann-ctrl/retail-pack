/**
 * Storage-sti-fundament (PRS §13). MIDLERTIDIGT placeret i @platform/auth,
 * fordi den deler Supabase-klienten og tenant-scoping med resten af denne
 * pakke — flagget i Sprint 1-QA som kandidat til en selvstændig
 * @platform/storage-pakke, hvis behovet vokser (ADR-0001-stil beslutning).
 */
import type { AppKey, CompanyId } from '@platform/shared-types';

export type StorageEntityType =
  | 'reference_images'
  | 'documents'
  | 'activity_photos'
  | 'company_branding';

/**
 * Bygger den faste sti-struktur `/{company_id}/{app_key}/{entity_type}/{entity_id}/{filnavn}`
 * (PRS §13) — ingen kaldende kode konstruerer stier manuelt.
 */
export function buildStoragePath(params: {
  companyId: CompanyId;
  appKey: AppKey;
  entityType: StorageEntityType;
  entityId: string;
  fileName: string;
}): string {
  const { companyId, appKey, entityType, entityId, fileName } = params;
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${companyId}/${appKey}/${entityType}/${entityId}/${safeFileName}`;
}
