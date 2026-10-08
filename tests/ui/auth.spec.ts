import { test, expect } from '@fixtures';

test.describe('Login / Logout', { tag: '@regression' }, () => {
  test('AUTH-01 log in with valid credentials', { tag: '@smoke' }, async ({ homePage, overviewPage, registeredUser }) => {
    await homePage.open();
    await homePage.leftMenu.logIn(registeredUser.username, registeredUser.password);

    await expect(homePage.page).toHaveURL(/overview\.htm/);
    await expect(overviewPage.title).toHaveText('Accounts Overview');
    await expect(overviewPage.leftMenu.greeting).toHaveText(
      `Welcome ${registeredUser.firstName} ${registeredUser.lastName}`,
    );
  });

  test('AUTH-02 wrong password is rejected', { tag: '@smoke' }, async ({ homePage, registeredUser }) => {
    await homePage.open();
    await homePage.leftMenu.logIn(registeredUser.username, `${registeredUser.password}_wrong`);

    await expect(homePage.errorMessage).toHaveText('The username and password could not be verified.');
    await expect(homePage.leftMenu.accountServicesHeading).toBeHidden();
  });

  test('AUTH-02 unknown user is rejected', async ({ homePage, user }) => {
    await homePage.open();
    await homePage.leftMenu.logIn(user.username, user.password);

    await expect(homePage.errorMessage).toHaveText('The username and password could not be verified.');
    await expect(homePage.leftMenu.accountServicesHeading).toBeHidden();
  });

  test('AUTH-03 empty username and password', async ({ homePage }) => {
    await homePage.open();
    await homePage.leftMenu.logIn('', '');

    await expect(homePage.errorMessage).toHaveText('Please enter a username and password.');
  });

  test('AUTH-04 log out', { tag: '@smoke' }, async ({ loggedInPage, overviewPage }) => {
    await overviewPage.open();
    await overviewPage.leftMenu.logOut();

    await expect(loggedInPage).toHaveURL(/index\.htm/);
    await expect(overviewPage.leftMenu.loginForm).toBeVisible();
    await expect(overviewPage.leftMenu.accountServicesHeading).toBeHidden();
    await expect(overviewPage.leftMenu.logOutLink).toBeHidden();
  });

  test(
    'AUTH-05 protected page is denied when logged out',
    { tag: '@known-issue', annotation: { type: 'issue', description: 'KI-02' } },
    async ({ overviewPage }) => {
      test.fail(true, 'KI-02: overview.htm shows an internal error instead of asking the user to log in');
      await overviewPage.open();

      await expect(overviewPage.accountRows).toHaveCount(0);
      await expect(overviewPage.leftMenu.loginForm).toBeVisible();
      await expect(overviewPage.errorMessage).not.toContainText('An internal error has occurred');
    },
  );

  test('AUTH-06 back button after logout shows no account data', async ({ loggedInPage, overviewPage }) => {
    await overviewPage.open();
    await overviewPage.waitForAccounts();
    await overviewPage.leftMenu.logOut();
    await expect(overviewPage.leftMenu.loginForm).toBeVisible();

    await loggedInPage.goBack();

    await expect(overviewPage.accountRows).toHaveCount(0);
  });
});
