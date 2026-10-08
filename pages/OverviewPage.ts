import { expect, Locator } from '@playwright/test';
import { parseMoney } from '../utils/money';
import { BasePage } from './BasePage';

export interface AccountRow {
  accountId: string;
  balance: number;
  available: number;
}

export class OverviewPage extends BasePage {
  protected readonly path = 'overview.htm';

  readonly accountTable: Locator;
  /** One row per account (rows with an account link); excludes the Total row. */
  readonly accountRows: Locator;
  readonly totalRow: Locator;

  constructor(...args: ConstructorParameters<typeof BasePage>) {
    super(...args);
    this.accountTable = this.page.locator('#accountTable');
    this.accountRows = this.accountTable.locator('tbody tr').filter({ has: this.page.getByRole('link') });
    this.totalRow = this.accountTable.locator('tbody tr').filter({ hasText: 'Total' });
  }

  /** The table is filled by JavaScript, so wait for the Total row before reading it. */
  async waitForAccounts(): Promise<void> {
    await expect(this.totalRow).toBeVisible();
  }

  async getAccounts(): Promise<AccountRow[]> {
    await this.waitForAccounts();
    const rows: AccountRow[] = [];
    for (const row of await this.accountRows.all()) {
      const cells = row.locator('td');
      rows.push({
        accountId: (await cells.nth(0).innerText()).trim(),
        balance: parseMoney(await cells.nth(1).innerText()),
        available: parseMoney(await cells.nth(2).innerText()),
      });
    }
    return rows;
  }
}
