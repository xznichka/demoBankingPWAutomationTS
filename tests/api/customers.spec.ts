import { test, expect } from '@fixtures';
import { createUser } from '@utils/testData';

test.describe('API: customers', { tag: ['@api', '@regression'] }, () => {
  test('API-01 login with valid credentials returns the customer', { tag: '@smoke' }, async ({ api, registeredUser }) => {
    const customer = await api.login(registeredUser.username, registeredUser.password);

    expect(customer).toMatchObject({
      id: registeredUser.customerId,
      firstName: registeredUser.firstName,
      lastName: registeredUser.lastName,
    });
  });

  test('API-01 login with a wrong password is rejected', async ({ api, registeredUser }) => {
    const response = await api.getResponse(`login/${registeredUser.username}/${registeredUser.password}_wrong`);

    expect(response.status()).toBe(400);
    expect(await response.text()).toBe('Invalid username and/or password');
  });

  test('API-02 customer profile matches the registration data', async ({ api, registeredUser }) => {
    const customer = await api.getCustomer(registeredUser.customerId);

    expect(customer).toEqual({
      id: registeredUser.customerId,
      firstName: registeredUser.firstName,
      lastName: registeredUser.lastName,
      address: {
        street: registeredUser.street,
        city: registeredUser.city,
        state: registeredUser.state,
        zipCode: registeredUser.zipCode,
      },
      phoneNumber: registeredUser.phoneNumber,
      ssn: registeredUser.ssn,
    });
  });

  test('API-11 update the profile', async ({ api, registeredUser }) => {
    // Same credentials, new everything else.
    const changes = createUser({ username: registeredUser.username, password: registeredUser.password });

    const message = await api.updateCustomer(registeredUser.customerId, changes);

    expect(message).toBe('Successfully updated customer profile');
    expect(await api.getCustomer(registeredUser.customerId)).toEqual({
      id: registeredUser.customerId,
      firstName: changes.firstName,
      lastName: changes.lastName,
      address: { street: changes.street, city: changes.city, state: changes.state, zipCode: changes.zipCode },
      phoneNumber: changes.phoneNumber,
      ssn: changes.ssn,
    });
    expect((await api.login(registeredUser.username, registeredUser.password)).id).toBe(registeredUser.customerId);
  });
});
