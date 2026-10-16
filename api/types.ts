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

export interface LoanResponse {
  /** Epoch milliseconds. */
  responseDate: number;
  loanProviderName: string;
  approved: boolean;
  /** The new LOAN account, or null when denied. */
  accountId: number | null;
  /** Reason code when denied, e.g. "error.insufficient.funds". */
  message?: string;
}

/** Every field `customers/update/{customerId}` requires. */
export interface CustomerUpdate {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}
