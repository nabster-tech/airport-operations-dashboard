import { test, expect } from '@playwright/test';

test('currency and airport local plus UTC controls persist across reloads', async ({ page }) => {
  await page.goto('/');
  const currency = page.getByRole('combobox', { name: 'Display currency' });
  await expect(currency).toHaveValue('EUR');
  const passengerValue = await page.locator('.metric-number').first().innerText();
  await currency.selectOption('USD');
  await expect(currency).toHaveValue('USD');
  await expect(page.locator('.metric-number').first()).toHaveText(passengerValue);
  const timeToggle = page.getByRole('button', { name: 'Show UTC' });
  await timeToggle.click();
  await expect(page.locator('.page-footer')).toContainText('17 Sep 2026 · 14:00 IST · 08:30 UTC');
  await expect(page.locator('.recharts-cartesian-axis-tick-value').first()).toContainText('UTC');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Display currency' })).toHaveValue('USD');
  await expect(page.getByRole('button', { name: 'IST + UTC' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.page-footer')).toContainText('17 Sep 2026 · 14:00 IST · 08:30 UTC');
  await page.getByRole('combobox', { name: 'Display currency' }).selectOption('INR');
  await expect(page.getByRole('combobox', { name: 'Display currency' })).toHaveValue('INR');
  await page.getByRole('button', { name: 'IST + UTC' }).click();
  await expect(page.locator('.page-footer')).toContainText('14:00 IST');
  await expect(page.locator('.page-footer')).not.toContainText('UTC');
});

test('dual timezone labels appear in focused tables and charts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show UTC' }).click();
  await page.getByRole('button', { name: 'Focus On-Time Performance (OTP) – All Flights' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Breakdown' })
    .selectOption('records');
  await expect(page.getByRole('dialog').locator('tbody')).toContainText('UTC');
  await expect(page.getByRole('dialog').locator('tbody')).toContainText('16 Sep');
  await expect(
    page.getByRole('dialog').getByRole('columnheader', { name: 'Airport time' }),
  ).toBeVisible();
});
