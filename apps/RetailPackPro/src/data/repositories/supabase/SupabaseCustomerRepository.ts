import type { DataClient } from '@platform/data';

import { mapCustomerRow } from '../../mappers';
import type { Customer } from '../../types';
import type { CustomerRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

export class SupabaseCustomerRepository implements CustomerRepository {
  constructor(private readonly data: DataClient) {}

  async listActive(companyId: string): Promise<Customer[]> {
    const rows = await this.data.runMany(
      this.data
        .schema(RPP_SCHEMA)
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('name'),
    );
    return rows.map(mapCustomerRow);
  }

  async getById(customerId: string): Promise<Customer | null> {
    const row = await this.data.run(
      this.data
        .schema(RPP_SCHEMA)
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .is('deleted_at', null)
        .maybeSingle(),
    );
    return row ? mapCustomerRow(row) : null;
  }
}
