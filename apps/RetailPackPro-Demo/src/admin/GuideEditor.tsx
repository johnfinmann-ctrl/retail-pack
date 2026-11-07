/**
 * Opret/redigér pakkevejledning. Arbejder altid på en kladde:
 * "Gem kladde" ændrer intet for medarbejderen; først "Publicér" gør den
 * nye version aktiv (og arkiverer den forrige — v0.3.0-reglen).
 */
import type { PackagingItem, ReferenceImage } from '@rpp/data/types';
import { useState } from 'react';

import type { DemoSession } from '../demo/session';
import type { GuideFields } from '../domain/PackGuideAdminService';
import type { CustomerV4, PackProfileV4, ProductV4 } from '../domain/types';
import { PackGuideView } from '../employee/PackGuideView';
import { t } from '../i18n';
import { getServices } from '../services';
import { ConfirmSheet, errorText, Loading, Sheet, useAsync, useToast } from '../ui/common';
import { Icon } from '../ui/Icon';
import { Img, pickImageFile, storeUploadedImage } from '../ui/media';

interface Form {
  customerId: string;
  name: string;
  allProducts: boolean;
  productIds: string[];
  palletItemId: string;
  layerCount: string;
  unitsPerLayer: string;
  maxHeightCm: string;
  maxWeightKg: string;
  mixed: 'yes' | 'no' | '';
  overhang: 'yes' | 'no' | '';
  labelPosition: string;
  foilType: string;
  specialInstructions: string;
  boxItemId: string;
  dividerItemId: string;
  cornerProtectorItemId: string;
  placementPatternImageUrl: string | null;
}

const toForm = (p: PackProfileV4 | null, links: string[]): Form => ({
  customerId: p?.customerId ?? '',
  name: p?.name ?? '',
  allProducts: p ? links.length === 0 : false,
  productIds: links,
  palletItemId: p?.palletItemId ?? 'pk-eur',
  layerCount: p?.layerCount?.toString() ?? '',
  unitsPerLayer: p?.unitsPerLayer?.toString() ?? '',
  maxHeightCm: p?.maxHeightCm?.toString() ?? '',
  maxWeightKg: p?.maxWeightKg?.toString() ?? '',
  mixed: p?.mixedPalletAllowed === null || !p ? '' : p.mixedPalletAllowed ? 'yes' : 'no',
  overhang: p?.overhangAllowed === null || !p ? '' : p.overhangAllowed ? 'yes' : 'no',
  labelPosition: p?.labelPosition ?? '',
  foilType: p?.foilType ?? '',
  specialInstructions: p?.specialInstructions ?? '',
  boxItemId: p?.boxItemId ?? '',
  dividerItemId: p?.dividerItemId ?? '',
  cornerProtectorItemId: p?.cornerProtectorItemId ?? '',
  placementPatternImageUrl: p?.placementPatternImageUrl ?? null,
});

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) ? null : n;
};
const yn = (v: 'yes' | 'no' | '') => (v === '' ? null : v === 'yes');

function toFields(f: Form): GuideFields & { boxItemId: string | null; dividerItemId: string | null; cornerProtectorItemId: string | null } {
  return {
    name: f.name,
    palletItemId: f.palletItemId || null,
    layerCount: num(f.layerCount),
    unitsPerLayer: num(f.unitsPerLayer),
    maxHeightCm: num(f.maxHeightCm),
    maxWeightKg: num(f.maxWeightKg),
    mixedPalletAllowed: yn(f.mixed),
    overhangAllowed: yn(f.overhang),
    labelPosition: f.labelPosition.trim() || null,
    foilType: f.foilType.trim() || null,
    specialInstructions: f.specialInstructions.trim() || null,
    placementPatternImageUrl: f.placementPatternImageUrl,
    boxItemId: f.boxItemId || null,
    dividerItemId: f.dividerItemId || null,
    cornerProtectorItemId: f.cornerProtectorItemId || null,
  };
}

