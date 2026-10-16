import { test, expect } from '@fixtures';
import type { LookupField } from '@pages';

const REQUIRED_FIELD_MESSAGES: Array<[field: LookupField, message: string]> = [
  ['firstName', 'First name is required.'],
  ['lastName', 'Last name is required.'],
  ['street', 'Address is required.'],
  ['city', 'City is required.'],
  ['state', 'State is required.'],
  ['zipCode', 'Zip Code is required.'],
  ['ssn', 'Social Security Number is required.'],
];

test.describe('Forgot Login Info', { tag: '@regression' }, () => {
  test.beforeEach(async ({ lookupPage }) => {
    await lookupPage.open();
  });

  test('LOOK-01 registered user gets their username and password', async ({ lookupPage, registeredUser }) => {
    await lookupPage.lookUp(registeredUser);

    expect(await lookupPage.foundCredentials()).toEqual({
      username: registeredUser.username,
      password: registeredUser.password,
    });
  });

  test('LOOK-02 empty form shows a required message for every field', async ({ lookupPage }) => {
    await lookupPage.submit();

    for (const [field, message] of REQUIRED_FIELD_MESSAGES) {
      await expect(lookupPage.fieldError(field), field).toHaveText(message);
    }
    await expect(lookupPage.fieldErrors).toHaveCount(REQUIRED_FIELD_MESSAGES.length);
  });

  test('LOOK-03 details that match no customer', async ({ lookupPage, user }) => {
    await lookupPage.lookUp(user);

    await expect(lookupPage.errorMessage).toHaveText('The customer information provided could not be found.');
  });
});
