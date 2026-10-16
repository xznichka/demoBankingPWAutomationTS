import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import type { PayeeData } from '../utils/testData';
import type {
  Account,
  AccountType,
  BillPayResult,
  Customer,
  CustomerUpdate,
  LoanResponse,
  Payee,
  Transaction,
} from './types';

/** `newAccountType` codes used by `createAccount`. */
const ACCOUNT_TYPE_CODES: Record<Exclude<AccountType, 'LOAN'>, number> = {
  CHECKING: 0,
  SAVINGS: 1,
};

type Params = Record<string, string | number>;

/**
 * Thin wrapper around the ParaBank REST API (`services/bank/...`).
 * Typed methods assert a 2xx response; `getResponse`/`postResponse` return the raw response for negative tests.
 * Never add the global admin endpoints (`cleanDB`, `initializeDB`, `setParameter`, JMS): they affect every user.
 */
export class ParaBankApi {
  private static readonly BASE = 'services/bank';
  private static readonly HEADERS = { Accept: 'application/json' };

  constructor(private readonly request: APIRequestContext) {}

  /**
   * GET `services/bank/<path>` without checking ParaBank's status code.
   * Cloudflare blocks (403/429) still fail here: ParaBank never sends those itself, and a 429 would
   * otherwise look like the 4xx a negative test is waiting for.
   */
  async getResponse(path: string): Promise<APIResponse> {
    return this.notBlocked(
      await this.request.get(`${ParaBankApi.BASE}/${path}`, { headers: ParaBankApi.HEADERS }),
      `GET ${path}`,
    );
  }

  /** POST `services/bank/<path>` without checking ParaBank's status code. Cloudflare blocks still fail. */
  async postResponse(path: string, params: Params = {}, data?: unknown): Promise<APIResponse> {
    return this.notBlocked(
      await this.request.post(`${ParaBankApi.BASE}/${path}`, { headers: ParaBankApi.HEADERS, params, data }),
      `POST ${path}`,
    );
  }

  private notBlocked(response: APIResponse, what: string): APIResponse {
    const status = response.status();
    expect(
      status === 403 || status === 429,
      `${what}: blocked by Cloudflare (HTTP ${status}); the shared site is throttling test traffic, retry later`,
    ).toBe(false);
    return response;
  }

  private async json<T>(response: APIResponse, what: string): Promise<T> {
    await expect(response, what).toBeOK();
    return response.json() as Promise<T>;
  }

  private async text(response: APIResponse, what: string): Promise<string> {
    await expect(response, what).toBeOK();
    return response.text();
  }

  private async get<T>(path: string, what: string): Promise<T> {
    return this.json<T>(await this.getResponse(path), what);
  }

  private async post<T>(path: string, what: string, params: Params, data?: unknown): Promise<T> {
    return this.json<T>(await this.postResponse(path, params, data), what);
  }

  login(username: string, password: string): Promise<Customer> {
    return this.get(`login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`, 'login');
  }

  getCustomer(customerId: number): Promise<Customer> {
    return this.get(`customers/${customerId}`, 'get customer');
  }

  /** Returns the confirmation text, e.g. "Successfully updated customer profile". */
  async updateCustomer(customerId: number, update: CustomerUpdate): Promise<string> {
    return this.text(await this.postResponse(`customers/update/${customerId}`, { ...update }), 'update customer');
  }

  getAccounts(customerId: number): Promise<Account[]> {
    return this.get(`customers/${customerId}/accounts`, 'get accounts');
  }

  getAccount(accountId: number): Promise<Account> {
    return this.get(`accounts/${accountId}`, 'get account');
  }

  createAccount(customerId: number, type: Exclude<AccountType, 'LOAN'>, fromAccountId: number): Promise<Account> {
    return this.post('createAccount', 'create account', {
      customerId,
      newAccountType: ACCOUNT_TYPE_CODES[type],
      fromAccountId,
    });
  }

  /** Returns the confirmation text, e.g. "Successfully transferred $5 from account #1 to account #2". */
  async transfer(fromAccountId: number, toAccountId: number, amount: number): Promise<string> {
    return this.text(await this.postResponse('transfer', { fromAccountId, toAccountId, amount }), 'transfer');
  }

  billPay(accountId: number, amount: number, payee: PayeeData): Promise<BillPayResult> {
    const body: Payee = {
      name: payee.name,
      address: { street: payee.street, city: payee.city, state: payee.state, zipCode: payee.zipCode },
      phoneNumber: payee.phoneNumber,
      accountNumber: payee.accountNumber,
    };
    return this.post('billpay', 'bill pay', { accountId, amount }, body);
  }

  requestLoan(customerId: number, amount: number, downPayment: number, fromAccountId: number): Promise<LoanResponse> {
    return this.post('requestLoan', 'request loan', { customerId, amount, downPayment, fromAccountId });
  }

  getTransaction(transactionId: number): Promise<Transaction> {
    return this.get(`transactions/${transactionId}`, 'get transaction');
  }

  getTransactions(accountId: number): Promise<Transaction[]> {
    return this.get(`accounts/${accountId}/transactions`, 'get transactions');
  }

  getTransactionsByAmount(accountId: number, amount: number): Promise<Transaction[]> {
    return this.get(`accounts/${accountId}/transactions/amount/${amount}`, 'get transactions by amount');
  }

  /** `date` is MM-DD-YYYY. */
  getTransactionsOnDate(accountId: number, date: string): Promise<Transaction[]> {
    return this.get(`accounts/${accountId}/transactions/onDate/${date}`, 'get transactions on date');
  }

  /** Dates are MM-DD-YYYY. */
  getTransactionsInRange(accountId: number, fromDate: string, toDate: string): Promise<Transaction[]> {
    return this.get(
      `accounts/${accountId}/transactions/fromDate/${fromDate}/toDate/${toDate}`,
      'get transactions in date range',
    );
  }
}
