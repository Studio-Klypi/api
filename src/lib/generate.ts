import { Listed } from '../types/primitives';

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const PASSWORD_LENGTH = 16;
const STRING_LENGTH = 16;

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,}$/;

export function generatePassword(): string {
  const allChars = LOWERCASE + UPPERCASE + NUMBERS + SPECIAL;

  const mandatory = [
    LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)],
    UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)],
    NUMBERS[Math.floor(Math.random() * NUMBERS.length)],
    SPECIAL[Math.floor(Math.random() * SPECIAL.length)],
  ];

  for (let i = mandatory.length; i < PASSWORD_LENGTH; i++) {
    mandatory.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  for (let i = mandatory.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mandatory[i], mandatory[j]] = [mandatory[j], mandatory[i]];
  }

  return mandatory.join('');
}

export function generateString(length: number = STRING_LENGTH): string {
  const allChars = LOWERCASE + UPPERCASE + NUMBERS;

  const result: Listed<string> = [];
  for (let i = result.length; i < length; ++i) {
    result.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  return result.join('');
}
