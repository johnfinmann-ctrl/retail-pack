/**
 * Scan/søg-skærmen. BEVIDST AFGRÆNSNING: implementerer manuel EAN-indtastning
 * + navnesøgning (dækker "scan/søg" i målsætningen), men INGEN live
 * kamera-baseret stregkodelæsning endnu. Begrundelse:
 * - @platform/scanner's ScannerService-kontrakt er kun et fundament
 *   (Sprint 1) — der findes ingen konkret browser-implementering endnu.
 * - Kamera-/hardware-integration kan ikke automatiseret testes i dette
 *   miljø (ingen fysisk enhed), hvilket ville bryde projektets etablerede
 *   disciplin om at verificere hvert trin.
 * Manuel indtastning dækker den aftalte minimumsmålsætning fuldt ud og er
 * 100% testbar. Live scanning kan tilføjes i et senere trin uden at ændre
 * denne skærms struktur (kun tilføje en kamera-kilde til samme handler).
 */
import { detectScanFormat, ScanFormat } from '@platform/scanner';
import { Button, Card } from '@platform/ui';
import { useState, type FormEvent } from 'react';

import type { Product } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

export interface ScanScreenProps {
  companyId: string;
  onProductFound: (product: Product) => void;
}

export function ScanScreen({ companyId, onProductFound }: ScanScreenProps) {
  const { t } = useT();
  const [code, setCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reported, setReported] = useState(false);

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setNotFound(false);
    setReported(false);

    const format = detectScanFormat(code);
    if (format !== ScanFormat.EAN) {
      // Kun EAN er koblet til produktopslag i Sprint 2 — SSCC/pallelabel
      // hører til senere pakketrin, ikke produktidentifikation.
      setNotFound(true);
      return;
    }

    const product = await getServices().products.findByEan(companyId, code);
    if (product) {
      onProductFound(product);
    } else {
      setNotFound(true);
    }
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const results = await getServices().products.searchByName(companyId, searchQuery);
    setSearchResults(results);
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{t('retailpackpro.scan.title')}</h1>

      <form onSubmit={handleCodeSubmit} style={{ marginBottom: 24 }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="EAN"
          inputMode="numeric"
          style={{ width: '100%', padding: 12, fontSize: 18, borderRadius: 8, border: '1px solid #e2e2e5' }}
        />
        <div style={{ marginTop: 8 }}>
          <Button variant="primary" size="employee">
            {t('core.actions.confirm')}
          </Button>
        </div>
      </form>

      {notFound && (
        <Card style={{ marginBottom: 16, backgroundColor: '#fef7e0' }}>
          <p>{t('retailpackpro.scan.not_found')}</p>
          {!reported && (
            <Button variant="secondary" size="admin" onClick={() => setReported(true)}>
              {t('retailpackpro.scan.report_missing')}
            </Button>
          )}
          {reported && <p style={{ fontSize: 13, color: '#1e8e3e' }}>✓</p>}
        </Card>
      )}

      <form onSubmit={handleSearch}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('retailpackpro.scan.search_placeholder')}
          style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8, border: '1px solid #e2e2e5' }}
        />
        <div style={{ marginTop: 8 }}>
          <Button variant="secondary" size="admin">
            {t('retailpackpro.scan.search_button')}
          </Button>
        </div>
      </form>

      {searchResults && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {searchResults.map((product) => (
            <Card
              key={product.id}
              onClick={() => onProductFound(product)}
              role="button"
              style={{ cursor: 'pointer' }}
            >
              {product.name}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
