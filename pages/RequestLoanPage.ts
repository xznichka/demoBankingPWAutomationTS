import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/** requestloan.htm. Only the source account list for now; the loan form comes with LOAN-01…06. */
export class RequestLoanPage extends BasePage {
  protected readonly path = 'requestloan.htm';

  readonly fromAccount: Locator;

  constructor(...args: ConstructorParameters<typeof BasePage>) {
    super(...args);
    this.fromAccount = this.page.locator('#fromAccountId');
  }

  fromAccountIds(): Promise<string[]> {
    return this.optionValues(this.fromAccount);
  }
}
