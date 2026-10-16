import { expect, Locator } from '@playwright/test';
import type { AccountType } from '../api/types';
import { BasePage } from './BasePage';

export class OpenAccountPage extends BasePage {
  protected readonly path = 'openaccount.htm';

  readonly accountType: Locator;
  readonly fromAccount: Locator;
  readonly openButton: Locator;
  readonly resultTitle: Locator;
  readonly newAccountLink: Locator;

  constructor(...args: ConstructorParameters<typeof BasePage>) {
    super(...args);
    this.accountType = this.page.locator('#type');
    this.fromAccount = this.page.locator('#fromAccountId');
    this.openButton = this.page.getByRole('button', { name: 'Open New Account' });
    this.resultTitle = this.page.locator('#openAccountResult h1.title');
    this.newAccountLink = this.page.locator('#newAccountId');
  }

  /** The "from" list is filled by a request after load; submitting before then fails. */
  async waitForAccounts(): Promise<void> {
    await expect(this.fromAccount.locator('option')).not.toHaveCount(0);
  }

  /** Opens a new account and returns its number. */
  async openAccount(type: Exclude<AccountType, 'LOAN'>, fromAccountId?: string | number): Promise<string> {
    await this.waitForAccounts();
    await this.accountType.selectOption({ label: type });
    if (fromAccountId !== undefined) {
      await this.fromAccount.selectOption(String(fromAccountId));
    }
    await this.openButton.click();
    await expect(this.newAccountLink).not.toBeEmpty();
    return (await this.newAccountLink.innerText()).trim();
  }
}