export function GuideEditor({
  session,
  draft: initialDraft,
  publishedVersion,
  onDone,
}: {
  session: DemoSession;
  draft: PackProfileV4 | null;
  publishedVersion: number | null;
  onDone: () => void;
}) {
  const { data } = useAsync(async () => {
    const s = getServices();
    const [customers, products, pallets, boxes, dividers, corners, links] = await Promise.all([
      s.customers.listActiveCustomers(session.companyId),
      s.products.listAll(session.companyId),
      s.packaging.listPalletTypes(session.companyId),
      s.repos.packaging.listByType(session.companyId, 'box'),
      s.repos.packaging.listByType(session.companyId, 'divider'),
      s.repos.packaging.listByType(session.companyId, 'corner_protector'),
      initialDraft ? s.guideAdmin.getProductLinks(initialDraft.id) : Promise.resolve([]),
    ]);
    return { customers: customers as CustomerV4[], products: products as ProductV4[], pallets, boxes, dividers, corners, links };
  }, [initialDraft?.id]);

  if (!data) return <Loading />;
  return <EditorForm session={session} initialDraft={initialDraft} publishedVersion={publishedVersion} onDone={onDone} lookups={data} />;
}

function EditorForm({
  session,
  initialDraft,
  publishedVersion,
  onDone,
  lookups,
}: {
  session: DemoSession;
  initialDraft: PackProfileV4 | null;
  publishedVersion: number | null;
  onDone: () => void;
  lookups: {
    customers: CustomerV4[];
    products: ProductV4[];
    pallets: PackagingItem[];
    boxes: PackagingItem[];
    dividers: PackagingItem[];
    corners: PackagingItem[];
    links: string[];
  };
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<PackProfileV4 | null>(initialDraft);
  const [f, setF] = useState<Form>(() => toForm(initialDraft, lookups.links));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [refVersion, setRefVersion] = useState(0);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const isNew = !draft;
  const productIds = f.allProducts ? [] : f.productIds;
  const customer = lookups.customers.find((c) => c.id === f.customerId) ?? null;

  function validate(): string | null {
    if (!f.customerId) return t('demo.admin.editor.err_customer');
    if (!f.name.trim()) return t('demo.admin.editor.err_name');
    if (!f.allProducts && f.productIds.length === 0) return t('demo.admin.editor.err_products');
    return null;
  }

  async function save(): Promise<PackProfileV4 | null> {
    const err = validate();
    if (err) {
      toast(err, 'err');
      return null;
    }
    const s = getServices();
    if (!draft) {
      const created = await s.guideAdmin.create(
        { ...toFields(f), name: f.name, companyId: session.companyId, customerId: f.customerId, createdBy: session.userId, productIds },
        { publish: false, userId: session.userId },
      );
      setDraft(created);
      return created;
    }
    const saved = await s.guideAdmin.saveDraft(draft.id, toFields(f), productIds);
    setDraft(saved);
    return saved;
  }

  async function onSave() {
    setBusy(true);
    try {
      if (await save()) toast(t('demo.admin.editor.saved_draft'));
    } catch (e) {
      toast(errorText(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    setBusy(true);
    try {
      const saved = await save();
      if (!saved) return;
      await getServices().packProfileEditing.publish(saved.id, session.userId, summary || (publishedVersion ? null : 'Første version'));
      toast(t('demo.admin.editor.published', { v: saved.version }));
      onDone();
    } catch (e) {
      toast(errorText(e), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function uploadPalletPhoto() {
    const files = await pickImageFile({ capture: true });
    if (!files[0]) return;
    try {
      set('placementPatternImageUrl', await storeUploadedImage(files[0]));
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  const customerProducts = lookups.products;
  const previewProfile: PackProfileV4 = {
    ...(draft ?? ({ id: 'preview', companyId: session.companyId, lineageId: 'preview', version: 1, status: 'draft', ssccLabelRequired: true } as PackProfileV4)),
    ...toFields(f),
    customerId: f.customerId,
    name: f.name,
  } as PackProfileV4;

  return (
    <>
      <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={onDone}>
        <Icon name="back" size={18} /> {t('demo.admin.guides.all')}
      </button>
      <div>
        <span className="eyebrow">{isNew ? t('demo.admin.guides.new') : t('retailpackpro.admin.wizard.edit_title')}</span>
        <h1>{f.name || t('demo.admin.editor.untitled')}</h1>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <span className="pill draft">
            {t('demo.admin.editor.draft_pill')}
            {draft ? ` · v${draft.version}` : ''}
          </span>
          {publishedVersion && <span className="pill go">{t('demo.admin.editor.employees_see', { v: publishedVersion })}</span>}
        </p>
      </div>

      <section className="panel">
        <h2>{t('retailpackpro.admin.wizard.who_title')}</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="g-customer">{t('retailpackpro.admin.wizard.customer_label')}</label>
            <select id="g-customer" value={f.customerId} disabled={!isNew} onChange={(e) => set('customerId', e.target.value)}>
              <option value="">{t('demo.admin.editor.choose')}</option>
              {lookups.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isTestCustomer ? ` (${t('demo.common.test_customer')})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="g-name">{t('demo.admin.editor.name')}</label>
            <input id="g-name" type="text" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={t('demo.admin.editor.name_ph')} />
          </div>
        </div>
        <div className="field">
          <span className="label">{t('retailpackpro.admin.wizard.products_label')}</span>
          <label className={`check${f.allProducts ? ' on' : ''}`}>
            <input type="checkbox" checked={f.allProducts} onChange={(e) => set('allProducts', e.target.checked)} />
            {t('demo.admin.editor.all_products')}
          </label>
          {!f.allProducts && (
            <div className="checks">
              {customerProducts.map((p) => {
                const on = f.productIds.includes(p.id);
                return (
                  <label key={p.id} className={`check${on ? ' on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => set('productIds', e.target.checked ? [...f.productIds, p.id] : f.productIds.filter((x) => x !== p.id))}
                    />
                    <span>
                      <strong>{p.itemNumber}</strong> {p.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>{t('demo.admin.editor.pallet_title')}</h2>
        <div className="field">
          <label htmlFor="g-pallet">{t('retailpackpro.admin.wizard.pallet_type_label')}</label>
          <select id="g-pallet" value={f.palletItemId} onChange={(e) => set('palletItemId', e.target.value)}>
            {lookups.pallets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid-4">
          <NumField id="g-layers" label={t('demo.guide.layers')} value={f.layerCount} onChange={(v) => set('layerCount', v)} />
          <NumField id="g-upl" label={t('demo.guide.units_per_layer')} value={f.unitsPerLayer} onChange={(v) => set('unitsPerLayer', v)} />
          <NumField id="g-h" label={`${t('demo.guide.max_height')} (cm)`} value={f.maxHeightCm} onChange={(v) => set('maxHeightCm', v)} />
          <NumField id="g-w" label={`${t('demo.guide.max_weight')} (kg)`} value={f.maxWeightKg} onChange={(v) => set('maxWeightKg', v)} />
        </div>
        <div className="grid-2">
          <YesNo id="g-mixed" label={t('demo.guide.mixed')} value={f.mixed} onChange={(v) => set('mixed', v)} />
          <YesNo id="g-overhang" label={t('demo.guide.overhang')} value={f.overhang} onChange={(v) => set('overhang', v)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="g-label">{t('retailpackpro.admin.wizard.label_position_label')}</label>
            <input id="g-label" type="text" list="label-options" value={f.labelPosition} onChange={(e) => set('labelPosition', e.target.value)} />
            <datalist id="label-options">
              <option value="Kortside, øverst til højre" />
              <option value="Kortside, midt" />
              <option value="Langside, midt" />
              <option value="Langside og kortside" />
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="g-foil">{t('retailpackpro.admin.wizard.foil_type_label')}</label>
            <input id="g-foil" type="text" list="foil-options" value={f.foilType} onChange={(e) => set('foilType', e.target.value)} />
            <datalist id="foil-options">
              <option value="Klar strækfilm · 3 omgange" />
              <option value="Sort strækfilm · 4 omgange" />
              <option value="Hvid UV-folie · 3 omgange" />
            </datalist>
          </div>
        </div>
        <div className="field">
          <label htmlFor="g-instr">{t('retailpackpro.admin.wizard.instruction_label')}</label>
          <textarea id="g-instr" value={f.specialInstructions} maxLength={160} onChange={(e) => set('specialInstructions', e.target.value)} placeholder={t('retailpackpro.admin.wizard.instruction_placeholder')} />
          <span className="help">{t('demo.admin.editor.instruction_help', { n: 160 - f.specialInstructions.length })}</span>
        </div>
      </section>

      <section className="panel">
        <h2>{t('demo.guide.packaging')}</h2>
        <div className="grid-2">
          <ItemSelect id="g-box" label={t('demo.admin.editor.box')} items={lookups.boxes} value={f.boxItemId} onChange={(v) => set('boxItemId', v)} />
          <ItemSelect id="g-div" label={t('demo.admin.editor.divider')} items={lookups.dividers} value={f.dividerItemId} onChange={(v) => set('dividerItemId', v)} />
          <ItemSelect id="g-corner" label={t('demo.admin.editor.corner')} items={lookups.corners} value={f.cornerProtectorItemId} onChange={(v) => set('cornerProtectorItemId', v)} />
        </div>
      </section>

      <section className="panel">
        <h2>{t('demo.admin.editor.images_title')}</h2>
        <div className="field">
          <span className="label">{t('demo.guide.finished_pallet')}</span>
          <div className="upload-row">
            {f.placementPatternImageUrl ? <Img src={f.placementPatternImageUrl} alt="" /> : <span className="help">{t('demo.admin.editor.pallet_photo_none')}</span>}
            <button type="button" className="btn secondary small" onClick={() => void uploadPalletPhoto()}>
              <Icon name="camera" size={18} /> {t('demo.admin.upload_photo')}
            </button>
            {f.placementPatternImageUrl && (
              <button type="button" className="btn ghost small" onClick={() => set('placementPatternImageUrl', null)}>
                {t('demo.admin.editor.use_illustration')}
              </button>
            )}
          </div>
        </div>
        <RefImages draftId={draft?.id ?? null} version={refVersion} onChanged={() => setRefVersion((v) => v + 1)} />
      </section>

      <div className="sticky-actions">
        <div className="btn-row">
          <button className="btn ghost" onClick={() => setPreview(true)} disabled={!f.customerId}>
            <Icon name="eye" /> {t('demo.admin.guides.preview')}
          </button>
          <button className="btn secondary" onClick={() => void onSave()} disabled={busy}>
            {t('retailpackpro.admin.wizard.save_draft_button')}
          </button>
          <button className="btn go" onClick={() => setPublishOpen(true)} disabled={busy}>
            <Icon name="check" /> {t('retailpackpro.admin.wizard.publish_button')}
          </button>
        </div>
        {draft && (
          <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => setConfirmCancel(true)}>
            <Icon name="trash" size={18} /> {publishedVersion ? t('retailpackpro.admin.wizard.cancel_editing_button') : t('demo.admin.editor.delete_draft')}
          </button>
        )}
      </div>

      {preview && (
        <GuidePreviewSheet
          profile={previewProfile}
          customerOverride={customer}
          productIds={productIds}
          onClose={() => setPreview(false)}
          note={publishedVersion ? t('demo.admin.editor.preview_note', { v: publishedVersion }) : t('demo.admin.editor.preview_note_new')}
        />
      )}

      {publishOpen && (
        <Sheet title={t('retailpackpro.admin.wizard.publish_button')} onClose={() => setPublishOpen(false)}>
          <p className="muted">{publishedVersion ? t('demo.admin.editor.publish_body', { v: publishedVersion }) : t('demo.admin.editor.publish_body_new')}</p>
          {publishedVersion && (
            <div className="field">
              <label htmlFor="g-summary">{t('retailpackpro.admin.wizard.change_summary_label')}</label>
              <input id="g-summary" type="text" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t('retailpackpro.admin.wizard.change_summary_placeholder')} />
            </div>
          )}
          <div className="btn-row">
            <button className="btn ghost" onClick={() => setPublishOpen(false)}>
              {t('demo.common.cancel')}
            </button>
            <button className="btn go" disabled={busy} onClick={() => void onPublish()}>
              <Icon name="check" /> {t('retailpackpro.admin.wizard.publish_button')}
            </button>
          </div>
        </Sheet>
      )}

      {confirmCancel && draft && (
        <ConfirmSheet
          title={publishedVersion ? t('retailpackpro.admin.wizard.cancel_editing_button') : t('demo.admin.editor.delete_draft')}
          body={publishedVersion ? t('demo.admin.editor.cancel_body', { v: publishedVersion }) : t('demo.admin.editor.delete_body')}
          confirmLabel={publishedVersion ? t('retailpackpro.admin.wizard.cancel_editing_button') : t('demo.admin.editor.delete_draft')}
          danger
          onCancel={() => setConfirmCancel(false)}
          onConfirm={async () => {
            await getServices().packProfileEditing.cancel(draft.id);
            toast(t('demo.admin.editor.cancelled'));
            onDone();
          }}
        />
      )}
    </>
  );
}

function NumField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))} />
    </div>
  );
}

function YesNo({ id, label, value, onChange }: { id: string; label: string; value: 'yes' | 'no' | ''; onChange: (v: 'yes' | 'no' | '') => void }) {
  return (
    <div className="field">
      <span className="label" id={id}>
        {label}
      </span>
      <div className="seg" role="group" aria-labelledby={id}>
        <button type="button" aria-pressed={value === 'yes'} onClick={() => onChange(value === 'yes' ? '' : 'yes')}>
          {t('demo.common.yes')}
        </button>
        <button type="button" aria-pressed={value === 'no'} onClick={() => onChange(value === 'no' ? '' : 'no')}>
          {t('demo.common.no')}
        </button>
      </div>
    </div>
  );
}

function ItemSelect({ id, label, items, value, onChange }: { id: string; label: string; items: PackagingItem[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('demo.admin.editor.not_used')}</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function RefImages({ draftId, version, onChanged }: { draftId: string | null; version: number; onChanged: () => void }) {
  const toast = useToast();
  const [caption, setCaption] = useState('');
  const { data } = useAsync<ReferenceImage[]>(() => (draftId ? getServices().guideAdmin.listReferenceImages(draftId) : Promise.resolve([])), [draftId, version]);

  async function add() {
    if (!draftId) return;
    const files = await pickImageFile({ capture: true });
    if (!files[0]) return;
    try {
      const url = await storeUploadedImage(files[0]);
      await getServices().guideAdmin.addReferenceImage(draftId, url, caption.trim() || null);
      setCaption('');
      toast(t('demo.admin.editor.ref_added'));
      onChanged();
    } catch (e) {
      toast(errorText(e), 'err');
    }
  }

  return (
    <div className="field">
      <span className="label">{t('demo.guide.reference_images')}</span>
      {!draftId ? (
        <span className="help">{t('demo.admin.editor.ref_save_first')}</span>
      ) : (
        <>
          {(data ?? []).length > 0 && (
            <div className="ref-row">
              {data!.map((r) => (
                <div className="ref" key={r.id} style={{ cursor: 'default' }}>
                  <Img src={r.url} alt={r.caption ?? ''} />
                  <span>{r.caption}</span>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() =>
                      void getServices()
                        .guideAdmin.removeReferenceImage(r.id)
                        .then(onChanged)
                    }
                  >
                    <Icon name="trash" size={16} /> {t('demo.admin.editor.remove')}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="upload-row">
            <input
              type="text"
              aria-label={t('demo.admin.editor.ref_caption')}
              placeholder={t('demo.admin.editor.ref_caption')}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              style={{ flex: '1 1 220px', minHeight: 44, border: '2px solid var(--line-strong)', borderRadius: 8, padding: '0 12px' }}
            />
            <button type="button" className="btn secondary small" onClick={() => void add()}>
              <Icon name="image" size={18} /> {t('demo.admin.editor.ref_add')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Viser PRÆCIS medarbejderens skærm for en version (kladde, publiceret eller gammel). */
export function GuidePreviewSheet({
  profile,
  onClose,
  note,
  customerOverride,
  productIds,
}: {
  profile: PackProfileV4;
  onClose: () => void;
  note: string | null;
  customerOverride?: CustomerV4 | null;
  productIds?: string[];
}) {
  const { data } = useAsync(async () => {
    const s = getServices();
    const links = productIds ?? (await s.guideAdmin.getProductLinks(profile.id));
    const products = (await s.products.listAll(profile.companyId)) as ProductV4[];
    const product = products.find((p) => links.includes(p.id)) ?? products[0] ?? null;
    const customer = customerOverride ?? ((await s.customers.listActiveCustomers(profile.companyId)).find((c) => c.id === profile.customerId) as CustomerV4 | undefined) ?? null;
    const guide = await s.guideAdmin.buildGuide(profile);
    return { product, customer, guide };
  }, [profile]);

  return (
    <Sheet title={t('retailpackpro.admin.wizard.preview_title')} onClose={onClose} wide>
      {note && (
        <div className="notice info">
          <Icon name="info" />
          <div className="grow">{note}</div>
        </div>
      )}
      {!data ? (
        <Loading />
      ) : (
        <div className="phone-frame">
          <PackGuideView
            guide={data.guide}
            product={data.product}
            customer={data.customer}
            actions={
              <button className="btn go xl block" disabled aria-disabled="true">
                <Icon name="check" size={28} /> {t('retailpackpro.approve.button')}
              </button>
            }
          />
        </div>
      )}
    </Sheet>
  );
}
