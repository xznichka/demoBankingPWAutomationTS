import { test, expect } from '@fixtures';
import { formatDate, monthName } from '@utils/dates';
import { toCents } from '@utils/money';

test.describe('Accounts Overview and Activity', { tag: '@regression' }, () => {
  // Requesting `loggedInPage` logs the browser in as `registeredUser` before each test.
  test.beforeEach(async ({ loggedInPage: _loggedIn }) => {});

  test('ACC-01 overview lists every account plus a Total row', { tag: '@smoke' }, async ({
    api,
    registeredUser,
    overviewPage,
  }) => {
    const savings = await api.createAccount(registeredUser.customerId, 'SAVINGS', registeredUser.firstAccountId);

    await overviewPage.open();
    const accounts = await overviewPage.getAccounts();

    expect(accounts.map((a) => a.accountId).sort()).toEqual(
      [String(registeredUser.firstAccountId), String(savings.id)].sort(),
    );
    for (const account of accounts) {
      expect(account.balance).toBeGreaterThanOrEqual(0);
      expect(account.available).toBeGreaterThanOrEqual(0);
    }
    await expect(overviewPage.totalRow).toBeVisible();
  });

  test('ACC-02 total equals the sum of all balances', async ({ api, registeredUser, overviewPage }) => {
    const savings = await api.createAccount(registeredUser.customerId, 'SAVINGS', registeredUser.firstAccountId);
    await api.transfer(registeredUser.firstAccountId, savings.id, 25.75);

    await overviewPage.open();
    const accounts = await overviewPage.getAccounts();
    const sum = accounts.reduce((total, a) => total + toCents(a.balance), 0);

    expect(toCents(await overviewPage.getTotal())).toBe(sum);
  });

  test('ACC-03 account number opens matching Account Details', async ({
    registeredUser,
    overviewPage,
    activityPage,
  }) => {
    await overviewPage.open();
    const [account] = await overviewPage.getAccounts();
    await overviewPage.openAccountDetails(registeredUser.firstAccountId);

    expect(await activityPage.getDetails()).toEqual({
      accountId: account.accountId,
      accountType: 'CHECKING',
      balance: account.balance,
      available: account.available,
    });
  });

  test('ACC-04 brand-new account has no transactions', async ({ registeredUser, activityPage }) => {
    await activityPage.openFor(registeredUser.firstAccountId);

    await expect(activityPage.noTransactions).toBeVisible();
    await expect(activityPage.transactionRows).toHaveCount(0);
  });

  test('ACC-05 transfer is listed in activity', async ({ api, registeredUser, activityPage }) => {
    const savings = await api.createAccount(registeredUser.customerId, 'SAVINGS', registeredUser.firstAccountId);
    await api.transfer(registeredUser.firstAccountId, savings.id, 42.5);

    await activityPage.openFor(registeredUser.firstAccountId);

    expect(await activityPage.getTransactions()).toContainEqual({
      date: formatDate(),
      description: 'Funds Transfer Sent',
      debit: 42.5,
      credit: null,
    });
  });

  test.describe('filters', () => {
    test.beforeEach(async ({ api, registeredUser }) => {
      // One debit and one credit on the first account.
      const savings = await api.createAccount(registeredUser.customerId, 'SAVINGS', registeredUser.firstAccountId);
      await api.transfer(registeredUser.firstAccountId, savings.id, 30);
      await api.transfer(savings.id, registeredUser.firstAccountId, 10);
    });

    for (const type of ['Credit', 'Debit'] as const) {
      test(`ACC-06 filter by type ${type}`, async ({ registeredUser, activityPage }) => {
        await activityPage.openFor(registeredUser.firstAccountId);
        await activityPage.filter('All', type);

        const rows = await activityPage.getTransactions();
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          if (type === 'Credit') {
            expect(row.credit, row.description).not.toBeNull();
            expect(row.debit, row.description).toBeNull();
          } else {
            expect(row.debit, row.description).not.toBeNull();
            expect(row.credit, row.description).toBeNull();
          }
        }
      });
    }

    test('ACC-07 filter by month', async ({ registeredUser, activityPage }) => {
      await activityPage.openFor(registeredUser.firstAccountId);

      await activityPage.filter(monthName(), 'All');
      await expect(activityPage.transactionRows).toHaveCount(3); // $100 for the new account, $30 out, $10 in

      await activityPage.filter(monthName(new Date(), 6), 'All');
      await expect(activityPage.noTransactions).toBeVisible();
      await expect(activityPage.transactionRows).toHaveCount(0);
    });
  });

  test('ACC-08 transaction opens its Transaction Details', async ({
    api,
    registeredUser,
    activityPage,
    transactionPage,
  }) => {
    const savings = await api.createAccount(registeredUser.customerId, 'SAVINGS', registeredUser.firstAccountId);
    await api.transfer(registeredUser.firstAccountId, savings.id, 17.25);
    const [received] = await api.getTransactions(savings.id).then((list) => list.filter((t) => t.amount === 17.25));

    await activityPage.openFor(savings.id);
    await activityPage.transactionLink(received.id).click();

    await expect(transactionPage.title).toHaveText('Transaction Details');
    await expect(transactionPage.value('Transaction ID')).toHaveText(String(received.id));
    await expect(transactionPage.value('Date')).toHaveText(formatDate());
    await expect(transactionPage.value('Description')).toHaveText('Funds Transfer Received');
    await expect(transactionPage.value('Type')).toHaveText('Credit');
    await expect(transactionPage.value('Amount')).toHaveText('$17.25');
  });
});
