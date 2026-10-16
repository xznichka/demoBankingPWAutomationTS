import { test, expect } from '@fixtures';

/** An ID far beyond anything the demo database hands out. */
const UNKNOWN_ID = 999_999_999;

const UNKNOWN_RESOURCES: Array<[path: string, message: string]> = [
  [`customers/${UNKNOWN_ID}`, `Could not find customer #${UNKNOWN_ID}`],
  [`accounts/${UNKNOWN_ID}`, `Could not find account #${UNKNOWN_ID}`],
  [`transactions/${UNKNOWN_ID}`, `Could not find transaction #${UNKNOWN_ID}`],
];

test.describe('API: errors', { tag: ['@api', '@regression'] }, () => {
  for (const [path, message] of UNKNOWN_RESOURCES) {
    test(`API-12 unknown ${path.split('/')[0]} returns 400 with a message`, async ({ api }) => {
      const response = await api.getResponse(path);

      expect(response.status()).toBe(400);
      expect(await response.text()).toBe(message);
    });
  }

  test('API-12 non-numeric ID is a client error, not a server error', async ({ api }) => {
    const response = await api.getResponse('customers/abc');

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('API-12 transfer from an unknown account is a client error', async ({ api, registeredUser }) => {
    const response = await api.postResponse('transfer', {
      fromAccountId: UNKNOWN_ID,
      toAccountId: registeredUser.firstAccountId,
      amount: 1,
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    expect(await response.text()).toContain(String(UNKNOWN_ID));
  });
});
