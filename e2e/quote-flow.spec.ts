import { expect, test } from '@playwright/test';

/**
 * Full path: create a catalog entry (product, tier, features, add-on pricing) →
 * build a quote → save it → view the saved quote on its public share URL, and
 * confirm it still renders in a fresh (unauthenticated) browser context.
 *
 * Reproduces the reference quote total of $18,150:
 *   base 25 × $50 × 12 × 0.85 = $12,750
 *   + SSO (fixed $200/mo × 12)  = $2,400
 *   + API (5 seats × $50 × 12)  = $3,000
 */
test('create catalog → build quote → view shared quote', async ({ page, browser }) => {
  const productName = `E2E Analytics ${Date.now()}`;

  // --- Create product ---
  await page.goto('/catalog/new');
  await page.getByLabel('Product name').fill(productName);
  await page.getByRole('button', { name: 'Create product' }).click();
  await page.waitForURL(/\/catalog\/[^/]+$/);
  await expect(page.getByRole('heading', { name: productName })).toBeVisible();

  // --- Add a Growth tier at $50 / seat / mo ---
  await page.getByLabel('New tier name').fill('Growth');
  await page.getByLabel('New tier price (USD)').fill('50');
  await page.getByRole('button', { name: 'Add tier' }).click();
  await expect(page.getByText('$50 / seat / mo')).toBeVisible();

  // --- Edit the tier price (exercises updateTier + the edit-form auto-collapse), then revert ---
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Tier base price (USD)').fill('60');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('$60 / seat / mo')).toBeVisible(); // collapsed back to display with the new price
  // revert to $50 so the quote below reproduces the reference total
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Tier base price (USD)').fill('50');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('$50 / seat / mo')).toBeVisible();

  // --- Add two features ---
  await page.getByLabel('New feature name').fill('API access');
  await page.getByRole('button', { name: 'Add feature' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'API access' })).toBeVisible();

  await page.getByLabel('New feature name').fill('Single Sign-On');
  await page.getByRole('button', { name: 'Add feature' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Single Sign-On' })).toBeVisible();

  // --- Set the pricing matrix ---
  await page.getByRole('link', { name: 'Edit pricing matrix' }).click();
  await page.waitForURL(/\/matrix$/);

  const apiRow = page.getByRole('row', { name: /API access/ });
  await apiRow.getByLabel('Availability').selectOption('ADDON');
  await apiRow.getByLabel('Pricing model').selectOption('PER_SEAT');
  await apiRow.getByLabel('Add-on value').fill('50');

  const ssoRow = page.getByRole('row', { name: /Single Sign-On/ });
  await ssoRow.getByLabel('Availability').selectOption('ADDON');
  await ssoRow.getByLabel('Pricing model').selectOption('FIXED_MONTHLY');
  await ssoRow.getByLabel('Add-on value').fill('200');

  await page.getByRole('button', { name: 'Save matrix' }).click();
  await expect(page.getByText('Saved ✓')).toBeVisible();

  // --- Build a quote ---
  await page.goto('/quotes/new');
  await page.getByLabel('Product', { exact: true }).selectOption({ label: productName });
  await page.getByLabel('Quote name').fill('Acme Corp - Q3 2026 proposal');
  await page.getByLabel('Customer').fill('Acme Corporation');
  await page.getByLabel('Seats').fill('25');
  await page.getByRole('button', { name: /Annual/ }).click();

  // Select both add-ons; give API access 5 seats (independent of the 25 product seats).
  const apiAddon = page.getByRole('listitem').filter({ hasText: 'API access' });
  await apiAddon.getByRole('checkbox').check();
  await page.getByLabel('Add-on seats').fill('5');
  await page.getByRole('listitem').filter({ hasText: 'Single Sign-On' }).getByRole('checkbox').check();

  // Live preview should already show the reference total before saving.
  await expect(page.getByText('$18,150')).toBeVisible();

  await page.getByRole('button', { name: /Save quote/ }).click();

  // --- View the saved, shareable quote ---
  await page.waitForURL(/\/q\/[^/]+$/);
  const shareUrl = page.url();

  await expect(page.getByText('Prepared for Acme Corporation')).toBeVisible();
  await expect(
    page.getByText('25 seats × $50 per seat per month × 12 months × (1 - 15% annual discount)'),
  ).toBeVisible();
  // exact: true — this string is also a substring of the base line ("2[5 seats × …]").
  await expect(page.getByText('5 seats × $50 per seat per month × 12 months', { exact: true })).toBeVisible();
  await expect(page.getByText('$200 per month × 12 months')).toBeVisible();
  await expect(page.getByText('$18,150')).toBeVisible();

  // --- Reopen in a fresh, unauthenticated context: it's a read-only public document ---
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(shareUrl);
  await expect(guestPage.getByRole('heading', { name: 'Acme Corp - Q3 2026 proposal' })).toBeVisible();
  await expect(guestPage.getByText('$18,150')).toBeVisible();
  await guestContext.close();
});
