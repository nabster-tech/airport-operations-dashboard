import { test, expect } from '@playwright/test';
import { categories, categoryEntries } from '../../src/categories/catalog';
import { storageKeys } from '../../src/categories/airport';
test('all 71 focus views open and release size observers', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    const Native = window.ResizeObserver,
      active = new Map<object, Set<Element>>();
    window.ResizeObserver = class extends Native {
      constructor(cb: ResizeObserverCallback) {
        super(cb);
        active.set(this, new Set());
      }
      observe(el: Element, opts?: ResizeObserverOptions) {
        active.get(this)?.add(el);
        super.observe(el, opts);
      }
      unobserve(el: Element) {
        active.get(this)?.delete(el);
        super.unobserve(el);
      }
      disconnect() {
        active.get(this)?.clear();
        super.disconnect();
      }
    };
    Object.defineProperty(window, '__observations', {
      get: () => [...active.values()].reduce((n, s) => n + s.size, 0),
    });
  });
  await page.goto('/');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const category of categories) {
    await page.locator('nav a[href="#/kpis/' + category.id + '"]').click();
    await expect(page.locator('.kpi-card')).toHaveCount(categoryEntries(category.id).length);
    const observed = () =>
      page.evaluate(() => (window as unknown as { __observations: number }).__observations);
    const baseline = await observed();
    for (const kpi of categoryEntries(category.id)) {
      const button = page.locator('[data-widget="' + kpi.id + '"] .focus-button');
      await button.click();
      await expect(
        page.getByRole('dialog').getByRole('heading', { name: kpi.title, exact: true }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(button).toBeFocused();
    }
    await expect.poll(observed).toBe(baseline);
  }
  expect(errors).toEqual([]);
});
test('responsive widths and mobile category navigation remain usable', async ({ page }) => {
  await page.goto('/');
  for (const width of [390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const responsiveOverflow = await page.evaluate(async () => {
      let largest = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      for (let frame = 0; frame < 20; frame += 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        largest = Math.max(
          largest,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
      }
      return largest;
    });
    await expect(page.locator('.kpi-card')).toHaveCount(9);
    expect(responsiveOverflow, `transient horizontal overflow at ${width}px`).toBe(0);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileGeometry = await page.evaluate(() => ({
    cardsInsideViewport: [...document.querySelectorAll('[data-widget]')].every((node) => {
      const rectangle = node.getBoundingClientRect();
      return rectangle.left >= 0 && rectangle.right <= document.documentElement.clientWidth;
    }),
    smallestTopbarControl: Math.min(
      ...[...document.querySelectorAll('.topbar button, .topbar select')].map(
        (node) => node.getBoundingClientRect().height,
      ),
    ),
  }));
  expect(mobileGeometry.cardsInsideViewport).toBe(true);
  expect(mobileGeometry.smallestTopbarControl).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'screenshots/review-after-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open KPI categories' }).click();
  await page.getByRole('dialog').locator('a[href="#/kpis/airside-safety"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.kpi-card')).toHaveCount(8);
  await page.locator('.focus-button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('corrupt storage recovers and blocked saving retains the draft', async ({ page }) => {
  await page.addInitScript((keys) => {
    localStorage.setItem(keys.layouts, 'bad json');
    localStorage.setItem(keys.filters, 'bad json');
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  }, storageKeys);
  await page.goto('/');
  await expect(page.locator('.notice')).toContainText('could not be read');
  await expect(page.locator('.kpi-card')).toHaveCount(9);
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await expect(page.locator('.notice')).toContainText('Could not save');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
});
test('unknown category route recovers to the first category', async ({ page }) => {
  await page.goto('/#/kpis/unknown');
  await expect(page).toHaveURL(/#\/kpis\/airside-operations$/);
  await expect(page.locator('.kpi-card')).toHaveCount(9);
});
