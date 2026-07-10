/**
 * Samlet palle-/pakkemetode-skærm: palletype + placering + lag/højde/vægt/
 * mix + labelplacering/SSCC/folie — jf. Fase 2-beslutningen om at flette
 * label/SSCC/folie ind her i stedet for en separat skærm.
 */
import { Badge, Button, Card } from '@platform/ui';

import { useT } from '../../i18n/I18nProvider';
import type { PackGuide } from '../../services';

import { ReferenceImageOverlay } from './ReferenceImageOverlay';

export function PalletScreen({ guide, onNext }: { guide: PackGuide; onNext: () => void }) {
  const { t } = useT();
  const { profile } = guide;
  const relevantImages = guide.referenceImages.filter((img) => img.relatedStep === 'pallet');

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{t('retailpackpro.pallet.title')}</h1>

      {guide.pallet && (
        <Card style={{ textAlign: 'center', marginBottom: 16 }}>
          {guide.pallet.imageUrl && (
            <img src={guide.pallet.imageUrl} alt={guide.pallet.name} style={{ width: '100%', height: 140, objectFit: 'contain' }} />
          )}
          <div style={{ marginTop: 8, fontWeight: 600 }}>{guide.pallet.name}</div>
        </Card>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {profile.maxHeightCm !== null && (
          <Badge tone="info">📏 {t('retailpackpro.pallet.max_height')}: {profile.maxHeightCm} cm</Badge>
        )}
        {profile.maxWeightKg !== null && (
          <Badge tone="info">⚖ {t('retailpackpro.pallet.max_weight')}: {profile.maxWeightKg} kg</Badge>
        )}
        {profile.layerCount !== null && (
          <Badge tone="neutral">📚 {t('retailpackpro.pallet.layers')}: {profile.layerCount}</Badge>
        )}
        {profile.mixedPalletAllowed !== null && (
          <Badge tone={profile.mixedPalletAllowed ? 'success' : 'warning'}>
            🔀 {t('retailpackpro.pallet.mixed_pallet')}: {profile.mixedPalletAllowed ? 'Ja' : 'Nej'}
          </Badge>
        )}
        {profile.ssccLabelRequired && <Badge tone="info">SSCC</Badge>}
        {profile.labelPosition && <Badge tone="neutral">🏷 {profile.labelPosition}</Badge>}
        {profile.foilType && <Badge tone="neutral">🎞 {profile.foilType}</Badge>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <ReferenceImageOverlay images={relevantImages} />
      </div>

      <Button variant="primary" size="employee" onClick={onNext}>
        {t('core.actions.next')}
      </Button>
    </div>
  );
}
