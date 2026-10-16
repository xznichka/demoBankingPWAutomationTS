import { test, expect } from '@fixtures';
import type { RegisterField } from '@pages';

const REQUIRED_FIELD_MESSAGES: Array<[field: RegisterField, message: string]> = [
  ['firstName', 'First name is required.'],
  ['lastName', 'Last name is required.'],
  ['street', 'Address is required.'],
  ['city', 'City is required.'],
  ['state', 'State is required.'],
  ['zipCode', 'Zip Code is required.'],
  ['ssn', 'Social Security Number is required.'],
  ['username', 'Username is required.'],
  ['password', 'Password is required.'],
  ['confirmPassword', 'Password confirmation is required.'],
];

test.describe('Registration', { tag: '@regression' }, () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.open();
  });

  test('REG-01 register with all valid fields', { tag: '@smoke' }, async ({ registerPage, user }) => {
    await registerPage.register(user);

    await expect(registerPage.title).toHaveText(`Welcome ${user.username}`);
    await expect(registerPage.successMessage).toHaveText(
      'Your account was created successfully. You are now logged in.',
    );
    await expect(registerPage.leftMenu.accountServicesHeading).toBeVisible();
    await expect(registerPage.leftMenu.greeting).toHaveText(`Welcome ${user.firstName} ${user.lastName}`);
  });

  test('REG-02 empty form shows a required message for every required field', async ({ registerPage }) => {
    await registerPage.submit();

    for (const [field, message] of REQUIRED_FIELD_MESSAGES) {
      await expect(registerPage.fieldError(field), field).toHaveText(message);
    }
    await expect(registerPage.fieldErrors).toHaveCount(REQUIRED_FIELD_MESSAGES.length);
    await expect(registerPage.leftMenu.loginForm).toBeVisible();
  });

  test('REG-03 mismatched password confirmation is rejected', async ({ registerPage, user }) => {
    await registerPage.register(user, `${user.password}_different`);

    await expect(registerPage.fieldError('confirmPassword')).toHaveText('Passwords did not match.');
    await expect(registerPage.fieldErrors).toHaveCount(1);
    await expect(registerPage.leftMenu.loginForm).toBeVisible();
  });

  test('REG-04 username that already exists is rejected', async ({ registerPage, registeredUser, user }) => {
    await registerPage.register({ ...user, username: registeredUser.username });

    await expect(registerPage.fieldError('username')).toHaveText('This username already exists.');
    await expect(registerPage.fieldErrors).toHaveCount(1);
    await expect(registerPage.leftMenu.loginForm).toBeVisible();
  });

  test('REG-05 phone number is optional', async ({ registerPage, user }) => {
    await registerPage.register({ ...user, phoneNumber: '' });

    await expect(registerPage.title).toHaveText(`Welcome ${user.username}`);
    await expect(registerPage.leftMenu.accountServicesHeading).toBeVisible();
  });

  test.describe('REG-06 each required field missing on its own', () => {
    for (const [field, message] of REQUIRED_FIELD_MESSAGES) {
      test(`REG-06 missing ${field} shows only its own error`, async ({ registerPage, user }) => {
        await registerPage.fillForm(user);
        await registerPage.input(field).clear();
        await registerPage.submit();

        await expect(registerPage.fieldError(field)).toHaveText(message);
        await expect(registerPage.fieldErrors).toHaveCount(1);
        await expect(registerPage.leftMenu.loginForm).toBeVisible();
      });
    }
  });

  test('REG-07 new user starts with exactly one funded account', async ({ registerPage, overviewPage, user }) => {
    await registerPage.register(user);
    await expect(registerPage.leftMenu.accountServicesHeading).toBeVisible();

    await overviewPage.open();
    const accounts = await overviewPage.getAccounts();

    expect(accounts).toHaveLength(1);
    expect(accounts[0].balance).toBeGreaterThan(0);
  });
});
