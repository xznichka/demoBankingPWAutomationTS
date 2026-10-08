import { Locator, Page } from '@playwright/test';

/** Left panel: the login form when logged out; a greeting and Account Services links when logged in. */
export class LeftMenu {
  readonly root: Locator;
  readonly loginForm: Locator;
  readonly greeting: Locator;
  readonly accountServicesHeading: Locator;
  readonly logOutLink: Locator;

  constructor(page: Page) {
    this.root = page.locator('#leftPanel');
    this.loginForm = this.root.locator('form[name="login"]');
    this.greeting = this.root.locator('p.smallText');
    this.accountServicesHeading = this.root.getByRole('heading', { name: 'Account Services' });
    this.logOutLink = this.root.getByRole('link', { name: 'Log Out' });
  }

  link(name: string): Locator {
    return this.root.getByRole('link', { name, exact: true });
  }

  async logOut(): Promise<void> {
    await this.logOutLink.click();
  }
}
