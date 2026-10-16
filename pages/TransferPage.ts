import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class TransferPage extends BasePage {
  protected readonly path = 'transfer.htm';

  readonly amount: Locator;
  readonly fromAccount: Locator;
  readonly toAccount: Locator;
  readonly transferButton: Locator;
  readonly resultTitle: Locator;
  readonly amountResult: Locator;
  readonly fromAccountResult: Locator;
  readonly toAccountResult: Locator;
  readonly emptyAmountError: Locator;
  readonly invalidAmountError: Locator;
  /** The "Error!" panel shown when the server rejects the request. */
  readonly internalError: Locator;

  constructor(...args: ConstructorParameters<typeof BasePage>) {
    super(...args);
    this.amount = this.page.locator('#amount');
    this.fromAccount = this.page.locator('#fromAccountId');
    this.toAccount = this.page.locator('#toAccountId');
    this.transferButton = this.page.getByRole('button', { name: 'Transfer' });
    this.resultTitle = this.page.locator('#showResult h1.title');
    this.amountResult = this.page.locator('#amountResult');
    this.fromAccountResult = this.page.locator('#fromAccountIdResult');
    this.toAccountResult = this.page.locator('#toAccountIdResult');
    this.emptyAmountError = this.page.locator('#showForm p.error', { hasText: 'The amount cannot be empty.' });
    this.invalidAmountError = this.page.locator('#showForm p.error', { hasText: 'Please enter a valid amount.' });
    this.internalError = this.page.locator('#showError');
  }

  /** Both account lists are filled by a request after load. */
  async waitForAccounts(): Promise<void> {
    await expect(this.fromAccount.locator('option')).not.toHaveCount(0);
    await expect(this.toAccount.locator('option')).not.toHaveCount(0);
  }

  async fromAccountIds(): Promise<string[]> {
    await this.waitForAccounts();
    return this.optionValues(this.fromAccount);
  }

  async toAccountIds(): Promise<string[]> {
    await this.waitForAccounts();
    return this.optionValues(this.toAccount);
  }

  async transfer(amount: string, fromAccountId: string | number, toAccountId: string | number): Promise<void> {
    await this.waitForAccounts();
    await this.amount.fill(amount);
    await this.fromAccount.selectOption(String(fromAccountId));
    await this.toAccount.selectOption(String(toAccountId));
    // The page has no client-side checks, so every submit reaches the server; wait for its answer
    // so assertions that something did NOT happen are meaningful.
    const response = this.page.waitForResponse((r) => r.url().includes('/bank/transfer?'));
    await this.transferButton.click();
    await response;
  }
}
