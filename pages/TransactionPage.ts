import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export type TransactionField = 'Transaction ID' | 'Date' | 'Description' | 'Type' | 'Amount';

/** transaction.htm?id=<transactionId>: one transaction's details. */
export class TransactionPage extends BasePage {
  protected path = 'transaction.htm';

  /** The value cell next to a label such as "Transaction ID:". */
  value(field: TransactionField): Locator {
    return this.page
      .locator('#rightPanel tr')
      .filter({ hasText: `${field}:` })
      .locator('td')
      .nth(1);
  }
}
