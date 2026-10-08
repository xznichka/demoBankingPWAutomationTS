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
    // Several pages keep hidden result/error panels with their own titles; only the visible one counts.
    this.title = page.locator('#rightPanel h1.title:visible');
    this.errorMessage = page.locator('#rightPanel p.error');
  }

  async open(): Promise<void> {
    await this.page.goto(this.path);
  }

  /** The option values of a `<select>`, e.g. the account numbers in an account list. */
  protected async optionValues(select: Locator): Promise<string[]> {
    return select.locator('option').evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value));
  }
}
