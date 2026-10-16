import { Locator } from '@playwright/test';
import { UserData } from '../utils/testData';
import { BasePage } from './BasePage';

export type LookupField = 'firstName' | 'lastName' | 'street' | 'city' | 'state' | 'zipCode' | 'ssn';

/** Field name → the input's `id` on lookup.htm. Error spans use the same id plus `.errors`. */
const FIELD_IDS: Record<LookupField, string> = {
  firstName: 'firstName',
  lastName: 'lastName',
  street: 'address.street',
  city: 'address.city',
  state: 'address.state',
  zipCode: 'address.zipCode',
  ssn: 'ssn',
};

export class LookupPage extends BasePage {
  protected readonly path = 'lookup.htm';

  readonly submitButton: Locator;
  readonly fieldErrors: Locator;
  readonly result: Locator;

  constructor(...args: ConstructorParameters<typeof BasePage>) {
    super(...args);
    this.submitButton = this.page.getByRole('button', { name: 'Find My Login Info' });
    this.fieldErrors = this.page.locator('#rightPanel span.error');
    this.result = this.page.locator('#rightPanel');
  }

  input(field: LookupField): Locator {
    return this.page.locator(`[id="${FIELD_IDS[field]}"]`);
  }

  fieldError(field: LookupField): Locator {
    return this.page.locator(`[id="${FIELD_IDS[field]}.errors"]`);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async lookUp(details: Pick<UserData, LookupField>): Promise<void> {
    for (const field of Object.keys(FIELD_IDS) as LookupField[]) {
      await this.input(field).fill(details[field]);
    }
    await this.submit();
  }

  /** Reads the "Username: … Password: …" lines shown after a successful lookup. */
  async foundCredentials(): Promise<{ username: string; password: string }> {
    const text = await this.result.innerText();
    const username = text.match(/Username:?\s*(\S+)/)?.[1];
    const password = text.match(/Password:?\s*(\S+)/)?.[1];
    if (!username || !password) {
      throw new Error(`No credentials in lookup result:\n${text}`);
    }
    return { username, password };
  }
}
