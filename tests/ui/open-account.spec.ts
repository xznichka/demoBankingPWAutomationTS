import { test, expect } from '@fixtures';
import { toCents } from '@utils/money';

test.describe('Open New Account', { tag: '@regression' }, () => {
  // Requesting `loggedInPage` logs the browser in as `registeredUser` first.
  test.beforeEach(async ({ loggedInPage: _loggedIn, openAccountPage }) => {
    await openAccountPage.open();
  });

  test('OPEN-01 open a CHECKING account', { tag: '@smoke' }, async ({ openAccountPage, registeredUser, api }) => {
    const newAccountId = await openAccountPage.openAccount('CHECKING', registeredUser.firstAccountId);

    await expect(openAccountPage.resultTitle).toHaveText('Account Opened!');
    expect(newAccountId).toMatch(/^\d+$/);
    expect(newAccountId).not.toBe(String(registeredUser.firstAccountId));
    expect((await api.getAccount(Number(newAccountId))).type).toBe('CHECKING');
  });

  test('OPEN-02 open a SAVINGS account', async ({ openAccountPage, activityPage }) => {
    const newAccountId = await openAccountPage.openAccount('SAVINGS');
    await expect(openAccountPage.resultTitle).toHaveText('Account Opened!');

    await activityPage.openFor(newAccountId);
    const details = await activityPage.getDetails();

    expect(details.accountId).toBe(newAccountId);
    expect(details.accountType).toBe('SAVINGS');
  });

  test('OPEN-03 new account holds $100 taken from the source account', async ({
    openAccountPage,
    overviewPage,
    registeredUser,
  }) => {
    await overviewPage.open();
    const [before] = await overviewPage.getAccounts();

    await openAccountPage.open();
    const newAccountId = await openAccountPage.openAccount('SAVINGS', registeredUser.firstAccountId);

    await overviewPage.open();
    const after = await overviewPage.getAccounts();
    const source = after.find((a) => a.accountId === before.accountId);
    const created = after.find((a) => a.accountId === newAccountId);

    expect(created?.balance).toBe(100);
    expect(toCents(source!.balance)).toBe(toCents(before.balance) - toCents(100));
  });

  test('OPEN-04 new account number links to its Account Details', async ({ openAccountPage, activityPage }) => {
    const newAccountId = await openAccountPage.openAccount('CHECKING');

    await openAccountPage.newAccountLink.click();
    const details = await activityPage.getDetails();

    expect(details).toEqual({ accountId: newAccountId, accountType: 'CHECKING', balance: 100, available: 100 });
  });

  test('OPEN-05 new account appears in Transfer, Bill Pay and Loan account lists', async ({
    openAccountPage,
    transferPage,
    billPayPage,
    requestLoanPage,
  }) => {
    const newAccountId = await openAccountPage.openAccount('SAVINGS');

    await transferPage.open();
    expect(await transferPage.fromAccountIds()).toContain(newAccountId);
    expect(await transferPage.toAccountIds()).toContain(newAccountId);

    await billPayPage.open();
    expect(await billPayPage.fromAccountIds()).toContain(newAccountId);

    await requestLoanPage.open();
    expect(await requestLoanPage.fromAccountIds()).toContain(newAccountId);
  });
});
