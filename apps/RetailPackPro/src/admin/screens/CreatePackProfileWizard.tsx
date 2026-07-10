/**
 * Pakkemetode-guiden — det Admin faktisk skal bruge tid på. To trin +
 * preview, i stedet for én lang formular:
 * 1) Hvem gælder det for (kunde + evt. specifikke produkter)
 * 2) Selve pakkemetoden (kun de felter, medarbejderen rent faktisk ser)
 * 3) Preview — genbruger PackGuideScreen fra medarbejderflowet 1:1, så
 *    admin ser PRÆCIS det, en medarbejder kommer til at se.
 *
 * INGEN teknisk jargon: intet "status", "version", "company_id" eller
 * "draft/published" nogen steder i denne komponent — kun "Gem som kladde"
 * og "Publicér" som rene handlinger.
 *
 * BEVIDST AFGRÆNSET (flagget ved gennemgang): kasse/inderemballage/
 * mellemlæg/hjørnebeskytter indgår ikke her — kun palletype, da det er
 * det eneste, den godkendte feltliste for pakkemetode-skærmen kræver.
 * Billeder tilføjes som URL, ikke fil-upload (se begrundelse i commit).
 */
import type { PlatformSession } from '@platform/shared-types';
import { Button, Card } from '@platform/ui';
import { useEffect, useState } from 'react';

import type { Customer, PackagingItem, Product } from '../../data/types';
import { PackGuideScreen } from '../../employee/screens/PackGuideScreen';
import { useT } from '../../i18n/I18nProvider';
import type { PackGuide } from '../../services';
import { getServices } from '../../servicesClient';

type WizardStep = 'who' | 'method' | 'preview';

