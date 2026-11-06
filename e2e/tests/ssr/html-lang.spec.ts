import {expect, test} from '../../fixtures';
import {grantedConsentCookie} from '../../utils/consent';
import {waitForHydration} from '../../utils/hydration';

test.describe('server-rendered document language', () => {
  for (const [name, headers, lang] of [
    ['the locale cookie', {Cookie: 'locale=pt-br'}, 'pt-br'],
    ['a locale with an Intl override', {Cookie: 'locale=se'}, 'sv'],
    ['an unsupported locale cookie', {Cookie: 'locale=xx'}, 'id'],
    ['the default, whatever the Accept-Language header says', {Cookie: '', 'Accept-Language': 'de-DE,de;q=0.9'}, 'id'],
  ] as const) {
    test(`the html element declares the language picked from ${name}`, async ({request}) => {
      const html = await (await request.get('/auth/login', {headers})).text();

      expect(html).toContain(`<html lang="${lang}">`);
    });
  }

  test('the language survives hydration', async ({page}) => {
    await page.context().addCookies([{name: 'locale', value: 'fr', url: test.info().project.use.baseURL!}]);
    await page.goto('/auth/login');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });
});

test.describe('a visitor who has not chosen a language', () => {
  test.use({locale: 'de-DE', storageState: {cookies: [grantedConsentCookie()], origins: []}});

  test('gets Indonesian whatever the browser language is', async ({page}) => {
    await page.goto('/auth/login');
    await waitForHydration(page, 'form');

    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  });
});
