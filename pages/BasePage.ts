import { Locator, Page } from '@playwright/test';
import { LeftMenu } from '../components/LeftMenu';

/** Parts shared by every ParaBank page. */
export abstract class BasePage {
  readonly leftMenu: LeftMenu;
  readonly title: Locator;
  readonly errorMessage: Locator;

  /** Path relative to baseURL, e.g. `register.htm`. */
  protected abstract readonly path: string;

  constructor(readonly page: Page) {
    this.leftMenu = new LeftMenu(page);
    this.title = page.locator('#rightPanel h1.title');
    this.errorMessage = page.locator('#rightPanel p.error');
  }

  async open(): Promise<void> {
    await this.page.goto(this.path);
  }
}
