import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import type { Account, AccountType, BillPayResult, Customer, Payee, Transaction } from './types';

/** `newAccountType` codes used by `createAccount`. */
const ACCOUNT_TYPE_CODES: Record<Exclude<AccountType, 'LOAN'>, number> = {
  CHECKING: 0,
  SAVINGS: 1,
};

/** Thin wrapper around the ParaBank REST API (`services/bank/...`). */
export class ParaBankApi {
  private static readonly BASE = 'services/bank';
  private static readonly HEADERS = { Accept: 'application/json' };

  constructor(private readonly request: APIRequestContext) {}

  private async json<T>(response: APIResponse, what: string): Promise<T> {
    await expect(response, what).toBeOK();
    return response.json() as Promise<T>;
  }

  private get<T>(path: string, what: string): Promise<T> {
    return this.request
      .get(`${ParaBankApi.BASE}/${path}`, { headers: ParaBankApi.HEADERS })
      .then((response) => this.json<T>(response, what));
  }

  private post<T>(path: string, what: string, params: Record<string, string | number>, data?: unknown): Promise<T> {
    return this.request
      .post(`${ParaBankApi.BASE}/${path}`, { headers: ParaBankApi.HEADERS, params, data })
      .then((response) => this.json<T>(response, what));
  }

  login(username: string, password: string): Promise<Customer> {
    return this.get(`login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`, 'login');
  }

  getAccounts(customerId: number): Promise<Account[]> {
    return this.get(`customers/${customerId}/accounts`, 'get accounts');
  }

  getAccount(accountId: number): Promise<Account> {
    return this.get(`accounts/${accountId}`, 'get account');
  }

  getTransactions(accountId: number): Promise<Transaction[]> {
    return this.get(`accounts/${accountId}/transactions`, 'get transactions');
  }

  createAccount(customerId: number, type: Exclude<AccountType, 'LOAN'>, fromAccountId: number): Promise<Account> {
    return this.post('createAccount', 'create account', {
      customerId,
      newAccountType: ACCOUNT_TYPE_CODES[type],
      fromAccountId,
    });
  }

  async transfer(fromAccountId: number, toAccountId: number, amount: number): Promise<void> {
    const response = await this.request.post(`${ParaBankApi.BASE}/transfer`, {
      params: { fromAccountId, toAccountId, amount },
    });
    await expect(response, 'transfer').toBeOK();
  }

  billPay(accountId: number, amount: number, payee: Payee): Promise<BillPayResult> {
    return this.post('billpay', 'bill pay', { accountId, amount }, payee);
  }
}
