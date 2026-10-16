import { request, type FullConfig } from '@playwright/test';

/**
 * Health check before any test runs (see "Entry criteria" in docs/TEST_PLAN.md).
 * If Cloudflare is blocking us, every test would fail slowly and be retried, so stop the run right away.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0].use.baseURL;
  const context = await request.newContext({ baseURL });
  try {
    const response = await context.get('index.htm', { timeout: 30_000 });
    const body = await response.text();
    const blocked =
      response.status() === 403 ||
      response.status() === 429 ||
      /<title>Just a moment\.\.\.<\/title>|error code: 1015|You are being rate limited/.test(body);
    if (blocked) {
      throw new Error(
        `ParaBank health check: blocked by Cloudflare (HTTP ${response.status()}). ` +
          'The shared site is throttling this machine; retry later.',
      );
    }
    if (!response.ok() || !body.includes('ParaBank')) {
      throw new Error(`ParaBank health check: site is not responding normally (HTTP ${response.status()}).`);
    }
  } finally {
    await context.dispose();
  }
}
