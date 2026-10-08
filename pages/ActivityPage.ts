import { expect, Locator, Response } from '@playwright/test';
import { parseMoney } from '../utils/money';
import type { MonthName } from '../utils/dates';
import { BasePage } from './BasePage';

export interface AccountDetails {
  accountId: string;
  accountType: string;
  balance: number;
  available: number;
}

export interface ActivityRow {
  date: string;
  description: string;
  /** Dollar amount, or null when the column is empty. */
  debit: number | null;
  credit: number | null;
}

export type TransactionTypeFilter = 'All' | 'Credit' | 'Debit';

/** activity.htm?id=<accountId>: Account Details plus the Account Activity list. */
export class ActivityPage extends BasePage {
  protected path = 'activity.htm';

  readonly accountId: Locator;
  readonly accountType: Locator;
  readonly balance: Locator;
  readonly available: Locator;
  readonly monthFilter: Locator;
  readonly typeFilter: Locator;
  readonly goButton: Locator;
  readonly noTransactions: Locator;
  readonly transactionRows: Locator;

  constructor(...args: ConstructorParameters<typeof BasePage>) {
    super(...args);
    this.accountId = this.page.locator('#accountId');
    this.accountType = this.page.locator('#accountType');
    this.balance = this.page.locator('#balance');
    this.available = this.page.locator('#availableBalance');
    this.monthFilter = this.page.locator('#month');
    this.typeFilter = this.page.locator('#transactionType');
    this.goButton = this.page.getByRole('button', { name: 'Go' });
    this.noTransactions = this.page.locator('#noTransactions');
    this.transactionRows = this.page.locator('#transactionTable tbody tr');
  }

  /** The page loads its transactions with a separate request; this resolves once it returns. */
  private waitForTransactionsResponse(): Promise<Response> {
    return this.page.waitForResponse((response) => /\/transactions\/month\//.test(response.url()));
  }

  async openFor(accountId: string | number): Promise<void> {
    this.path = `activity.htm?id=${accountId}`;
    const loaded = this.waitForTransactionsResponse();
    await this.open();
    await loaded;
  }

  async getDetails(): Promise<AccountDetails> {
    await expect(this.accountType).not.toBeEmpty();
    return {
      accountId: (await this.accountId.innerText()).trim(),
      accountType: (await this.accountType.innerText()).trim(),
      balance: parseMoney(await this.balance.innerText()),
      available: parseMoney(await this.available.innerText()),
    };
  }

  async filter(month: MonthName | 'All', type: TransactionTypeFilter): Promise<void> {
    await this.monthFilter.selectOption(month);
    await this.typeFilter.selectOption(type);
    const loaded = this.waitForTransactionsResponse();
    await this.goButton.click();
    await loaded;
  }

  async getTransactions(): Promise<ActivityRow[]> {
    const money = (text: string): number | null => (text.trim() === '' ? null : parseMoney(text));
    const rows: ActivityRow[] = [];
    for (const row of await this.transactionRows.all()) {
      const cells = row.locator('td');
      rows.push({
        date: (await cells.nth(0).innerText()).trim(),
        description: (await cells.nth(1).innerText()).trim(),
        debit: money(await cells.nth(2).innerText()),
        credit: money(await cells.nth(3).innerText()),
      });
    }
    return rows;
  }

  transactionLink(transactionId: string | number): Locator {
    return this.page.locator(`#transactionTable a[href$="transaction.htm?id=${transactionId}"]`);
  }
}
