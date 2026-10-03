import { test, expect } from '@playwright/test';

test('production headers protect Playground and both documentation locales', async ({ page }) => {
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.assign(window, { cspViolations: violations });
    document.addEventListener('securitypolicyviolation', event => {
      violations.push(`${event.violatedDirective}: ${event.blockedURI}`);
    });
  });
  for (const path of ['/', '/docs/index.html', '/docs/ja/index.html']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    const headers = response!.headers();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain("worker-src 'self'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    if (path === '/') {
      await expect(page.locator('#preview-status')).toHaveAttribute('data-state', 'valid');
    } else {
      await expect(page.locator('main')).toBeVisible();
    }
    expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
  }
});
