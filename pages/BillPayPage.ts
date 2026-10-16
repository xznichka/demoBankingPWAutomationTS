import { Locator } from '@playwright/test';
import { PayeeData } from '../utils/testData';
import { BasePage } from './BasePage';

export type BillPayField = keyof PayeeData | 'verifyAccount' | 'amount';

/** Form field → input `name` on billpay.htm. */
const FIELD_NAMES: Record<BillPayField, string> = {
  name: 'payee.name',
  street: 'payee.address.street',
  city: 'payee.address.city',
  state: 'payee.address.state',
  zipCode: 'payee.address.zipCode',
  phoneNumber: 'payee.phoneNumber',
  accountNumber: 'payee.accountNumber',
  verifyAccount: 'verifyAccount',
  amount: 'amount',
};

/** Validation messages, by the suffix of their `validationModel-…` id. */
export type BillPayError =
  | 'name'
  | 'address'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'phoneNumber'
  | 'account-empty'
  | 'account-invalid'
  | 'verifyAccount-empty'
  | 'verifyAccount-invalid'
  | 'verifyAccount-mismatch'
  | 'amount-empty'
  | 'amount-invalid';

export interface BillPayment {
  payee: PayeeData;
  amount: string;
  fromAccountId?: string | number;
  /** Defaults to the payee's account number. */
  verifyAccount?: string;
}

export class BillPayPage extends BasePage {
  protected readonly path = 'billpay.htm';

  readonly fromAccount: Locator;
  readonly sendButton: Locator;
  /** Every validation message currently shown. */
  readonly visibleErrors: Locator;
  readonly resultTitle: Locator;
  readonly payeeNameResult: Locator;
  readonly amountResult: Locator;
  readonly fromAccountResult: Locator;
  readonly internalError: Locator;

  constructor(...args: ConstructorParameters<typeof BasePage>) {
    super(...args);
    this.fromAccount = this.page.locator('select[name="fromAccountId"]');
    this.sendButton = this.page.getByRole('button', { name: 'Send Payment' });
    this.visibleErrors = this.page.locator('[id^="validationModel-"]:visible');
    this.resultTitle = this.page.locator('#billpayResult h1.title');
    this.payeeNameResult = this.page.locator('#payeeName');
    this.amountResult = this.page.locator('#billpayResult #amount');
    this.fromAccountResult = this.page.locator('#billpayResult #fromAccountId');
    this.internalError = this.page.locator('#billpayError');
  }

  input(field: BillPayField): Locator {
    return this.page.locator(`#billpayForm [name="${FIELD_NAMES[field]}"]`);
  }

  error(name: BillPayError): Locator {
    return this.page.locator(`[id="validationModel-${name}"]`);
  }

  fromAccountIds(): Promise<string[]> {
    return this.optionValues(this.fromAccount);
  }

  async fillForm({ payee, amount, fromAccountId, verifyAccount = payee.accountNumber }: BillPayment): Promise<void> {
    const values: Record<BillPayField, string> = { ...payee, verifyAccount, amount };
    for (const field of Object.keys(FIELD_NAMES) as BillPayField[]) {
      await this.input(field).fill(values[field]);
    }
    if (fromAccountId !== undefined) {
      await this.fromAccount.selectOption(String(fromAccountId));
    }
  }

  async send(): Promise<void> {
    await this.sendButton.click();
  }

  async pay(payment: BillPayment): Promise<void> {
    await this.fillForm(payment);
    await this.send();
  }

  /** Pays and waits for the server's answer. Only for input that passes the form's own validation. */
  async payAndWait(payment: BillPayment): Promise<void> {
    await this.fillForm(payment);
    const response = this.page.waitForResponse((r) => r.url().includes('/bank/billpay?'));
    await this.send();
    await response;
  }
}
