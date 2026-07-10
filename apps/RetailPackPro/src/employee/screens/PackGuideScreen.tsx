/**
 * DEN skærm hele produktet handler om: "Scan. Se. Pak." (design-princip 8).
 *
 * Erstatter de tidligere tre separate skærme (Packaging → Pallet → Approve)
 * med ÉN skærm. Begrundelse (jf. UX-gennemgang før Sprint 3):
 * - Emballage og palle er begge "her er hvordan du pakker" — ikke to
 *   forskellige opgaver, der retfærdiggør hvert sit tryk.
 * - Godkend hører naturligt hjemme her: medarbejderen bygger pallen MENS
 *   skærmen er fremme, og trykker godkend, når pallen er færdig — at
 *   tvinge et ekstra "Næste"-tryk før godkend-knappen dukker op er spildt tid.
 * - Emballage-elementer, der ikke findes for denne profil, vises slet
 *   ikke — aldrig en tom sektion.
 *
 * Viser KUN det design-princip 6 beder om: billede, palletype, lag, maks
 * højde/vægt, labelplacering, folie, mixpalle, og højst én instruktion.
 * SSCC vises IKKE her — det hjælper ikke med at bygge pallen korrekt.
 */
import { Button, Card } from '@platform/ui';
import type { CSSProperties } from 'react';


import { useT } from '../../i18n/I18nProvider';
import type { PackGuide } from '../../services';

import { ReferenceImageOverlay } from './ReferenceImageOverlay';

export interface PackGuideScreenProps {
  guide: PackGuide;
  /** Fra shouldShowPackaging(guide.activeFlowSteps) — respekterer virksomhedens konfiguration. */
  showPackaging: boolean;
  onApprove: () => void;
  submitting: boolean;
}

const BIG_FACT_STYLE: CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  lineHeight: 1.1,
};

export function PackGuideScreen({ guide, showPackaging, onApprove, submitting }: PackGuideScreenProps) {
  const { t } = useT();
  const { profile } = guide;

  const packagingItems = showPackaging
    ? [guide.box, guide.innerPackaging, guide.divider, guide.cornerProtector].filter(
        (item): item is NonNullable<typeof item> => item !== null,
      )
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Emballage — kun vist hvis der reelt er noget at vise (automatik-princippet) */}
      {packagingItems.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${packagingItems.length}, 1fr)`, gap: 12 }}>
          {packagingItems.map((item) => (
            <Card key={item.id} style={{ textAlign: 'center', padding: 8 }}>
              {item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: 140, objectFit: 'contain' }} />
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pallen — det centrale billede, størst på skærmen */}
      {guide.pallet?.imageUrl && (
        <img
          src={guide.pallet.imageUrl}
          alt={guide.pallet.name}
          style={{ width: '100%', height: 220, objectFit: 'contain' }}
        />
      )}

      {/* De tal der styrer stablingen — store, ikke gemt i småbadges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
        {profile.layerCount !== null && (
          <div>
            <div style={BIG_FACT_STYLE}>{profile.layerCount}</div>
            <div style={{ fontSize: 13, color: '#5c5c66' }}>{t('retailpackpro.pallet.layers')}</div>
          </div>
        )}
        {profile.maxHeightCm !== null && (
          <div>
            <div style={BIG_FACT_STYLE}>{profile.maxHeightCm}</div>
            <div style={{ fontSize: 13, color: '#5c5c66' }}>{t('retailpackpro.pallet.max_height')} (cm)</div>
          </div>
        )}
        {profile.maxWeightKg !== null && (
          <div>
            <div style={BIG_FACT_STYLE}>{profile.maxWeightKg}</div>
            <div style={{ fontSize: 13, color: '#5c5c66' }}>{t('retailpackpro.pallet.max_weight')} (kg)</div>
          </div>
        )}
      </div>

      {/* Sekundær info — mindre fremtrædende, kun hvis relevant */}
      {(profile.mixedPalletAllowed !== null || profile.labelPosition || profile.foilType) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13, color: '#5c5c66' }}>
          {profile.mixedPalletAllowed !== null && (
            <span>🔀 {t('retailpackpro.pallet.mixed_pallet')}: {profile.mixedPalletAllowed ? 'Ja' : 'Nej'}</span>
          )}
          {profile.labelPosition && <span>🏷 {profile.labelPosition}</span>}
          {profile.foilType && <span>🎞 {profile.foilType}</span>}
        </div>
      )}

      {/* Højst ÉN vigtig instruktion — aldrig en lang tekstblok */}
      {profile.specialInstructions && (
        <Card style={{ backgroundColor: '#fef7e0', padding: 12 }}>
          <p style={{ margin: 0, fontSize: 14 }}>⚠️ {profile.specialInstructions}</p>
        </Card>
      )}

      <ReferenceImageOverlay images={guide.referenceImages} />

      <Button variant="primary" size="employee" onClick={onApprove} disabled={submitting}>
        {t('retailpackpro.approve.button')}
      </Button>
    </div>
  );
}
