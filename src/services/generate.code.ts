import { randomInt } from 'node:crypto';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function randomAlphanumeric(length: number): string {
  return Array.from({ length }, () => CHARSET[randomInt(CHARSET.length)]).join('');
}