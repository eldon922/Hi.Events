import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { createDraftEventWithTicket, createLiveEventWithProduct } from '../../api/factory';

const LEGAL_LINKS: Record<string, string> = {
  'Terms of Service': 'https://legal.example.test/terms',
  'Privacy Policy': 'https://legal.example.test/privacy',
  'Organizer Terms': 'https://legal.example.test/organizer',
  'Community Guidelines': 'https://legal.example.test/community',
  'Contact and Complaints': 'https://legal.example.test/contact',
};

async function expectFullFooter(page: Page) {
  const legal = page.getByTestId('legal-links');

  for (const [name, href] of Object.entries(LEGAL_LINKS)) {
    await expect(legal.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
  await expect(legal).toContainText('PT Contoh Uji, Jl. Contoh No. 1, Bandung');
  await expect(page.getByRole('link', { name: 'Powered by Ekklesia, based on Hi.Events' })).toHaveAttribute('href', /^https:\/\/hi\.events\/?\?/);
  await expect(page.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', 'https://github.com/eldon922/hi.events');
}

test.describe('Page footer', () => {
  test('the sign-in page links the legal pages, the company and the source code', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/auth/login');

    await expectFullFooter(page);
  });

  test('a dashboard page carries the same footer', async ({ authedPage, api, account }) => {
    const event = await createDraftEventWithTicket(api, account.organizerId);
    await authedPage.goto(`/manage/event/${event.eventId}/dashboard`);

    await expectFullFooter(authedPage);
  });

  test('a public event page carries the same footer', async ({ page, api, account }) => {
    const event = await createLiveEventWithProduct(api, { organizerId: account.organizerId });
    await page.goto(`/event/${event.eventId}/${event.slug}`);

    await expectFullFooter(page);
  });
});
