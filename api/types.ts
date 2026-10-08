export type AccountType = 'CHECKING' | 'SAVINGS' | 'LOAN';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  address: Address;
  phoneNumber: string;
  ssn: string;
}

export interface Account {
  id: number;
  customerId: number;
  type: AccountType;
  balance: number;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: 'Credit' | 'Debit';
  /** Epoch milliseconds. */
  date: number;
  amount: number;
  description: string;
}

export interface Payee {
  name: string;
  address: Address;
  phoneNumber: string;
  accountNumber: string;
}

export interface BillPayResult {
  payeeName: string;
  amount: number;
  accountId: number;
}
