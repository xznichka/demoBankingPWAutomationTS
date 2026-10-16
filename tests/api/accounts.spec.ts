import { test, expect } from '@fixtures';
import { toCents } from '@utils/money';

test.describe('API: accounts', { tag: ['@api', '@regression'] }, () => {
  test("API-03 list the customer's accounts", async ({ api, registeredUser }) => {
    const accounts = await api.getAccounts(registeredUser.customerId);

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      id: registeredUser.firstAccountId,
      customerId: registeredUser.customerId,
      type: 'CHECKING',
    });
    expect(accounts[0].balance).toBeGreaterThan(0);
  });

  test('API-03 list includes newly created accounts', async ({ api, registeredUser }) => {
    const savings = await api.createAccount(registeredUser.customerId, 'SAVINGS', registeredUser.firstAccountId);

    const ids = (await api.getAccounts(registeredUser.customerId)).map((a) => a.id);

    expect(ids.sort()).toEqual([registeredUser.firstAccountId, savings.id].sort());
  });

  test('API-04 get one account', async ({ api, registeredUser }) => {
    const [listed] = await api.getAccounts(registeredUser.customerId);

    expect(await api.getAccount(registeredUser.firstAccountId)).toEqual(listed);
  });

  for (const type of ['CHECKING', 'SAVINGS'] as const) {
    test(`API-05 create a ${type} account funded with $100`, async ({ api, registeredUser }) => {
      const source = await api.getAccount(registeredUser.firstAccountId);

      const created = await api.createAccount(registeredUser.customerId, type, source.id);

      expect(created).toMatchObject({ customerId: registeredUser.customerId, type });
      expect(created.id).not.toBe(source.id);
      // The create response is a snapshot from before the deposit (balance 0), so read the account back.
      await expect.poll(async () => (await api.getAccount(created.id)).balance).toBe(100);
      await expect
        .poll(async () => toCents((await api.getAccount(source.id)).balance))
        .toBe(toCents(source.balance) - toCents(100));
    });
  }
});
