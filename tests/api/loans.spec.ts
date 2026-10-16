import { test, expect } from '@fixtures';
import { toCents } from '@utils/money';

test.describe('API: loans', { tag: ['@api', '@regression'] }, () => {
  test('API-10 affordable loan is approved', async ({ api, registeredUser }) => {
    const source = await api.getAccount(registeredUser.firstAccountId);
    const startedAt = Date.now();

    const loan = await api.requestLoan(registeredUser.customerId, 200, 20, source.id);

    expect(loan.approved).toBe(true);
    expect(loan.accountId).not.toBeNull();
    // The provider comes from a global admin setting, so only check it is present.
    expect(loan.loanProviderName).not.toBe('');
    expect(loan.responseDate).toBeGreaterThan(startedAt - 60_000);

    expect(await api.getAccount(loan.accountId!)).toMatchObject({
      customerId: registeredUser.customerId,
      type: 'LOAN',
      balance: 200,
    });
    await expect
      .poll(async () => toCents((await api.getAccount(source.id)).balance))
      .toBe(toCents(source.balance) - toCents(20));
  });

  test('API-10 loan beyond the available funds is denied', async ({ api, registeredUser }) => {
    const source = await api.getAccount(registeredUser.firstAccountId);

    const loan = await api.requestLoan(registeredUser.customerId, 1_000_000, 10, source.id);

    expect(loan).toMatchObject({ approved: false, accountId: null, message: 'error.insufficient.funds' });
    expect((await api.getAccounts(registeredUser.customerId)).map((a) => a.id)).toEqual([source.id]);
    expect((await api.getAccount(source.id)).balance).toBe(source.balance);
  });
});