export function CreatePackProfileWizard({
  session,
  onDone,
}: {
  session: PlatformSession;
  onDone: () => void;
}) {
  const { t } = useT();
  const [step, setStep] = useState<WizardStep>('who');

  // Trin 1: hvem gælder det for
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Trin 2: pakkemetoden
  const [palletTypes, setPalletTypes] = useState<PackagingItem[]>([]);
  const [palletItemId, setPalletItemId] = useState('');
  const [newPalletName, setNewPalletName] = useState('');
  const [newPalletImageUrl, setNewPalletImageUrl] = useState('');
  const [layerCount, setLayerCount] = useState('');
  const [maxHeightCm, setMaxHeightCm] = useState('');
  const [maxWeightKg, setMaxWeightKg] = useState('');
  const [labelPosition, setLabelPosition] = useState('');
  const [foilType, setFoilType] = useState('');
  const [mixedPalletAllowed, setMixedPalletAllowed] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const services = getServices();
    services.customers.listActiveCustomers(session.companyId).then(setCustomers);
    services.products.listAll(session.companyId).then(setProducts);
    services.packaging.listPalletTypes(session.companyId).then(setPalletTypes);
  }, [session.companyId]);

  async function ensurePalletItemId(): Promise<string> {
    if (palletItemId) return palletItemId;
    const created = await getServices().packaging.createPalletType({
      companyId: session.companyId,
      name: newPalletName,
      imageUrl: newPalletImageUrl || null,
    });
    return created.id;
  }

  function buildPreviewGuide(pallet: PackagingItem | null): PackGuide {
    return {
      profile: {
        id: 'preview',
        companyId: session.companyId,
        customerId,
        name: '',
        boxItemId: null,
        innerPackagingItemId: null,
        dividerItemId: null,
        cornerProtectorItemId: null,
        palletItemId: pallet?.id ?? null,
        placementPatternImageUrl: null,
        maxHeightCm: maxHeightCm ? Number(maxHeightCm) : null,
        maxWeightKg: maxWeightKg ? Number(maxWeightKg) : null,
        layerCount: layerCount ? Number(layerCount) : null,
        mixedPalletAllowed,
        labelPosition: labelPosition || null,
        ssccLabelRequired: false,
        foilType: foilType || null,
        overhangAllowed: null,
        specialInstructions: specialInstructions || null,
        version: 1,
        status: 'draft',
        effectiveFrom: null,
        createdBy: session.userId,
        updatedBy: session.userId,
        lockedBy: null,
        lockedAt: null,
        publishedAt: null,
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

  const [previewGuide, setPreviewGuide] = useState<PackGuide | null>(null);

  async function handleGoToPreview() {
    let pallet: PackagingItem | null = null;
    if (palletItemId) {
      pallet = palletTypes.find((p) => p.id === palletItemId) ?? null;
    } else if (newPalletName) {
      pallet = { id: 'ny', companyId: session.companyId, type: 'pallet_type', name: newPalletName, imageUrl: newPalletImageUrl || null, dimensions: null, notes: null };
    }
    setPreviewGuide(buildPreviewGuide(pallet));
    setStep('preview');
  }

  async function handleSave(publish: boolean) {
    setSaving(true);
    try {
      const resolvedPalletItemId = newPalletName ? await ensurePalletItemId() : palletItemId || null;
      const customer = customers.find((c) => c.id === customerId);

      const created = await getServices().packGuide.createProfile({
        companyId: session.companyId,
        customerId,
        name: `${customer?.name ?? 'Kunde'} — pakkemetode`,
        palletItemId: resolvedPalletItemId,
        layerCount: layerCount ? Number(layerCount) : null,
        maxHeightCm: maxHeightCm ? Number(maxHeightCm) : null,
        maxWeightKg: maxWeightKg ? Number(maxWeightKg) : null,
        mixedPalletAllowed,
        labelPosition: labelPosition || null,
        foilType: foilType || null,
        specialInstructions: specialInstructions || null,
        createdBy: session.userId,
        productIds: selectedProductIds,
      });

      if (publish) {
        await getServices().packGuide.publishProfile(created.id, session.userId);
      }

      onDone();
    } finally {
      setSaving(false);
    }
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]));
  }

  if (step === 'who') {
    return (
      <Card style={{ padding: 24 }}>
        <h2 style={{ marginBottom: 16 }}>{t('retailpackpro.admin.wizard.who_title')}</h2>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
          {t('retailpackpro.admin.wizard.customer_label')}
        </label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #e2e2e5' }}
        >
          <option value="">—</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
          {t('retailpackpro.admin.wizard.products_label')}
        </label>
        <p style={{ fontSize: 13, color: '#5c5c66', marginBottom: 8 }}>
          {t('retailpackpro.admin.wizard.products_hint')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
          {products.map((p) => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
              {p.name}
            </label>
          ))}
        </div>

        <Button variant="primary" size="admin" disabled={!customerId} onClick={() => setStep('method')}>
          {t('core.actions.next')}
        </Button>
      </Card>
    );
  }

  if (step === 'method') {
    return (
      <Card style={{ padding: 24 }}>
        <h2 style={{ marginBottom: 16 }}>{t('retailpackpro.admin.wizard.method_title')}</h2>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
          {t('retailpackpro.admin.wizard.pallet_type_label')}
        </label>
        <select
          value={palletItemId}
          onChange={(e) => {
            setPalletItemId(e.target.value);
            if (e.target.value) {
              setNewPalletName('');
              setNewPalletImageUrl('');
            }
          }}
          style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #e2e2e5' }}
        >
          <option value="">{t('retailpackpro.admin.wizard.pallet_type_new')}</option>
          {palletTypes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {!palletItemId && (
          <div style={{ marginBottom: 16, paddingLeft: 12, borderLeft: '2px solid #e2e2e5' }}>
            <input
              value={newPalletName}
              onChange={(e) => setNewPalletName(e.target.value)}
              placeholder={t('retailpackpro.admin.wizard.pallet_type_name_placeholder')}
              style={{ width: '100%', padding: 10, marginBottom: 8, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
            <input
              value={newPalletImageUrl}
              onChange={(e) => setNewPalletImageUrl(e.target.value)}
              placeholder={t('retailpackpro.admin.wizard.image_url_placeholder')}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e2e5' }}
            />
          </div>
        )}

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
          placeholder={t('retailpackpro.admin.wizard.instruction_placeholder')}
          style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #e2e2e5' }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="admin" onClick={() => setStep('who')}>
            {t('core.actions.back')}
          </Button>
          <Button
            variant="primary"
            size="admin"
            disabled={!palletItemId && !newPalletName}
            onClick={() => void handleGoToPreview()}
          >
            {t('retailpackpro.admin.wizard.preview_button')}
          </Button>
        </div>
      </Card>
    );
  }

  // step === 'preview'
  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>{t('retailpackpro.admin.wizard.preview_title')}</h2>
      <p style={{ fontSize: 13, color: '#5c5c66', marginBottom: 16 }}>{t('retailpackpro.admin.wizard.preview_hint')}</p>

      <div style={{ border: '1px solid #e2e2e5', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        {previewGuide && (
          <PackGuideScreen guide={previewGuide} showPackaging={false} onApprove={() => {}} submitting={true} />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" size="admin" onClick={() => setStep('method')}>
          {t('core.actions.back')}
        </Button>
        <Button variant="secondary" size="admin" disabled={saving} onClick={() => void handleSave(false)}>
          {t('retailpackpro.admin.wizard.save_draft_button')}
        </Button>
        <Button variant="primary" size="admin" disabled={saving} onClick={() => void handleSave(true)}>
          {t('retailpackpro.admin.wizard.publish_button')}
        </Button>
      </div>
    </div>
  );
}
