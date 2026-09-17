import { test, expect } from '@playwright/test';

test('all focus views and fifty repeated openings release resize observations', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const NativeObserver = window.ResizeObserver;
    const observations = new Map<object, Set<Element>>();
    window.ResizeObserver = class extends NativeObserver {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        observations.set(this, new Set());
      }
      observe(target: Element, options?: ResizeObserverOptions) {
        observations.get(this)?.add(target);
        super.observe(target, options);
      }
      unobserve(target: Element) {
        observations.get(this)?.delete(target);
        super.unobserve(target);
      }
      disconnect() {
        observations.get(this)?.clear();
        super.disconnect();
      }
    };
    Object.defineProperty(window, '__observations', {
      get: () => [...observations.values()].reduce((sum, targets) => sum + targets.size, 0),
    });
  });
  await page.goto('/');
  await expect(page.locator('.kpi-card')).toHaveCount(13);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const observed = () =>
    page.evaluate(() => (window as unknown as { __observations: number }).__observations);
  const baseline = await observed();
  const buttons = page.locator('.focus-button');
  for (let index = 0; index < 50; index++) {
    const button = buttons.nth(index % 13);
    await button.click();
    await expect(page.getByRole('dialog').locator('table')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(button).toBeFocused();
  }
  await expect.poll(observed).toBe(baseline);
  expect(errors).toEqual([]);
});

test('planned viewport sizes keep charts measurable without page overflow', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.kpi-card')).toHaveCount(13);
  for (const width of [390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
    await expect
      .poll(() =>
        page.locator('.recharts-surface').evaluateAll(
          (nodes) =>
            nodes.length > 0 &&
            nodes.every((node) => {
              const rect = node.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            }),
        ),
      )
      .toBe(true);
  }
});

test('blocked storage retains the editable draft and explains failed saving', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage blocked', 'SecurityError');
    };
  });
  await page.goto('/');
  await expect(page.locator('.kpi-card')).toHaveCount(13);
  await page.getByRole('button', { name: 'Edit layout', exact: true }).click();
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Could not save');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.kpi-card')).toHaveCount(13);
});
