import type { Repositories } from '../data/repositories/interfaces';
import type { NewPackagingItem, PackagingItem } from '../data/types';

/**
 * Til Admin's palletype-vælger i pakkemetode-guiden. Bevidst afgrænset til
 * KUN palletyper i denne omgang — kasse/inderemballage/mellemlæg/
 * hjørnebeskytter-katalog er ikke en del af Admin-opsætningen endnu
 * (matcher den bevidst indskrænkede felt-liste for pakkemetode-skærmen).
 */
export class PackagingService {
  constructor(private readonly repos: Pick<Repositories, 'packaging'>) {}

  listPalletTypes(companyId: string): Promise<PackagingItem[]> {
    return this.repos.packaging.listByType(companyId, 'pallet_type');
  }

  createPalletType(input: Omit<NewPackagingItem, 'type'>): Promise<PackagingItem> {
    return this.repos.packaging.create({ ...input, type: 'pallet_type' });
  }
}
