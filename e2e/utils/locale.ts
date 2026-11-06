import type { BrowserContextOptions } from '@playwright/test';
import { cookieDomain } from './env';

type StorageState = Exclude<BrowserContextOptions['storageState'], string | undefined>;

export const localeCookie = (locale: string): StorageState['cookies'][number] => ({
  name: 'locale',
  value: locale,
  domain: cookieDomain(),
  path: '/',
  expires: -1,
  httpOnly: false,
  secure: false,
  sameSite: 'Lax',
});
