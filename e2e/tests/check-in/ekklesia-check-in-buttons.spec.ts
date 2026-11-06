import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { CheckInListPage } from '../../pages/check-in-list.page';
import { createDraftEventWithTicket } from '../../api/factory';
import { uniqueShort } from '../../utils/unique';

const CHECK_IN_APP_URL = 'https://checkin.example.test';

async function opensInNewTab(page: Page, click: () => Promise<void>): Promise<string> {
  await page.context().route(`${CHECK_IN_APP_URL}/**`, (route) => route.fulfill({ status: 200, body: 'ok' }));
  const [opened] = await Promise.all([page.context().waitForEvent('page'), click()]);
  return opened.url();
}

test.describe('Ekklesia check-in buttons', () => {
  test('the event page opens its default check-in list in the Ekklesia check-in app', async ({ authedPage, api, account }) => {
    const event = await createDraftEventWithTicket(api, account.organizerId);
    await authedPage.goto(`/manage/event/${event.eventId}/dashboard`);

    const button = authedPage.getByTestId('ekklesia-check-in-open-button');
    await expect(button).toBeEnabled();

    const url = await opensInNewTab(authedPage, () => button.click());

    expect(url).toMatch(new RegExp(`^${CHECK_IN_APP_URL}/hi#cil_[A-Za-z0-9]+$`));
  });

  test('a check-in list opens in the Ekklesia check-in app with its key after the #', async ({ authedPage, api, account }) => {
    const event = await createDraftEventWithTicket(api, account.organizerId);
    const name = uniqueShort('Main Door');
    const list = await api.createCheckInList(event.eventId, { name });

    const checkInLists = new CheckInListPage(authedPage);
    await checkInLists.goto(event.eventId);

    const url = await opensInNewTab(authedPage, () => checkInLists.openEkklesiaCheckInButton(name).click());

    expect(url).toBe(`${CHECK_IN_APP_URL}/hi#${list.short_id}`);
  });

  test('a check-in list shows its Ekklesia link and QR code for the door staff', async ({ authedPage, api, account }) => {
    const event = await createDraftEventWithTicket(api, account.organizerId);
    const name = uniqueShort('Side Door');
    const list = await api.createCheckInList(event.eventId, { name });

    const checkInLists = new CheckInListPage(authedPage);
    await checkInLists.goto(event.eventId);
    await checkInLists.openRowAction(name, 'Ekklesia Check-In link and QR code');

    const dialog = authedPage.getByRole('dialog');
    await expect(dialog.getByTestId('ekklesia-check-in-qr-code')).toBeVisible();
    await expect(dialog.getByRole('textbox')).toHaveValue(`${CHECK_IN_APP_URL}/hi#${list.short_id}`);
  });
});
