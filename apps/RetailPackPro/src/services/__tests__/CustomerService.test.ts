import { describe, expect, it } from 'vitest';

import { FakeCustomerRepository } from '../../data/repositories/__tests__/fakes';
import type { Customer } from '../../data/types';
import { CustomerService } from '../CustomerService';

const customers: Customer[] = [
  { id: 'c1', companyId: 'company-1', name: 'Demo A', logoUrl: null, notes: null, packFlowMode: null },
  { id: 'c2', companyId: 'company-2', name: 'Demo B', logoUrl: null, notes: null, packFlowMode: null },
];

describe('CustomerService', () => {
  it('viser kun aktive kunder for egen virksomhed', async () => {
    const service = new CustomerService({ customers: new FakeCustomerRepository(customers) });
    const result = await service.listActiveCustomers('company-1');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Demo A');
  });
});

describe('CustomerService.createCustomer', () => {
  it('opretter en ny kunde', async () => {
    const repo = new FakeCustomerRepository([]);
    const service = new CustomerService({ customers: repo });
    const created = await service.createCustomer({ companyId: 'company-1', name: 'Ny Demo Kunde' });
    expect(created.name).toBe('Ny Demo Kunde');
    expect(created.id).toBeDefined();
  });
});
