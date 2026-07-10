import type { Customer, PackFlowStepKey, Product } from '../data/types';
import type { PackGuide } from '../services';

export type EmployeeFlowState =
  | { screen: 'select-customer' }
  | { screen: 'scan'; customer: Customer }
  | { screen: 'loading-guide'; customer: Customer; product: Product }
  | { screen: 'no-profile'; customer: Customer }
  | {
      screen: 'guide';
      customer: Customer;
      product: Product;
      guide: PackGuide;
      sequence: PackFlowStepKey[];
      stepIndex: number;
    }
  | { screen: 'approving'; customer: Customer; product: Product; guide: PackGuide }
  | { screen: 'approved'; customer: Customer };
