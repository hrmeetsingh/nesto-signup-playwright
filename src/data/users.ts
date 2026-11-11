import type { RuleKey } from './i18n';

export type SignupField =
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'password'
  | 'passwordConfirmation';

export type SignupUser = Record<SignupField, string> & {
  province: string;
  consent: boolean;
};

export type InvalidCase = {
  field: SignupField;
  name: string;
  value: string;
  rule: RuleKey;
};

let counter = 0;

/** A new email on every call: the API rejects duplicates. */
export function uniqueEmail(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  const random = Math.random().toString(36).slice(2, 8);
  counter += 1;
  return `assignment+${Date.now()}-${worker}-${counter}-${random}@harmeet.test`;
}

const DEFAULTS = {
  firstName: 'Test',
  lastName: 'User',
  phone: '5145551234',
  province: 'QC',
  password: 'ValidPass123',
  consent: true,
};

/** A valid user with a unique email. Confirm password follows password unless overridden. */
export function validUser(overrides: Partial<SignupUser> = {}): SignupUser {
  const password = overrides.password ?? DEFAULTS.password;
  return {
    ...DEFAULTS,
    email: uniqueEmail(),
    passwordConfirmation: password,
    ...overrides,
    password,
  };
}

/** Same values with a fixed email. Visual tests only, never submitted. */
export function fixedUser(): SignupUser {
  return validUser({ email: 'assignment+visual@harmeet.test' });
}

/** Valid edge values. Each one is a real signup. */
export const BOUNDARY: { name: string; user: Partial<SignupUser> }[] = [
  { name: 'password of exactly 12 characters', user: { password: 'Abcdefghij12' } },
  { name: 'password of exactly 32 characters', user: { password: 'Abcdefghij1234567890Abcdefghij12' } },
  { name: 'first name of 63 characters', user: { firstName: 'A'.repeat(63) } },
  { name: 'accented name', user: { firstName: 'Émilie' } },
  { name: 'hyphenated name', user: { firstName: 'Jean-Luc' } },
  { name: 'apostrophe name', user: { lastName: "O'Brien" } },
];

const nameCases = (field: 'firstName' | 'lastName'): InvalidCase[] => [
  { field, name: 'empty', value: '', rule: 'required' },
  { field, name: 'whitespaceOnly', value: '   ', rule: 'required' },
  { field, name: 'tooLong', value: 'A'.repeat(64), rule: 'nameTooLong' },
  { field, name: 'withDigits', value: 'Test3', rule: 'invalidName' },
  { field, name: 'specialChars', value: 'Test!', rule: 'invalidName' },
];

/** Each value breaks exactly one rule. */
export const INVALID_CASES: InvalidCase[] = [
  ...nameCases('firstName'),
  ...nameCases('lastName'),

  { field: 'phone', name: 'empty', value: '', rule: 'invalidPhone' },
  { field: 'phone', name: 'tooShort', value: '514555', rule: 'invalidPhone' },
  { field: 'phone', name: 'letters', value: 'abcdefghij', rule: 'invalidPhone' },
  { field: 'phone', name: 'invalidAreaCode', value: '1115551234', rule: 'invalidPhone' },

  { field: 'email', name: 'empty', value: '', rule: 'invalidEmail' },
  { field: 'email', name: 'missingAt', value: 'assignment.harmeet.test', rule: 'invalidEmail' },
  { field: 'email', name: 'missingDomain', value: 'assignment@', rule: 'invalidEmail' },
  { field: 'email', name: 'missingTld', value: 'assignment@harmeet', rule: 'invalidEmail' },
  { field: 'email', name: 'containsSpace', value: 'assign ment@harmeet.test', rule: 'invalidEmail' },
  { field: 'email', name: 'doubleAt', value: 'assignment@@harmeet.test', rule: 'invalidEmail' },

  { field: 'password', name: 'empty', value: '', rule: 'passwordTooShort' },
  { field: 'password', name: 'tooShort', value: 'ValidPass12', rule: 'passwordTooShort' },
  { field: 'password', name: 'tooLong', value: 'ValidPass123ValidPass123ValidPass', rule: 'passwordTooLong' },
  { field: 'password', name: 'noDigit', value: 'ValidPassword', rule: 'passwordComplexity' },
  { field: 'password', name: 'noUppercase', value: 'validpass123', rule: 'passwordComplexity' },
  { field: 'password', name: 'noLowercase', value: 'VALIDPASS123', rule: 'passwordComplexity' },

  { field: 'passwordConfirmation', name: 'empty', value: '', rule: 'passwordMismatch' },
  { field: 'passwordConfirmation', name: 'mismatch', value: 'ValidPass124', rule: 'passwordMismatch' },
];

/** A valid user with only the case's field replaced. */
export function invalidUser(c: InvalidCase): SignupUser {
  return validUser({ [c.field]: c.value });
}

/** The phone in the format the app submits. */
export function toE164(phone: string): string {
  return `+1${phone.replace(/\D/g, '')}`;
}
