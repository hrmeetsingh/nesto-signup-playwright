import { test, expect } from '../../src/fixtures';
import { validUser } from '../../src/data/users';

test.describe('POST /api/accounts', { tag: '@api' }, () => {
  test('valid user returns 201 without the password', { tag: '@positive' }, async ({ api }) => {
    const user = validUser();
    const response = await api.createUser(user);

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.account).toMatchObject({ email: user.email });
    expect(body.account.id).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('password');
  });

  test('duplicate email returns 400', { tag: '@negative' }, async ({ api }) => {
    const user = validUser();
    expect((await api.createUser(user)).status()).toBe(201);

    const response = await api.createUser(validUser({ email: user.email }));
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({
      error: 'bad format',
      description: 'error creating account',
    });
  });

  /** this is observed behavior captured in a negative test, non US/Canada region codes are rejected */
  test('invalid region returns 422', { tag: '@negative' }, async ({ api }) => {
    const response = await api.createUser(validUser({ province: 'BY' }));
    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({
      error: 'invalid parameters',
      parameters: ['region']
    });
  });

  test('invalid email returns 422', { tag: '@negative' }, async ({ api }) => {
    const response = await api.createUser(validUser({ email: 'assignment.harmeet.test' }));
    expect(response.status()).toBe(422);
    expect(await response.json()).toEqual({ error: 'invalid parameters', parameters: ['email'] });
  });

  test('wrong content type returns 400', { tag: '@negative' }, async ({ api }) => {
    const response = await api.post(JSON.stringify(api.toPayload(validUser())), {
      'Content-Type': 'text/plain',
    });
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({ error: 'bad format', description: 'Content-Type' });
  });
});
