export interface UserData {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ssn: string;
  username: string;
  password: string;
}

export interface PayeeData {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  accountNumber: string;
}

const FIRST_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Jamie'];
const LAST_NAMES = ['Smith', 'Garcia', 'Nguyen', 'Kowalski', 'Okafor', 'Silva', 'Tanaka', 'Novak'];
const CITIES: Array<[city: string, state: string, zip: string]> = [
  ['Austin', 'TX', '73301'],
  ['Denver', 'CO', '80201'],
  ['Portland', 'OR', '97201'],
  ['Boston', 'MA', '02108'],
];

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const digits = (length: number): string =>
  Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
const randomSuffix = (): string => Math.random().toString(36).slice(2, 6);

/**
 * A unique username such as `qa_mgh2k3x9_a7f2` (base-36 timestamp + random suffix).
 * ParaBank rejects usernames over 20 characters with a misleading "already exists" error (KI-08).
 */
export function uniqueUsername(): string {
  return `qa_${Date.now().toString(36)}_${randomSuffix()}`;
}

/** A new, unregistered user with a unique username and SSN. */
export function createUser(overrides: Partial<UserData> = {}): UserData {
  const [city, state, zipCode] = pick(CITIES);
  return {
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
    street: `${Math.floor(Math.random() * 9000) + 100} Main St`,
    city,
    state,
    zipCode,
    phoneNumber: `555${digits(7)}`,
    ssn: digits(9),
    username: uniqueUsername(),
    password: `Pw_${randomSuffix()}${digits(4)}`,
    ...overrides,
  };
}

const PAYEES = ['City Power', 'Metro Water', 'FastNet Internet', 'Green Gas Co', 'Sunrise Mobile'];

/** A bill payee with a random account number. */
export function createPayee(overrides: Partial<PayeeData> = {}): PayeeData {
  const [city, state, zipCode] = pick(CITIES);
  return {
    name: `${pick(PAYEES)} ${randomSuffix()}`,
    street: `${Math.floor(Math.random() * 9000) + 100} Market St`,
    city,
    state,
    zipCode,
    phoneNumber: `555${digits(7)}`,
    accountNumber: digits(8),
    ...overrides,
  };
}
