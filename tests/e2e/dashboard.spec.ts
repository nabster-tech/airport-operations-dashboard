import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { categories, categoryEntries } from '../../src/categories/catalog';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kpi-card')).toHaveCount(9);
});
test('all eleven categories show exactly their registered KPIs and preserve browser navigation', async ({
  page,
}) => {
  for (const category of categories) {
    await page
      .getByRole('navigation', { name: 'KPI categories' })
      .getByRole('link')
      .filter({ hasText: category.label })
      .click();
    await expect(page.locator('#category-title')).toContainText(category.label);
    await expect(page.locator('.kpi-card')).toHaveCount(categoryEntries(category.id).length);
    expect(
      await page
        .locator('[data-widget]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-widget')).sort()),
    ).toEqual(
      categoryEntries(category.id)
        .map((e) => e.id)
        .sort(),
    );
  }
  await page.reload();
  await expect(page.locator('#category-title')).toContainText('Passenger Flow');
  await page.goBack();
  await expect(page.locator('#category-title')).toContainText('Terminal Operations');
  await page.goForward();
  await expect(page.locator('#category-title')).toContainText('Passenger Flow');
});
test('drafts, hiding, undo, restore, saving and filters are scoped per category', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Settings for On-Time Performance (OTP) – All Flights',
      exact: true,
    })
    .click();
  await page.getByRole('menuitem', { name: 'Hide KPI', exact: true }).click();
  await expect(page.locator('.kpi-card')).toHaveCount(8);
  await page.getByRole('button', { name: 'Undo hide' }).click();
  await expect(page.locator('.kpi-card')).toHaveCount(9);
  await page
    .getByRole('button', {
      name: 'Settings for On-Time Performance (OTP) – All Flights',
      exact: true,
    })
    .click();
  await page.getByRole('menuitem', { name: 'Hide KPI', exact: true }).click();
  await page.locator('nav a[href="#/kpis/passenger-flow"]').click();
  await expect(page.locator('.kpi-card')).toHaveCount(7);
  await page.locator('#filter-terminal').selectOption('T2');
  await page.locator('nav a[href="#/kpis/airside-operations"]').click();
  await expect(page.locator('.kpi-card')).toHaveCount(8);
  await expect(page.locator('#filter-terminal')).toHaveValue('all');
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await expect(page.locator('.notice')).toContainText('has been saved');
  await page.reload();
  await expect(page.locator('.kpi-card')).toHaveCount(8);
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  await page.getByRole('button', { name: 'Restore KPIs' }).click();
  await page
    .getByRole('menuitem', { name: 'On-Time Performance (OTP) – All Flights', exact: true })
    .click();
  await expect(page.locator('.kpi-card')).toHaveCount(9);
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
});
test('right edge resizes width without height changes and pointer drag persists', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  const item = page.locator('[data-widget="ao-otp-base"]'),
    before = (await item.boundingBox())!;
  const handle = item.locator('.react-resizable-handle-e');
  await expect(handle).toHaveCSS('cursor', 'ew-resize');
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 100, h.y + h.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => Math.round((await item.boundingBox())!.width))
    .toBeGreaterThan(Math.round(before.width));
  expect(Math.round((await item.boundingBox())!.height)).toBe(Math.round(before.height));
  const drag = (await item.locator('.drag-handle').boundingBox())!;
  const oldY = (await item.boundingBox())!.y;
  await page.mouse.move(drag.x + 8, drag.y + 8);
  await page.mouse.down();
  await page.mouse.move(drag.x - 150, drag.y + 440, { steps: 20 });
  await page.mouse.up();
  await expect
    .poll(async () => Math.round((await item.boundingBox())!.y))
    .not.toBe(Math.round(oldY));
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  const saved = await page.evaluate(() => localStorage.getItem('airside.categories.meridian.v2'));
  expect(saved).toBeTruthy();
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('airside.categories.meridian.v2'))).toBe(
    saved,
  );
});
test('KPI search opens a different category, focus details and category CSV work', async ({
  page,
}) => {
  await page.getByLabel('Find a KPI').fill('Predictive');
  await page.getByRole('button', { name: /Predictive Passenger Flow/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('read-only');
  await page
    .getByRole('dialog')
    .getByRole('combobox', { name: 'Breakdown' })
    .selectOption('records');
  await expect(page.getByRole('dialog').locator('table')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export category' }).click();
  expect((await download).suggestedFilename()).toBe('terminal-operations-today.csv');
});
test('overview and focus pass automated accessibility checks', async ({ page }) => {
  await page.screenshot({ path: 'screenshots/categories-desktop.png', fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.locator('.focus-button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});
