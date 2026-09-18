import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('appearance follows system, persists explicit choices and synchronizes tabs', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const selector = page.getByRole('combobox', { name: 'Color theme' });
  await expect(selector).toHaveValue('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await selector.selectOption('light');
  await page.reload();
  await expect(selector).toHaveValue('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const second = await context.newPage();
  await second.goto('/');
  await second.getByRole('combobox', { name: 'Color theme' }).selectOption('dark');
  await expect(selector).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await selector.selectOption('system');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('light overview, focus and edit controls stay readable and mobile fits', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption('light');
  await expect(page.locator('.kpi-card')).toHaveCount(9);
  await expect(page.locator('.metric-number').first()).toHaveCSS('color', 'rgb(23, 43, 69)');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'screenshots/light-desktop.png', fullPage: true });
  await page.locator('.focus-button').first().click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'screenshots/light-focus.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('combobox', { name: 'Color theme' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Open KPI categories' }).click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: 'screenshots/light-mobile.png' });
});

test('invalid preferences and blocked storage do not prevent theme changes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('airside.theme.v1', 'invalid');
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(
    page.getByText('Theme changed for this visit. Browser storage is unavailable.'),
  ).toBeVisible();
});
