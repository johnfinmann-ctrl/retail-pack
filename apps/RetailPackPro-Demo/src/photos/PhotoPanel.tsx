/**
 * Fotodokumentation for én ordre (op til 35 billeder i alt, på ordren og
 * dens paller). Billeder tages med enhedens kamera via filvælgeren — på
 * telefon og tablet åbner den kameraet direkte; på PC vælges en billedfil.
 * Der vises aldrig "gemt", før billedet faktisk er gemt.
 */
import { useState } from 'react';

import type { DemoSession } from '../demo/session';
import type { Pallet, PhotoRecord } from '../domain/types';
import { MAX_PHOTOS_PER_ORDER } from '../domain/types';
import { formatDateTime, t } from '../i18n';
import { getServices } from '../services';
import { ConfirmSheet, errorText, Lightbox, useAsync, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';
import { compressImage, Img, pickImageFile } from '../ui/media';

export async function captureAndStore(input: {
  session: DemoSession;
  orderId: string;
  palletId: string | null;
  toast: (m: string, k?: 'ok' | 'err' | 'info') => void;
}): Promise<number> {
  const s = getServices();
  // Filvælgeren SKAL åbnes synkront i klikket — ellers blokerer Safari og
  // indlejrede visninger den. Pladsen tjekkes bagefter.
  const picking = pickImageFile({ capture: true, multiple: true });
  const files = await picking;
  if (files.length === 0) return 0;
  const free = await s.photos.remainingSlots(input.orderId);
  if (free <= 0) {
    input.toast(t('demo.photo.limit', { max: MAX_PHOTOS_PER_ORDER }), 'err');
    return 0;
  }
  let saved = 0;
  let firstError: string | null = null;
  for (const file of files.slice(0, free)) {
    try {
      const photo = await compressImage(file);
      await s.photos.addPhoto({
        companyId: input.session.companyId,
        orderId: input.orderId,
        palletId: input.palletId,
        userId: input.session.userId,
        photo,
      });
      saved++;
    } catch (e) {
      firstError ??= errorText(e);
    }
  }
  const skipped = files.length - Math.min(files.length, free);
  if (saved > 0) {
    input.toast(saved === 1 ? t('demo.photo.saved_one') : t('demo.photo.saved_many', { n: saved }), 'ok');
  }
  if (firstError) input.toast(firstError, 'err');
  else if (skipped > 0) input.toast(t('demo.photo.skipped', { n: skipped, max: MAX_PHOTOS_PER_ORDER }), 'err');
  return saved;
}

export function PhotoPanel({
  session,
  orderId,
  pallets,
  readOnly,
  version,
  onChanged,
}: {
  session: DemoSession;
  orderId: string;
  pallets: Pallet[];
  readOnly: boolean;
  /** Ændres udefra, når billeder er tilføjet andre steder (fx på en palle). */
  version: number;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { data: photos, reload } = useAsync(() => getServices().photos.listForOrder(orderId), [orderId, version]);
  const [open, setOpen] = useState<PhotoRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PhotoRecord | null>(null);
  const persistent = getServices().db.blobs.persistent;

  const palletNo = (id: string | null) => pallets.find((p) => p.id === id)?.number;
  const count = photos?.length ?? 0;
  const full = count >= MAX_PHOTOS_PER_ORDER;

  return (
    <section className="panel" aria-labelledby="photos-h">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 id="photos-h" style={{ flex: 1 }}>
          {t('demo.photo.title')}
        </h2>
        <span className="counter" aria-label={t('demo.photo.counter_aria', { n: count, max: MAX_PHOTOS_PER_ORDER })}>
          {count} / {MAX_PHOTOS_PER_ORDER}
        </span>
      </div>

      {!persistent && (
        <div className="notice warn">
          <Icon name="info" />
          <div className="grow">{t('demo.photo.not_persistent')}</div>
        </div>
      )}

      {count === 0 ? (
        <p className="muted">{readOnly ? t('demo.photo.none_readonly') : t('demo.photo.none')}</p>
      ) : (
        <div className="photo-grid">
          {photos!.map((p) => (
            <button type="button" className="photo" key={p.id} onClick={() => setOpen(p)} aria-label={t('demo.photo.open')}>
              <Img photoId={p.id} alt="" />
              <span className="tag">{p.palletId ? t('demo.photo.pallet_tag', { n: palletNo(p.palletId) ?? '?' }) : t('demo.photo.order_tag')}</span>
            </button>
          ))}
        </div>
      )}

      {!readOnly && (
        <button
          className="btn secondary block"
          disabled={full}
          onClick={() =>
            void captureAndStore({ session, orderId, palletId: null, toast }).then((n) => {
              if (n > 0) {
                reload();
                onChanged();
              }
            })
          }
        >
          <Icon name="camera" /> {full ? t('demo.photo.full') : t('demo.photo.add_order')}
        </button>
      )}

      {open && (
        <Lightbox
          photoId={open.id}
          caption={`${open.palletId ? t('demo.photo.pallet_tag', { n: palletNo(open.palletId) ?? '?' }) : t('demo.photo.order_tag')} · ${formatDateTime(open.createdAt)}`}
          onClose={() => setOpen(null)}
          actions={
            !readOnly && (
              <button
                className="btn danger small"
                onClick={() => {
                  setConfirmDelete(open);
                  setOpen(null);
                }}
              >
                <Icon name="trash" /> {t('demo.photo.delete')}
              </button>
            )
          }
        />
      )}
      {confirmDelete && (
        <ConfirmSheet
          title={t('demo.photo.delete_title')}
          body={t('demo.photo.delete_body')}
          confirmLabel={t('demo.photo.delete')}
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={async () => {
            try {
              await getServices().photos.removePhoto(orderId, confirmDelete.id);
              toast(t('demo.photo.deleted'));
              reload();
              onChanged();
            } catch (e) {
              toast(errorText(e), 'err');
            }
            setConfirmDelete(null);
          }}
        />
      )}
    </section>
  );
}
