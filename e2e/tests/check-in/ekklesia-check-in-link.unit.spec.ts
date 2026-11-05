import { expect, test } from '@playwright/test';
import { ekklesiaCheckInUrl } from '../../../frontend/src/utilites/ekklesiaCheckIn';

test('the list key comes after the # so it never reaches a server', () => {
  const url = new URL(ekklesiaCheckInUrl('https://checkin.ekklesia.web.id', 'cil_k3il0u9aBcDeF'));

  expect(url.origin).toBe('https://checkin.ekklesia.web.id');
  expect(url.pathname).toBe('/hi');
  expect(url.search).toBe('');
  expect(url.hash).toBe('#cil_k3il0u9aBcDeF');
});

test('slashes at the end of the app address make no difference', () => {
  const expected = 'https://checkin.ekklesia.web.id/hi#cil_k3il0u9aBcDeF';

  for (const appUrl of ['https://checkin.ekklesia.web.id', 'https://checkin.ekklesia.web.id/', 'https://checkin.ekklesia.web.id///']) {
    expect(ekklesiaCheckInUrl(appUrl, 'cil_k3il0u9aBcDeF'), appUrl).toBe(expected);
  }
});

test('an app address with a path keeps it', () => {
  expect(ekklesiaCheckInUrl('https://example.com/checkin/', 'cil_k3il0u9aBcDeF')).toBe('https://example.com/checkin/hi#cil_k3il0u9aBcDeF');
});
