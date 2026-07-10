/**
 * ÉT søgefelt — ikke to. Systemet afgør selv, om input er en stregkode/
 * varenummer (kun cifre) eller et varenavn (design-princip 5: "Systemet
 * skal selv finde ud af hvad brugeren mener").
 *
 * Praktisk bonus: da feltet er et almindeligt tekstfelt med auto-fokus og
 * "submit ved Enter", virker det direkte sammen med en fysisk stregkode-
 * scanner (de fleste lagerscannere "taster" koden efterfulgt af Enter) —
 * uden at kræve kamera-/BarcodeDetector-integration.
 *
 * Automatik: findes der PRÆCIS ét match ved navnesøgning, vælges det med
 * det samme — medarbejderen skal kun vælge, når der reelt er flere svar.
 */
import { Button, Card } from '@platform/ui';
import { useRef, useState, type FormEvent } from 'react';

import type { Product } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

export interface ScanScreenProps {
  companyId: string;
  onProductFound: (product: Product) => void;
}

const BARCODE_PATTERN = /^\d{6,}$/;

export function ScanScreen({ companyId, onProductFound }: ScanScreenProps) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [multipleMatches, setMultipleMatches] = useState<Product[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reported, setReported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNotFound(false);
    setReported(false);
    setMultipleMatches(null);

    const value = query.trim();
    if (!value) return;

    if (BARCODE_PATTERN.test(value)) {
      const product = await getServices().products.findByEan(companyId, value);
      if (product) {
        onProductFound(product);
      } else {
        setNotFound(true);
        setQuery('');
        inputRef.current?.focus();
      }
      return;
    }

    const results = await getServices().products.searchByName(companyId, value);
    if (results.length === 1) {
      onProductFound(results[0]!); // entydigt match — ingen grund til at spørge
    } else if (results.length === 0) {
      setNotFound(true);
      setQuery('');
      inputRef.current?.focus();
    } else {
      setMultipleMatches(results);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{t('retailpackpro.scan.title')}</h1>

      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('retailpackpro.scan.search_placeholder')}
          autoFocus
          style={{
            width: '100%',
            minHeight: 64,
            padding: 16,
            fontSize: 20,
            borderRadius: 8,
            border: '1px solid #e2e2e5',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ marginTop: 12 }}>
          <Button variant="primary" size="employee">
            {t('core.actions.confirm')}
          </Button>
        </div>
      </form>

      {notFound && (
        <Card style={{ marginTop: 16, backgroundColor: '#fef7e0' }}>
          <p>{t('retailpackpro.scan.not_found')}</p>
          {!reported ? (
            <Button variant="secondary" size="employee" onClick={() => setReported(true)}>
              {t('retailpackpro.scan.report_missing')}
            </Button>
          ) : (
            <p style={{ fontSize: 13, color: '#1e8e3e' }}>✓</p>
          )}
        </Card>
      )}

      {multipleMatches && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {multipleMatches.map((product) => (
            <Card
              key={product.id}
              onClick={() => onProductFound(product)}
              role="button"
              style={{ cursor: 'pointer', minHeight: 64, display: 'flex', alignItems: 'center' }}
            >
              {product.name}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
