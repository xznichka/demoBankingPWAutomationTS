import { Locator } from '@playwright/test';
import { UserData } from '../utils/testData';
import { BasePage } from './BasePage';

/** Form fields keyed by their `UserData` property, plus the confirmation field. */
export type RegisterField = keyof UserData | 'confirmPassword';

/** Field name → the input's `id` on register.htm. Error spans use the same id plus `.errors`. */
const FIELD_IDS: Record<RegisterField, string> = {
  firstName: 'customer.firstName',
  lastName: 'customer.lastName',
  street: 'customer.address.street',
  city: 'customer.address.city',
  state: 'customer.address.state',
  zipCode: 'customer.address.zipCode',
  phoneNumber: 'customer.phoneNumber',
  ssn: 'customer.ssn',
  username: 'customer.username',
  password: 'customer.password',
  confirmPassword: 'repeatedPassword',
};

export class RegisterPage extends BasePage {
  protected readonly path = 'register.htm';

  readonly registerButton: Locator;
  readonly successMessage: Locator;
  /** Every validation message currently shown on the form. */
  readonly fieldErrors: Locator;

  constructor(...args: ConstructorParameters<typeof BasePage>) {
    super(...args);
    this.registerButton = this.page.getByRole('button', { name: 'Register' });
    this.successMessage = this.page.locator('#rightPanel p').first();
    this.fieldErrors = this.page.locator('#customerForm span.error');
  }

  input(field: RegisterField): Locator {
    return this.page.locator(`[id="${FIELD_IDS[field]}"]`);
  }

  fieldError(field: RegisterField): Locator {
    return this.page.locator(`[id="${FIELD_IDS[field]}.errors"]`);
  }

  /** Fills every field from `user`; `confirmPassword` defaults to the user's password. */
  async fillForm(user: UserData, confirmPassword: string = user.password): Promise<void> {
    const values: Record<RegisterField, string> = { ...user, confirmPassword };
    for (const field of Object.keys(FIELD_IDS) as RegisterField[]) {
      await this.input(field).fill(values[field]);
    }
  }

  async submit(): Promise<void> {
    await this.registerButton.click();
  }

  async register(user: UserData, confirmPassword?: string): Promise<void> {
    await this.fillForm(user, confirmPassword);
    await this.submit();
  }
}
