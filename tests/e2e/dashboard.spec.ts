import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const card = (id: string) => '[data-testid="card-' + id + '"]';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kpi-card')).toHaveCount(13);
});
test('overview, scoped filtering, and focus preserve the grid', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByRole('heading', { name: 'Airport overview.' })).toBeVisible();
  await page.screenshot({ path: 'screenshots/overview-1440.png', fullPage: true });
  const positions = await page
    .locator('.react-grid-item')
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).style.cssText));
  const trigger = page.getByRole('button', { name: 'Focus Security wait times', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('columnheader', { name: 'Highest interval p95', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Breakdown').selectOption('group');
  await expect(page.getByRole('dialog').locator('tbody tr')).toHaveCount(3);
  await page.screenshot({ path: 'screenshots/focus-1440.png' });
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(
    await page
      .locator('.react-grid-item')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).style.cssText)),
  ).toEqual(positions);
  const passengers = await page.locator(card('throughput') + ' .metric-number').innerText();
  await page.getByLabel('Terminal', { exact: true }).selectOption('t2');
  await expect(page.locator(card('throughput') + ' .metric-number')).not.toHaveText(passengers);
  await page.getByLabel('Movement', { exact: true }).selectOption('arrivals');
  await expect(
    page.locator(card('security')).getByText('Not applicable', { exact: true }),
  ).toBeVisible();
  await expect(page.locator(card('runway') + ' .card-footer')).toContainText('Airport-wide');
  expect(errors).toEqual([]);
});
test('save, hide, restore, settings, keyboard ordering, and cancel', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  await page.getByRole('button', { name: 'Settings for Security wait times' }).click();
  await page.getByRole('menuitem', { name: 'Hide card', exact: true }).click();
  await expect(page.locator('.kpi-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('has been saved');
  await page.reload();
  await expect(page.locator('.kpi-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  await page.getByRole('button', { name: /Restore cards/ }).click();
  await page.getByRole('menuitem', { name: 'Security wait times', exact: true }).click();
  await expect(page.locator('.kpi-card')).toHaveCount(13);
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await page.getByRole('button', { name: 'Settings for Passenger throughput' }).click();
  await page.getByRole('menuitem', { name: 'Data table', exact: true }).click();
  await expect(page.locator(card('throughput') + ' table')).toBeVisible();
  await page.reload();
  await expect(page.locator(card('throughput') + ' table')).toBeVisible();
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  await page.getByRole('button', { name: 'Settings for Passenger throughput' }).click();
  await page.getByRole('menuitem', { name: 'Move later', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('discarded');
});
test('pointer dragging and resizing persist actual coordinates', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  const gridItem = page.locator('[data-widget="security"]');
  const before = await gridItem.boundingBox();
  expect(before).not.toBeNull();
  const handle = gridItem.locator('.react-resizable-handle-e');
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  await expect(handle).toHaveCSS('cursor', 'ew-resize');
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + 100, box!.y + box!.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => Math.round((await gridItem.boundingBox())!.width))
    .toBeGreaterThan(Math.round(before!.width));
  await expect
    .poll(async () => Math.round((await gridItem.boundingBox())!.height))
    .toBe(Math.round(before!.height));
  const drag = gridItem.locator('.drag-handle');
  const dragBox = await drag.boundingBox();
  const oldY = (await gridItem.boundingBox())!.y;
  await page.mouse.move(dragBox!.x + 10, dragBox!.y + 10);
  await page.mouse.down();
  await page.mouse.move(dragBox!.x - 130, dragBox!.y + 420, { steps: 20 });
  await page.mouse.up();
  await expect
    .poll(async () => Math.round((await gridItem.boundingBox())!.y))
    .not.toBe(Math.round(oldY));
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('has been saved');
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('airside.workspace.meridian.v1')!).layouts.desktop.find(
      (r: { i: string }) => r.i === 'security',
    ),
  );
  expect(stored.w).toBeGreaterThan(3);
  await page.reload();
  await expect(page.locator('.kpi-card')).toHaveCount(13);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('airside.workspace.meridian.v1')!).layouts.desktop.find(
        (r: { i: string }) => r.i === 'security',
      ),
    ),
  ).toEqual(stored);
});
test('mobile adaptation and focus have no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('dashboard-grid')).toHaveAttribute('data-breakpoint', 'mobile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'screenshots/overview-390.png', fullPage: true });
  await page.getByRole('button', { name: 'Focus Passenger throughput', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Close focus view' }).click();
  await page.getByRole('button', { name: 'Toggle sidebar' }).click();
  await page.getByLabel('Terminal', { exact: true }).selectOption('international');
  await page.getByRole('button', { name: 'Close navigation', exact: true }).click();
  await expect(page.locator(card('throughput') + ' .card-footer')).toContainText('International');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByTestId('dashboard-grid')).toHaveAttribute('data-breakpoint', 'desktop');
});
test('overview and focus pass automated accessibility checks', async ({ page }) => {
  const overview = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(overview.violations).toEqual([]);
  await page.getByRole('button', { name: 'Focus Passenger throughput', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const focus = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(focus.violations).toEqual([]);
});
test('corrupt storage recovers and exporting produces a scoped CSV', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('airside.workspace.meridian.v1', 'invalid json'));
  await page.reload();
  await expect(page.locator('.kpi-card')).toHaveCount(13);
  await expect(page.getByRole('status')).toContainText('could not be read');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export snapshot' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('airside-meridian-today-all-all.csv');
});
