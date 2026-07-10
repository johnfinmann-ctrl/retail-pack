/**
 * Redigering af en ALLEREDE PUBLICERET pakkemetode — og "Gendan denne
 * version" (samme komponent, forskellig kilde-version at kopiere fra).
 * Samme to-trins guide + preview som ved oprettelse.
 *
 * Ingen tekniske begreber: admin ser aldrig "draft/published/archived",
 * kun handlingerne "Gem, men vis ikke endnu", "Publicér", "Annullér".
 */
import type { PlatformSession } from '@platform/shared-types';
import { Button, Card } from '@platform/ui';
import { useEffect, useState } from 'react';

import type { PackagingItem, PackProfile } from '../../data/types';
import { PackGuideScreen } from '../../employee/screens/PackGuideScreen';
import { useT } from '../../i18n/I18nProvider';
import type { PackGuide } from '../../services';
import { getServices } from '../../servicesClient';

type Phase = 'checking' | 'locked' | 'locked_readonly' | 'method' | 'preview';

export function EditPackProfileWizard({
  session,
  profile,
  /** Sæt kun ved "Gendan denne version" — id'et på den historiske version, der skal kopieres fra. */
  restoreFromVersionId,
  onDone,
}: {
  session: PlatformSession;
  profile: PackProfile;
  restoreFromVersionId?: string;
  onDone: () => void;
}) {
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>('checking');
  const [draft, setDraft] = useState<PackProfile | null>(null);
  const [lockedByName, setLockedByName] = useState('');
  const [lockedDraftPreview, setLockedDraftPreview] = useState<PackProfile | null>(null);

  const [palletTypes, setPalletTypes] = useState<PackagingItem[]>([]);
  const [palletItemId, setPalletItemId] = useState('');
  const [layerCount, setLayerCount] = useState('');
  const [maxHeightCm, setMaxHeightCm] = useState('');
  const [maxWeightKg, setMaxWeightKg] = useState('');
  const [labelPosition, setLabelPosition] = useState('');
  const [foilType, setFoilType] = useState('');
  const [mixedPalletAllowed, setMixedPalletAllowed] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewGuide, setPreviewGuide] = useState<PackGuide | null>(null);

  useEffect(() => {
    let isMounted = true;
    const sourceId = restoreFromVersionId ?? profile.id;
    const start =
      restoreFromVersionId !== undefined
        ? getServices().packProfileEditing.restoreVersion(profile.lineageId, sourceId, session.userId)
        : getServices().packProfileEditing.startEditing(profile, session.userId);

    start.then((result) => {
      if (!isMounted) return;
      if (result.outcome === 'locked_by_other') {
        setLockedByName(result.lockedByName);
        setLockedDraftPreview(result.draftPreview);
        setPhase('locked');
        return;
      }
      const d = result.draft;
      setDraft(d);
      setPalletItemId(d.palletItemId ?? '');
      setLayerCount(d.layerCount?.toString() ?? '');
      setMaxHeightCm(d.maxHeightCm?.toString() ?? '');
      setMaxWeightKg(d.maxWeightKg?.toString() ?? '');
      setLabelPosition(d.labelPosition ?? '');
      setFoilType(d.foilType ?? '');
      setMixedPalletAllowed(d.mixedPalletAllowed ?? false);
      setSpecialInstructions(d.specialInstructions ?? '');
      setPhase('method');
    });
    return () => {
      isMounted = false;
    };
  }, [profile, restoreFromVersionId, session.userId]);

  useEffect(() => {
    getServices().packaging.listPalletTypes(session.companyId).then(setPalletTypes);
  }, [session.companyId]);

  function buildPreviewGuide(): PackGuide {
    const pallet = palletTypes.find((p) => p.id === palletItemId) ?? null;
    return {
      profile: {
        ...(draft as PackProfile),
        palletItemId: pallet?.id ?? null,
        layerCount: layerCount ? Number(layerCount) : null,
        maxHeightCm: maxHeightCm ? Number(maxHeightCm) : null,
        maxWeightKg: maxWeightKg ? Number(maxWeightKg) : null,
        mixedPalletAllowed,
        labelPosition: labelPosition || null,
        foilType: foilType || null,
        specialInstructions: specialInstructions || null,
      },
      box: null,
      innerPackaging: null,
      divider: null,
      cornerProtector: null,
      pallet,
      referenceImages: [],
      activeFlowSteps: [],
    };
  }

  async function persistDraftFields(): Promise<void> {
    if (!draft) return;
    await getServices().packProfileEditing.saveDraft(draft.id, {
      palletItemId: palletItemId || null,
      layerCount: layerCount ? Number(layerCount) : null,
      maxHeightCm: maxHeightCm ? Number(maxHeightCm) : null,
      maxWeightKg: maxWeightKg ? Number(maxWeightKg) : null,
      mixedPalletAllowed,
      labelPosition: labelPosition || null,
      foilType: foilType || null,
      specialInstructions: specialInstructions || null,
    });
  }

  async function handleSaveDraftOnly() {
    setSaving(true);
    try {
      await persistDraftFields();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!draft) return;
    setSaving(true);
    try {
      await persistDraftFields();
      await getServices().packProfileEditing.publish(draft.id, session.userId, changeSummary);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelEditing() {
    if (!draft) return;
    setSaving(true);
    try {
      await getServices().packProfileEditing.cancel(draft.id);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  if (phase === 'checking') {
    return <p>…</p>;
  }

  if (phase === 'locked') {
    return (
      <Card style={{ padding: 24 }}>
        <p style={{ fontSize: 16, marginBottom: 16 }}>
          {t('retailpackpro.admin.wizard.locked_by_other').replace('{name}', lockedByName)}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="admin" onClick={() => setPhase('locked_readonly')}>
            {t('retailpackpro.admin.wizard.open_readonly')}
          </Button>
          <Button variant="primary" size="admin" onClick={onDone}>
            {t('retailpackpro.admin.wizard.try_again_later')}
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === 'locked_readonly') {
    const readonlyGuide: PackGuide = {
      profile: lockedDraftPreview as PackProfile,
      box: null,
      innerPackaging: null,
      divider: null,
      cornerProtector: null,
      pallet: palletTypes.find((p) => p.id === lockedDraftPreview?.palletItemId) ?? null,
      referenceImages: [],
      activeFlowSteps: [],
    };
    return (
      <div>
        <p style={{ fontSize: 13, color: '#5c5c66', marginBottom: 16 }}>
          {t('retailpackpro.admin.wizard.readonly_hint').replace('{name}', lockedByName)}
        </p>
        <div style={{ border: '1px solid #e2e2e5', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <PackGuideScreen guide={readonlyGuide} showPackaging={false} onApprove={() => {}} submitting={true} />
        </div>
        <Button variant="secondary" size="admin" onClick={onDone}>
          {t('core.actions.back')}
        </Button>
      </div>
    );
  }

  if (phase === 'method') {
    return (
      <Card style={{ padding: 24 }}>
        <h2 style={{ marginBottom: 16 }}>
          {restoreFromVersionId ? t('retailpackpro.admin.wizard.restore_title') : t('retailpackpro.admin.wizard.edit_title')}
        </h2>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
          {t('retailpackpro.admin.wizard.pallet_type_label')}
        </label>
        <select
          value={palletItemId}
          onChange={(e) => setPalletItemId(e.target.value)}
          style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #e2e2e5' }}
        >
          <option value="">—</option>
          {palletTypes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t('retailpackpro.pallet.layers')}</label>
            <input
              value={layerCount}
              onChange={(e) => setLayerCount(e.target.value)}
              inputMode="numeric"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t('retailpackpro.pallet.max_height')}</label>
            <input
              value={maxHeightCm}
              onChange={(e) => setMaxHeightCm(e.target.value)}
              inputMode="numeric"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t('retailpackpro.pallet.max_weight')}</label>
            <input
              value={maxWeightKg}
              onChange={(e) => setMaxWeightKg(e.target.value)}
              inputMode="numeric"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              {t('retailpackpro.admin.wizard.label_position_label')}
            </label>
            <input
              value={labelPosition}
              onChange={(e) => setLabelPosition(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              {t('retailpackpro.admin.wizard.foil_type_label')}
            </label>
            <input
              value={foilType}
              onChange={(e) => setFoilType(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <input type="checkbox" checked={mixedPalletAllowed} onChange={(e) => setMixedPalletAllowed(e.target.checked)} />
          {t('retailpackpro.pallet.mixed_pallet')}
        </label>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
          {t('retailpackpro.admin.wizard.instruction_label')}
        </label>
        <textarea
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          maxLength={140}
          rows={2}
          style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #e2e2e5' }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="admin" disabled={saving} onClick={() => void handleCancelEditing()}>
            {t('retailpackpro.admin.wizard.cancel_editing_button')}
          </Button>
          <Button
            variant="primary"
            size="admin"
            disabled={!palletItemId}
            onClick={() => {
              setPreviewGuide(buildPreviewGuide());
              setPhase('preview');
            }}
          >
            {t('retailpackpro.admin.wizard.preview_button')}
          </Button>
        </div>
      </Card>
    );
  }

  // phase === 'preview'
  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>{t('retailpackpro.admin.wizard.preview_title')}</h2>
      <p style={{ fontSize: 13, color: '#5c5c66', marginBottom: 16 }}>{t('retailpackpro.admin.wizard.preview_hint')}</p>

      <div style={{ border: '1px solid #e2e2e5', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        {previewGuide && (
          <PackGuideScreen guide={previewGuide} showPackaging={false} onApprove={() => {}} submitting={true} />
        )}
      </div>

      <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
        {t('retailpackpro.admin.wizard.change_summary_label')}
      </label>
      <input
        value={changeSummary}
        onChange={(e) => setChangeSummary(e.target.value)}
        placeholder={t('retailpackpro.admin.wizard.change_summary_placeholder')}
        maxLength={100}
        style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #e2e2e5' }}
      />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="secondary" size="admin" onClick={() => setPhase('method')}>
          {t('core.actions.back')}
        </Button>
        <Button variant="secondary" size="admin" disabled={saving} onClick={() => void handleSaveDraftOnly()}>
          {t('retailpackpro.admin.wizard.save_draft_button')}
        </Button>
        <Button variant="primary" size="admin" disabled={saving} onClick={() => void handlePublish()}>
          {t('retailpackpro.admin.wizard.publish_button')}
        </Button>
      </div>
    </div>
  );
}
