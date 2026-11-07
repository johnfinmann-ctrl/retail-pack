/**
 * Pakkevejledningen — skærmen hele produktet handler om ("Scan. Se. Pak.").
 * Samme indhold og rækkefølge-princip som v0.3.0's PackGuideScreen, udvidet med
 * v0.4.0-felterne (varenummer, kolli pr. lag, produkt- og pallebillede).
 * Bruges af medarbejderen, i ordreflowet OG i admins forhåndsvisning, så admin
 * ser præcis den samme skærm.
 */
import { shouldShowPackaging } from '@rpp/employee/FlowEngine';
import type { PackGuide } from '@rpp/services';
import { useState, type ReactNode } from 'react';

import type { CustomerV4, PackProfileV4, ProductV4 } from '../domain/types';
import { t } from '../i18n';
import { Lightbox } from '../ui/common';
import { Icon } from '../ui/Icon';
import { Img } from '../ui/media';
import { PalletIllustration } from '../ui/PalletIllustration';

function palletKind(name: string | undefined): 'eur' | 'half' | 'quarter' {
  const n = (name ?? '').toLowerCase();
  if (n.includes('kvart')) return 'quarter';
  if (n.includes('halv')) return 'half';
  return 'eur';
}

export function PackGuideView({
  guide,
  product,
  customer,
  actions,
  quantityNote,
}: {
  guide: PackGuide;
  product: ProductV4 | null;
  customer: CustomerV4 | null;
  actions?: ReactNode;
  /** Fx "Denne palle: 48 kolli" i ordreflowet. */
  quantityNote?: ReactNode;
}) {
  const profile = guide.profile as PackProfileV4;
  const [zoom, setZoom] = useState<{ src: string; caption: string | null } | null>(null);
  const showPackaging = shouldShowPackaging(guide.activeFlowSteps);
  const packaging = showPackaging
    ? [guide.box, guide.innerPackaging, guide.divider, guide.cornerProtector].filter((x): x is NonNullable<typeof x> => x !== null)
    : [];

  const yesNo = (v: boolean | null) => (v === null ? null : v ? t('demo.common.yes') : t('demo.common.no'));
  type Tone = 'yes' | 'no' | undefined;
  const tone = (v: boolean | null): Tone => (v === null ? undefined : v ? 'yes' : 'no');
  const specs: Array<{ icon: string; k: string; v: string | null; tone?: Tone }> = [
    { icon: 'pallet', k: t('demo.guide.pallet_type'), v: guide.pallet?.name ?? null },
    { icon: 'label', k: t('demo.guide.label'), v: profile.labelPosition },
    { icon: 'foil', k: t('demo.guide.foil'), v: profile.foilType },
    {
      icon: 'mix',
      k: t('demo.guide.mixed'),
      v: yesNo(profile.mixedPalletAllowed),
      tone: tone(profile.mixedPalletAllowed),
    },
    {
      icon: 'box',
      k: t('demo.guide.overhang'),
      v: yesNo(profile.overhangAllowed),
      tone: tone(profile.overhangAllowed),
    },
    { icon: 'barcode', k: t('demo.guide.sscc'), v: profile.ssccLabelRequired ? t('demo.guide.sscc_yes') : null },
  ].filter((s) => s.v);

  return (
    <div className="guide">
      <div className="guide-head">
        <div className="thumb">
          <Img src={product?.imageUrl} alt={product?.name ?? ''} />
        </div>
        <div className="grow">
          <h1>{product?.name ?? profile.name}</h1>
          {product && (
            <p className="code num">
              {t('demo.guide.item_no')} {product.itemNumber} · EAN {product.ean}
            </p>
          )}
          {customer && (
            <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <span className="pill info">{customer.name}</span>
              {customer.isTestCustomer && <span className="pill test">{t('demo.common.test_customer')}</span>}
            </p>
          )}
        </div>
      </div>

      {quantityNote}

      {profile.specialInstructions && (
        <div className="special" role="note">
          <Icon name="warn" size={30} />
          <span>{profile.specialInstructions}</span>
        </div>
      )}

      <div className="visual">
        <figure>
          <div className="frame">
            {profile.placementPatternImageUrl ? (
              <button
                type="button"
                onClick={() => setZoom({ src: profile.placementPatternImageUrl!, caption: t('demo.guide.finished_pallet') })}
                style={{ border: 0, padding: 0, background: 'transparent', width: '100%', height: '100%', cursor: 'zoom-in' }}
              >
                <Img src={profile.placementPatternImageUrl} alt={t('demo.guide.finished_pallet')} />
              </button>
            ) : (
              <PalletIllustration
                layers={profile.layerCount}
                unitsPerLayer={profile.unitsPerLayer}
                maxHeightCm={profile.maxHeightCm}
                foil={profile.foilType}
                labelPosition={profile.labelPosition}
                palletKind={palletKind(guide.pallet?.name)}
                cornerProtectors={!!guide.cornerProtector}
                dividers={!!guide.divider}
              />
            )}
          </div>
          <figcaption>
            <span>{t('demo.guide.finished_pallet')}</span>
            {!profile.placementPatternImageUrl && <span>{t('demo.guide.illustration')}</span>}
          </figcaption>
        </figure>
        <figure>
          <div className="frame">
            <Img src={product?.imageUrl} alt={product?.name ?? ''} />
          </div>
          <figcaption>
            <span>{t('demo.guide.product')}</span>
            {product?.imageUrl?.startsWith('illustration:') && <span>{t('demo.guide.illustration')}</span>}
          </figcaption>
        </figure>
      </div>

      <div className="facts">
        <Fact icon="layers" k={t('demo.guide.layers')} v={profile.layerCount} />
        <Fact icon="grid" k={t('demo.guide.units_per_layer')} v={profile.unitsPerLayer} />
        <Fact icon="height" k={t('demo.guide.max_height')} v={profile.maxHeightCm} unit="cm" />
        <Fact icon="weight" k={t('demo.guide.max_weight')} v={profile.maxWeightKg} unit="kg" />
      </div>

      {specs.length > 0 && (
        <div className="specs">
          {specs.map((s) => (
            <div className="spec" key={s.k}>
              <span className="ic">
                <Icon name={s.icon} />
              </span>
              <div className="grow">
                <div className="k">{s.k}</div>
                <div className={`v${s.tone ? ` ${s.tone}` : ''}`}>{s.v}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {packaging.length > 0 && (
        <div className="panel flat" style={{ gap: 8 }}>
          <div className="eyebrow">{t('demo.guide.packaging')}</div>
          <div className="packaging-strip">
            {packaging.map((item) => (
              <div className="pk" key={item.id}>
                <Img src={item.imageUrl} alt="" />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {guide.referenceImages.length > 0 && (
        <div className="panel flat" style={{ gap: 8 }}>
          <div className="eyebrow">{t('demo.guide.reference_images')}</div>
          <div className="ref-row">
            {guide.referenceImages.map((r) => (
              <button type="button" className="ref" key={r.id} onClick={() => setZoom({ src: r.url, caption: r.caption })}>
                <Img src={r.url} alt={r.caption ?? ''} />
                {r.caption && <span>{r.caption}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {actions && <div className="sticky-actions">{actions}</div>}

      {zoom && <Lightbox src={zoom.src} caption={zoom.caption} onClose={() => setZoom(null)} />}
    </div>
  );
}

function Fact({ icon, k, v, unit }: { icon: string; k: string; v: number | null; unit?: string }) {
  return (
    <div className="fact">
      <div className="v">
        {v ?? '–'}
        {v !== null && unit && <span className="u">{unit}</span>}
      </div>
      <div className="k">
        <Icon name={icon} size={18} /> {k}
      </div>
    </div>
  );
}
