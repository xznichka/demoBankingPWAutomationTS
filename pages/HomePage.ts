import { BasePage } from './BasePage';

/** index.htm. Logging in happens through the left menu, which every page has. */
export class HomePage extends BasePage {
  protected readonly path = 'index.htm';
}
