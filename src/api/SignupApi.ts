import type { APIRequestContext, APIResponse } from '@playwright/test';
import { LANGUAGE, type Locale } from '../data/rules';
import { toE164, type SignupUser } from '../data/users';

export const ACCOUNTS_API = '/api/accounts';

export class SignupApi {
  constructor(private readonly request: APIRequestContext) {}

  /** The same JSON body the UI sends. */
  toPayload(user: SignupUser, locale: Locale = 'en-CA') {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: toE164(user.phone),
      region: user.province,
      language: LANGUAGE[locale],
      password: user.password,
      leadDistributeConsentAgreement: user.consent,
      partner: 'nesto',
      formName: 'signup',
    };
  }

  createUser(user: SignupUser, locale: Locale = 'en-CA'): Promise<APIResponse> {
    return this.request.post(ACCOUNTS_API, { data: this.toPayload(user, locale) });
  }

  /** Raw POST, for malformed-request tests. */
  post(data: unknown, headers?: Record<string, string>): Promise<APIResponse> {
    return this.request.post(ACCOUNTS_API, { data, headers });
  }
}
