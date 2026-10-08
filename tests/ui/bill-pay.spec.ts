import { test, expect } from '@fixtures';
import type { BillPayError } from '@pages';
import { toCents } from '@utils/money';
import { createPayee } from '@utils/testData';

const EMPTY_FORM_ERRORS: Array<[error: BillPayError, message: string]> = [
  ['name', 'Payee name is required.'],
  ['address', 'Address is required.'],
  ['city', 'City is required.'],
  ['state', 'State is required.'],
  ['zipCode', 'Zip Code is required.'],
  ['phoneNumber', 'Phone number is required.'],
  ['account-empty', 'Account number is required.'],
  ['verifyAccount-empty', 'Account number is required.'],
  ['amount-empty', 'The amount cannot be empty.'],
];

test.describe('Bill Pay', { tag: '@regression' }, () => {
  // Requesting `loggedInPage` logs the browser in as `registeredUser` first.
  test.beforeEach(async ({ loggedInPage: _loggedIn, billPayPage }) => {
    await billPayPage.open();
  });

  test('BILL-01 pay a bill with valid payee details', { tag: '@smoke' }, async ({ billPayPage, registeredUser }) => {
    const payee = createPayee();

    await billPayPage.pay({ payee, amount: '25.40', fromAccountId: registeredUser.firstAccountId });

    await expect(billPayPage.resultTitle).toHaveText('Bill Payment Complete');
    await expect(billPayPage.payeeNameResult).toHaveText(payee.name);
    await expect(billPayPage.amountResult).toHaveText('$25.40');
    await expect(billPayPage.fromAccountResult).toHaveText(String(registeredUser.firstAccountId));
  });

  test('BILL-02 payment debits the account and shows in activity', async ({
    billPayPage,
    activityPage,
    api,
    registeredUser,
  }) => {
    const payee = createPayee();
    const before = await api.getAccount(registeredUser.firstAccountId);

    await billPayPage.pay({ payee, amount: '33.33', fromAccountId: before.id });
    await expect(billPayPage.resultTitle).toHaveText('Bill Payment Complete');

    // The balance can lag a moment behind the confirmation page, so poll instead of reading once.
    await expect.poll(async () => toCents((await api.getAccount(before.id)).balance)).toBe(toCents(before.balance) - 3333);
    await activityPage.openFor(before.id);
    expect(await activityPage.getTransactions()).toContainEqual(
      expect.objectContaining({ description: `Bill Payment to ${payee.name}`, debit: 33.33, credit: null }),
    );
  });

  test('BILL-03 empty form shows every required message', async ({ billPayPage }) => {
    await billPayPage.send();

    for (const [error, message] of EMPTY_FORM_ERRORS) {
      await expect(billPayPage.error(error), error).toHaveText(message);
    }
    await expect(billPayPage.visibleErrors).toHaveCount(EMPTY_FORM_ERRORS.length);
    await expect(billPayPage.resultTitle).toBeHidden();
  });

  test('BILL-04 account numbers that differ are rejected', async ({ billPayPage }) => {
    const payee = createPayee();

    await billPayPage.pay({ payee, amount: '10', verifyAccount: `${payee.accountNumber}9` });

    await expect(billPayPage.error('verifyAccount-mismatch')).toHaveText('The account numbers do not match.');
    await expect(billPayPage.visibleErrors).toHaveCount(1);
    await expect(billPayPage.resultTitle).toBeHidden();
  });

  test('BILL-05 non-numeric amount is rejected', async ({ billPayPage }) => {
    await billPayPage.pay({ payee: createPayee(), amount: 'ten' });

    await expect(billPayPage.error('amount-invalid')).toHaveText('Please enter a valid amount.');
    await expect(billPayPage.visibleErrors).toHaveCount(1);
    await expect(billPayPage.resultTitle).toBeHidden();
  });

  test('BILL-06 non-numeric account number is rejected', async ({ billPayPage }) => {
    await billPayPage.pay({ payee: createPayee({ accountNumber: 'abc' }), amount: '10' });

    await expect(billPayPage.error('account-invalid')).toHaveText('Please enter a valid number.');
    await expect(billPayPage.error('verifyAccount-invalid')).toHaveText('Please enter a valid number.');
    await expect(billPayPage.resultTitle).toBeHidden();
  });

  test(
    'BILL-07 amount larger than the balance is rejected',
    { tag: '@known-issue', annotation: { type: 'issue', description: 'KI-10' } },
    async ({ billPayPage, api, registeredUser }) => {
      test.fail(true, 'KI-10: bill payments far above the balance are accepted');
      const before = await api.getAccount(registeredUser.firstAccountId);

      await billPayPage.payAndWait({ payee: createPayee(), amount: '999999', fromAccountId: before.id });

      await expect(billPayPage.resultTitle).toBeHidden();
      expect((await api.getAccount(before.id)).balance).toBe(before.balance);
    },
  );
});
