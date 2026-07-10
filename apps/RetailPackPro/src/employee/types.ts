import type { Customer, Product } from '../data/types';
import type { PackGuide } from '../services';

export type EmployeeFlowState =
  | { screen: 'select-customer' }
  | { screen: 'scan'; customer: Customer }
  | { screen: 'loading-guide'; customer: Customer }
  | { screen: 'no-profile'; customer: Customer }
  | { screen: 'guide'; customer: Customer; product: Product; guide: PackGuide }
  | { screen: 'approved'; customer: Customer };
