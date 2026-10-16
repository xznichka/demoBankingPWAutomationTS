import { test as base, expect, APIRequestContext, APIResponse, Page } from '@playwright/test';
import { ParaBankApi } from '../api/ParaBankApi';
import {
  ActivityPage,
  BillPayPage,
  HomePage,
  LookupPage,
  OpenAccountPage,
  OverviewPage,
  RegisterPage,
  RequestLoanPage,
  TransactionPage,
  TransferPage,
} from '../pages';
import { createUser, UserData } from '../utils/testData';

export interface RegisteredUser extends UserData {
  customerId: number;
  firstAccountId: number;
}

interface Fixtures {
  /** A new, unique user. Not registered yet. */
  user: UserData;
  /** A user registered behind the scenes. The browser page is NOT logged in as them. */
  registeredUser: RegisteredUser;
  /** The browser page, already logged in as `registeredUser`. */
  loggedInPage: Page;
  /** REST API client for fast data setup. */
  api: ParaBankApi;
  homePage: HomePage;
  registerPage: RegisterPage;
  lookupPage: LookupPage;
  overviewPage: OverviewPage;
  activityPage: ActivityPage;
  transactionPage: TransactionPage;
  openAccountPage: OpenAccountPage;
  transferPage: TransferPage;
  billPayPage: BillPayPage;
  requestLoanPage: RequestLoanPage;
}

/**
 * Fails with a short, clear message when Cloudflare answers instead of ParaBank
 * (rate limit or bot challenge), rather than dumping the whole challenge page.
 */
async function expectParaBankPage(response: APIResponse, step: string, expectedText: string): Promise<void> {
  const body = await response.text();
  const blocked =
    response.status() === 429 || /<title>Just a moment\.\.\.<\/title>|error code: 1015|You are being rate limited/.test(body);
  expect(blocked, `${step}: blocked by Cloudflare (HTTP ${response.status()}); the shared site is throttling test traffic, retry later`).toBe(false);
  expect(body.includes(expectedText), `${step}: expected "${expectedText}" in the response`).toBe(true);
}

/** Submits the registration form over HTTP, then looks up the new customer's IDs through the REST API. */
async function registerViaHttp(request: APIRequestContext, user: UserData): Promise<RegisteredUser> {
  // Opening the form first starts a server session; posting without one returns the error page.
  await request.get('register.htm');
  const form = await request.post('register.htm', {
    form: {
      'customer.firstName': user.firstName,
      'customer.lastName': user.lastName,
      'customer.address.street': user.street,
      'customer.address.city': user.city,
      'customer.address.state': user.state,
      'customer.address.zipCode': user.zipCode,
      'customer.phoneNumber': user.phoneNumber,
      'customer.ssn': user.ssn,
      'customer.username': user.username,
      'customer.password': user.password,
      repeatedPassword: user.password,
    },
  });
  await expectParaBankPage(form, `registration of ${user.username}`, 'Your account was created successfully');

  const api = new ParaBankApi(request);
  const customer = await api.login(user.username, user.password);
  const [firstAccount] = await api.getAccounts(customer.id);

  return { ...user, customerId: customer.id, firstAccountId: firstAccount.id };
}

export const test = base.extend<Fixtures>({
  user: async ({}, use) => {
    await use(createUser());
  },

  registeredUser: async ({ playwright, baseURL }, use) => {
    // A separate request context, so the registration session cookie never reaches the browser page.
    const request = await playwright.request.newContext({ baseURL });
    const registered = await registerViaHttp(request, createUser());
    await request.dispose();
    await use(registered);
  },

  loggedInPage: async ({ page, registeredUser }, use) => {
    // page.request shares cookies with the browser, so logging in over HTTP logs the page in too.
    await page.request.get('index.htm');
    const response = await page.request.post('login.htm', {
      form: { username: registeredUser.username, password: registeredUser.password },
    });
    await expectParaBankPage(response, `login of ${registeredUser.username}`, 'Accounts Overview');
    await use(page);
  },

  api: async ({ request }, use) => {
    await use(new ParaBankApi(request));
  },

  homePage: async ({ page }, use) => use(new HomePage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  lookupPage: async ({ page }, use) => use(new LookupPage(page)),
  overviewPage: async ({ page }, use) => use(new OverviewPage(page)),
  activityPage: async ({ page }, use) => use(new ActivityPage(page)),
  transactionPage: async ({ page }, use) => use(new TransactionPage(page)),
  openAccountPage: async ({ page }, use) => use(new OpenAccountPage(page)),
  transferPage: async ({ page }, use) => use(new TransferPage(page)),
  billPayPage: async ({ page }, use) => use(new BillPayPage(page)),
  requestLoanPage: async ({ page }, use) => use(new RequestLoanPage(page)),
});

export { expect };
