import type { Repositories } from '../data/repositories/interfaces';
import type { Customer, NewCustomer } from '../data/types';

/** Ren orkestrering — ingen forretningsregel ud over "vis aktive kunder". */
export class CustomerService {
  constructor(private readonly repos: Pick<Repositories, 'customers'>) {}

  listActiveCustomers(companyId: string): Promise<Customer[]> {
    return this.repos.customers.listActive(companyId);
  }

  createCustomer(input: NewCustomer): Promise<Customer> {
    return this.repos.customers.create(input);
  }
}
