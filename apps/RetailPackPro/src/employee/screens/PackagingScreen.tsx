/**
 * Samlet emballage-skærm (kasse/inderemballage/mellemlæg/hjørnebeskytter)
 * — jf. Fase 2-beslutningen om at slå de fire undertrin sammen til én
 * skærm, i stedet for fire separate. Kun de elementer, profilen faktisk
 * bruger, vises (alle er nullable).
 */
import { Button, Card } from '@platform/ui';

import { useT } from '../../i18n/I18nProvider';
import type { PackGuide } from '../../services';

import { ReferenceImageOverlay } from './ReferenceImageOverlay';

export function PackagingScreen({ guide, onNext }: { guide: PackGuide; onNext: () => void }) {
  const { t } = useT();
  const items = [guide.box, guide.innerPackaging, guide.divider, guide.cornerProtector].filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );
  const relevantImages = guide.referenceImages.filter((img) => img.relatedStep === 'packaging');

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{t('retailpackpro.packaging.title')}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
        {items.map((item) => (
          <Card key={item.id} style={{ textAlign: 'center' }}>
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: 96, objectFit: 'contain' }} />
            )}
            <div style={{ marginTop: 8, fontWeight: 600 }}>{item.name}</div>
          </Card>
        ))}
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
