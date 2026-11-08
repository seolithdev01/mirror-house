// SPDX-License-Identifier: Apache-2.0
/** Share-code alphabet: uppercase + digits ≥2, minus easily-confused I/L/O/0/1. */
export const SEED_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SEED_MAX = 16;

export function isValidSeed(raw: string): boolean {
  return /^[A-Z2-9]{1,16}$/.test(raw);
}

export function normalizeSeed(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, SEED_MAX);
}

export function randomSeed(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += SEED_ALPHABET[b % SEED_ALPHABET.length];
  return out;
}
