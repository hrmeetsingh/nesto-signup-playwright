export type Locale = 'en-CA' | 'fr-CA';

export const SIGNUP_PATH: Record<Locale, string> = {
  'en-CA': '/signup',
  'fr-CA': '/fr/signup',
};

export const LANGUAGE: Record<Locale, 'en' | 'fr'> = {
  'en-CA': 'en',
  'fr-CA': 'fr',
};

export const LABELS = {
  'en-CA': {
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    phoneCountry: 'Phone number country',
    province: 'Province of purchase',
    email: 'Email',
    password: 'Password',
    passwordConfirmation: 'Confirm password',
    submit: 'Create your account',
  },
  'fr-CA': {
    firstName: 'Prénom',
    lastName: 'Nom',
    phone: 'Téléphone',
    phoneCountry: 'Phone number country', // not translated in the app
    province: "Province de l'achat",
    email: 'Courriel',
    password: 'Mot de passe',
    passwordConfirmation: 'Confirmation du mot de passe',
    submit: 'Créez votre compte',
  },
} as const;

export const MESSAGES = {
  'en-CA': {
    required: 'The field is required',
    invalidName: 'Invalid name',
    nameTooLong: 'Too many characters',
    invalidPhone: 'Invalid value',
    invalidEmail: 'Invalid email',
    passwordTooShort: 'Minimum of 12 letters required',
    passwordTooLong: 'Maximum of 32 letters required',
    passwordComplexity:
      'Password must contain at least one uppercase letter, one lowercase letter and one number',
    passwordMismatch: 'Passwords do not match',
    serverError: 'Something went wrong',
  },
  'fr-CA': {
    required: 'Ce champ est obligatoire.',
    invalidName: 'Nom invalide',
    nameTooLong: 'Trop de caractères',
    invalidPhone: 'Valeur invalide.',
    invalidEmail: 'Courriel invalide',
    passwordTooShort: 'Minimum de 12 lettres requises',
    passwordTooLong: 'Maximum de 32 lettres requises',
    passwordComplexity:
      'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule et un chiffre',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
    serverError: "Quelque chose n'a pas fonctionné",
  },
} as const;

export type RuleKey = keyof (typeof MESSAGES)['en-CA'];

// The error each field shows when the form is submitted empty.
export const EMPTY_FORM_ERRORS = {
  firstName: 'required',
  lastName: 'required',
  phone: 'invalidPhone',
  email: 'invalidEmail',
  password: 'passwordTooShort',
} as const satisfies Record<string, RuleKey>;
