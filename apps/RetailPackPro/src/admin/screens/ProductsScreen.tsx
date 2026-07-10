import { Card } from '@platform/ui';
import { useEffect, useState } from 'react';

import type { Product } from '../../data/types';
import { useT } from '../../i18n/I18nProvider';
import { getServices } from '../../servicesClient';

export function ProductsScreen({ companyId }: { companyId: string }) {
  const { t } = useT();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    getServices()
      .products.listAll(companyId)
      .then((result) => {
        if (isMounted) setProducts(result);
      });
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>{t('retailpackpro.admin.nav.products')}</h1>
      {products && products.length === 0 && <p>{t('retailpackpro.admin.empty.products')}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {products?.map((product) => (
          <Card key={product.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{product.name}</span>
            <span style={{ color: '#5c5c66', fontSize: 13 }}>{product.ean}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
