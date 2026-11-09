/**
 * Fotodokumentation v0.5: tag, gennemse, erstat og (før registrering) slet.
 * Højst 35 fotos pr. ordre i alt. Filvælgeren åbnes synkront i klikket, så
 * den også virker i Safari og indlejrede visninger.
 */
import { useState } from 'react';

import { formatDateTime } from '../../i18n';
import { ConfirmSheet, errorText, Lightbox, useAsync, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { compressImage, Img, LOCAL_IMAGE_PREFIX, pickImageFile } from '../../ui/media';
import type { DemoUserV5 } from '../domain/store';
import { MAX_PHOTOS_PER_ORDER, type PhotoRecordV5 } from '../domain/types';
import { getV5 } from '../services';

export async function captureFor(input: {
  pickrouteId: string;
  palletRecordId: string | null;
  user: DemoUserV5;
  toast: (m: string, k?: 'ok' | 'err' | 'info') => void;
}): Promise<number> {
  const files = await pickImageFile({ capture: true, multiple: true });
  if (files.length === 0) return 0;
  const reg = getV5().registrations;
  const free = await reg.remainingPhotoSlots(input.pickrouteId);
  if (free <= 0) {
    input.toast(`Der kan højst gemmes ${MAX_PHOTOS_PER_ORDER} fotos pr. ordre.`, 'err');
    return 0;
  }
  let saved = 0;
  let firstError: string | null = null;
  for (const file of files.slice(0, free)) {
    try {
      const p = await compressImage(file);
      await reg.addPhoto({ pickrouteId: input.pickrouteId, palletRecordId: input.palletRecordId, image: { data: p.data, width: p.width, height: p.height }, user: input.user });
      saved++;
    } catch (e) {
      firstError ??= errorText(e);
    }
  }
  if (saved) input.toast(saved === 1 ? 'Fotoet er gemt' : `${saved} fotos er gemt`);
  if (firstError) input.toast(firstError, 'err');
  else if (files.length > free) input.toast(`${files.length - free} foto(s) blev ikke gemt — grænsen er ${MAX_PHOTOS_PER_ORDER} pr. ordre.`, 'err');
  return saved;
}

export function PhotoBlock({
  pickrouteId,
  palletRecordId,
  canDelete,
  canAdd = true,
  user,
  version,
  onChanged,
  title = 'Fotos af pallen',
}: {
  pickrouteId: string;
  palletRecordId: string | null;
  canDelete: boolean;
  canAdd?: boolean;
  user: DemoUserV5;
  version: number;
  onChanged: () => void;
  title?: string;
}) {
  const toast = useToast();
  const { data } = useAsync(() => getV5().registrations.listPhotos(pickrouteId), [pickrouteId, version]);
  const [open, setOpen] = useState<PhotoRecordV5 | null>(null);
  const [confirmDel, setConfirmDel] = useState<PhotoRecordV5 | null>(null);
  const mine = (data ?? []).filter((p) => p.palletRecordId === palletRecordId);
  const total = data?.length ?? 0;
  const full = total >= MAX_PHOTOS_PER_ORDER;
  const persistent = getV5().store.persistent;

  async function replace(ph: PhotoRecordV5) {
    const files = await pickImageFile({ capture: true });
    if (!files[0]) return;
    try {
      const p = await compressImage(files[0]);
      await getV5().registrations.replacePhoto(ph.id, { data: p.data, width: p.width, height: p.height }, user);
      toast('Fotoet er erstattet');
      setOpen(null);
      onChanged();
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  return (
    <section className="panel" aria-label={title}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ flex: 1 }}>{title}</h2>
        <span className="counter photo-counter" aria-label={`${total} af højst ${MAX_PHOTOS_PER_ORDER} fotos på ordren`}>
          {total} / {MAX_PHOTOS_PER_ORDER}
        </span>
      </div>
      {!persistent && (
        <div className="notice warn">
          <Icon name="info" />
          <div className="grow small">Browseren tillader ikke lagring her. Fotos forsvinder ved genindlæsning.</div>
        </div>
      )}
      {mine.length === 0 ? (
        <p className="muted">Ingen fotos endnu.</p>
      ) : (
        <div className="photo-grid">
          {mine.map((p) => (
            <button type="button" className="photo" key={p.id} onClick={() => setOpen(p)} aria-label="Åbn foto">
              <Img src={LOCAL_IMAGE_PREFIX + p.fileId} alt="" />
              {p.replacedAt && <span className="tag">Erstattet</span>}
            </button>
          ))}
        </div>
      )}
      {canAdd && (
        <button
          className="btn secondary block"
          disabled={full}
          onClick={() =>
            void captureFor({ pickrouteId, palletRecordId, user, toast }).then((n) => {
              if (n) onChanged();
            })
          }
        >
          <Icon name="camera" /> {full ? 'Maks. 35 fotos nået' : 'Tag foto'}
        </button>
      )}
      {open && (
        <Lightbox
          src={LOCAL_IMAGE_PREFIX + open.fileId}
          caption={`${formatDateTime(open.createdAt)}${open.replacedAt ? ` · erstattet ${formatDateTime(open.replacedAt)}` : ''}`}
          onClose={() => setOpen(null)}
          actions={
            <>
              <button className="btn secondary small" onClick={() => void replace(open)}>
                <Icon name="camera" size={18} /> Erstat
              </button>
              {canDelete && (
                <button
                  className="btn danger small"
                  onClick={() => {
                    setConfirmDel(open);
                    setOpen(null);
                  }}
                >
                  <Icon name="trash" size={18} /> Slet
                </button>
              )}
            </>
          }
        />
      )}
      {confirmDel && (
        <ConfirmSheet
          title="Slet fotoet?"
          body="Fotoet fjernes fra pallen."
          confirmLabel="Slet foto"
          danger
          onCancel={() => setConfirmDel(null)}
          onConfirm={async () => {
            try {
              await getV5().registrations.removePhoto(confirmDel.id);
              toast('Fotoet er slettet');
              onChanged();
            } catch (e) {
              toast(errorText(e), 'err');
            }
            setConfirmDel(null);
          }}
        />
      )}
    </section>
  );
}
