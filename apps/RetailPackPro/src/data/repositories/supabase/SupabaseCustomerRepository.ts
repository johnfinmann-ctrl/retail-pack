import { toAppError } from '@platform/config';
import type { SupabaseClient } from '@supabase/supabase-js';

import { mapCustomerRow } from '../../mappers';
import type { Customer } from '../../types';
import type { CustomerRepository } from '../interfaces';

import { RPP_SCHEMA } from './schema';

export class SupabaseCustomerRepository implements CustomerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listActive(companyId: string): Promise<Customer[]> {
    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('customers')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('name');

    if (error) throw toAppError(error);
    return (data ?? []).map(mapCustomerRow);
  }

  async getById(customerId: string): Promise<Customer | null> {
    const { data, error } = await this.client
      .schema(RPP_SCHEMA)
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw toAppError(error);
    return data ? mapCustomerRow(data) : null;
  }
}
