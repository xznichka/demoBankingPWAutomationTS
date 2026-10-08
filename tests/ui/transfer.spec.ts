import { test, expect } from '@fixtures';
import type { Account } from '@api/types';
import { toCents } from '@utils/money';

test.describe('Transfer Funds', { tag: '@regression' }, () => {
  /** A second account, so there is somewhere to transfer to. */
  let savings: Account;

  test.beforeEach(async ({ loggedInPage: _loggedIn, api, registeredUser, transferPage }) => {
    savings = await api.createAccount(registeredUser.customerId, 'SAVINGS', registeredUser.firstAccountId);
    await transferPage.open();
  });

  test('TRF-01 transfer between own accounts', { tag: '@smoke' }, async ({ transferPage, api, registeredUser }) => {
    const from = await api.getAccount(registeredUser.firstAccountId);
    const to = await api.getAccount(savings.id);

    await transferPage.transfer('50', from.id, to.id);

    await expect(transferPage.resultTitle).toHaveText('Transfer Complete!');
    await expect(transferPage.amountResult).toHaveText('$50.00');
    await expect(transferPage.fromAccountResult).toHaveText(String(from.id));
    await expect(transferPage.toAccountResult).toHaveText(String(to.id));
    // Balances can lag a moment behind the confirmation page, so poll instead of reading once.
    await expect.poll(async () => toCents((await api.getAccount(from.id)).balance)).toBe(toCents(from.balance) - 5000);
    await expect.poll(async () => toCents((await api.getAccount(to.id)).balance)).toBe(toCents(to.balance) + 5000);
  });

  test('TRF-02 both accounts show the transfer in their activity', async ({
    transferPage,
    activityPage,
    registeredUser,
  }) => {
    await transferPage.transfer('20', registeredUser.firstAccountId, savings.id);
    await expect(transferPage.resultTitle).toHaveText('Transfer Complete!');

    await activityPage.openFor(registeredUser.firstAccountId);
    expect(await activityPage.getTransactions()).toContainEqual(
      expect.objectContaining({ description: 'Funds Transfer Sent', debit: 20, credit: null }),
    );

    await activityPage.openFor(savings.id);
    expect(await activityPage.getTransactions()).toContainEqual(
      expect.objectContaining({ description: 'Funds Transfer Received', debit: null, credit: 20 }),
    );
  });

  test('TRF-03 decimal amount is exact to the cent', async ({ transferPage, api, registeredUser }) => {
    const from = await api.getAccount(registeredUser.firstAccountId);
    const to = await api.getAccount(savings.id);

    await transferPage.transfer('10.55', from.id, to.id);

    await expect(transferPage.amountResult).toHaveText('$10.55');
    await expect.poll(async () => toCents((await api.getAccount(from.id)).balance)).toBe(toCents(from.balance) - 1055);
    await expect.poll(async () => toCents((await api.getAccount(to.id)).balance)).toBe(toCents(to.balance) + 1055);
  });

  test(
    'TRF-04 empty amount shows a validation message',
    { tag: '@known-issue', annotation: { type: 'issue', description: 'KI-03' } },
    async ({ transferPage, registeredUser }) => {
      test.fail(true, 'KI-03: an empty amount gives an internal error instead of a validation message');
      await transferPage.transfer('', registeredUser.firstAccountId, savings.id);

      await expect(transferPage.emptyAmountError).toBeVisible();
      await expect(transferPage.internalError).toBeHidden();
    },
  );

  const INVALID_AMOUNTS: Array<[amount: string, issue: string, bug: string]> = [
    ['abc', 'KI-03', 'a non-numeric amount gives an internal error instead of a validation message'],
    ['-10', 'KI-09', 'a negative amount is transferred'],
    ['0', 'KI-09', 'a zero amount is transferred'],
  ];

  for (const [amount, issue, bug] of INVALID_AMOUNTS) {
    test(
      `TRF-05 amount "${amount}" is rejected`,
      { tag: '@known-issue', annotation: { type: 'issue', description: issue } },
      async ({ transferPage, api, registeredUser }) => {
        test.fail(true, `${issue}: ${bug}`);
        const before = await api.getAccount(registeredUser.firstAccountId);

        await transferPage.transfer(amount, registeredUser.firstAccountId, savings.id);

        await expect(transferPage.invalidAmountError).toBeVisible();
        await expect(transferPage.resultTitle).toBeHidden();
        expect((await api.getAccount(before.id)).balance).toBe(before.balance);
      },
    );
  }

  test(
    'TRF-06 amount larger than the balance is rejected',
    { tag: '@known-issue', annotation: { type: 'issue', description: 'KI-04' } },
    async ({ transferPage, api, registeredUser }) => {
      test.fail(true, 'KI-04: overdraft transfers are reported as complete');
      const before = await api.getAccount(registeredUser.firstAccountId);

      await transferPage.transfer('999999', before.id, savings.id);

      await expect(transferPage.resultTitle).toBeHidden();
      expect((await api.getAccount(before.id)).balance).toBe(before.balance);
    },
  );

  test(
    'TRF-07 transfer to the same account is blocked',
    { tag: '@known-issue', annotation: { type: 'issue', description: 'KI-05' } },
    async ({ transferPage, registeredUser }) => {
      test.fail(true, 'KI-05: From = To is allowed');
      await transferPage.transfer('5', registeredUser.firstAccountId, registeredUser.firstAccountId);

      await expect(transferPage.resultTitle).toBeHidden();
    },
  );
});
