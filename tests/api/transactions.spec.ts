import { test, expect } from '@fixtures';
import type { Account, Transaction } from '@api/types';
import { formatUtcDate } from '@utils/dates';
import { toCents } from '@utils/money';
import { createPayee } from '@utils/testData';

test.describe('API: transactions', { tag: ['@api', '@regression'] }, () => {
  /** A second account, so there is somewhere to transfer to. */
  let savings: Account;

  test.beforeEach(async ({ api, registeredUser }) => {
    savings = await api.createAccount(registeredUser.customerId, 'SAVINGS', registeredUser.firstAccountId);
  });

  test('API-06 transfer moves the amount between accounts', { tag: '@smoke' }, async ({ api, registeredUser }) => {
    const from = await api.getAccount(registeredUser.firstAccountId);
    const to = await api.getAccount(savings.id);

    const message = await api.transfer(from.id, to.id, 45.5);

    expect(message).toBe(`Successfully transferred $45.5 from account #${from.id} to account #${to.id}`);
    await expect.poll(async () => toCents((await api.getAccount(from.id)).balance)).toBe(toCents(from.balance) - 4550);
    await expect.poll(async () => toCents((await api.getAccount(to.id)).balance)).toBe(toCents(to.balance) + 4550);
  });

  test('API-07 bill pay debits the account', async ({ api, registeredUser }) => {
    const payee = createPayee();
    const before = await api.getAccount(registeredUser.firstAccountId);

    const result = await api.billPay(before.id, 12.34, payee);

    expect(result).toEqual({ payeeName: payee.name, amount: 12.34, accountId: before.id });
    await expect.poll(async () => toCents((await api.getAccount(before.id)).balance)).toBe(toCents(before.balance) - 1234);
    expect(await api.getTransactions(before.id)).toContainEqual(
      expect.objectContaining({ type: 'Debit', amount: 12.34, description: `Bill Payment to ${payee.name}` }),
    );
  });

  test.describe('lookups', () => {
    /** The debit made on the first account by a transfer in `beforeEach`. */
    let sent: Transaction;

    test.beforeEach(async ({ api, registeredUser }) => {
      await api.transfer(registeredUser.firstAccountId, savings.id, 23.45);
      const transactions = await api.getTransactions(registeredUser.firstAccountId);
      const match = transactions.find((t) => t.amount === 23.45 && t.description === 'Funds Transfer Sent');
      expect(match, 'transfer transaction on the first account').toBeDefined();
      sent = match!;
    });

    test('API-08 list all transactions of an account', async ({ api, registeredUser }) => {
      const transactions = await api.getTransactions(registeredUser.firstAccountId);

      expect(transactions).toContainEqual(sent);
      for (const t of transactions) {
        expect(t.accountId).toBe(registeredUser.firstAccountId);
      }
    });

    test('API-08 find transactions by amount', async ({ api, registeredUser }) => {
      const transactions = await api.getTransactionsByAmount(registeredUser.firstAccountId, 23.45);

      expect(transactions).toEqual([sent]);
    });

    test('API-08 find transactions on a date', async ({ api, registeredUser }) => {
      const transactions = await api.getTransactionsOnDate(registeredUser.firstAccountId, formatUtcDate(sent.date));

      expect(transactions).toContainEqual(sent);
      for (const t of transactions) {
        expect(formatUtcDate(t.date)).toBe(formatUtcDate(sent.date));
      }
    });

    test('API-08 find transactions in a date range', async ({ api, registeredUser }) => {
      const day = 24 * 60 * 60 * 1000;
      const transactions = await api.getTransactionsInRange(
        registeredUser.firstAccountId,
        formatUtcDate(sent.date - day),
        formatUtcDate(sent.date + day),
      );

      expect(transactions).toContainEqual(sent);
    });

    test('API-09 get one transaction', async ({ api }) => {
      expect(await api.getTransaction(sent.id)).toEqual(sent);
    });
  });
});
