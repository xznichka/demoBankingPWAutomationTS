import { test as base, expect, APIRequestContext } from '@playwright/test';
import { OverviewPage, RegisterPage } from '../pages';
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
  registerPage: RegisterPage;
  overviewPage: OverviewPage;
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
  expect(await form.text(), `registration of ${user.username} failed`).toContain(
    'Your account was created successfully',
  );

  const headers = { Accept: 'application/json' };
  const login = await request.get(
    `services/bank/login/${encodeURIComponent(user.username)}/${encodeURIComponent(user.password)}`,
    { headers },
  );
  expect(login, 'REST login after registration').toBeOK();
  const customerId: number = (await login.json()).id;

  const accounts = await request.get(`services/bank/customers/${customerId}/accounts`, { headers });
  expect(accounts, 'REST accounts lookup after registration').toBeOK();
  const [firstAccount] = await accounts.json();

  return { ...user, customerId, firstAccountId: firstAccount.id };
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

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  overviewPage: async ({ page }, use) => {
    await use(new OverviewPage(page));
  },
});

export { expect };
