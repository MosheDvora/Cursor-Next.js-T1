import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('textbox', { name: 'הדבק כאן את הטקסט הראשי לצורך מניפולציות' }).click();
  await page.getByRole('textbox', { name: 'הדבק כאן את הטקסט הראשי לצורך מניפולציות' }).fill('שלום רב');
  await page.getByRole('button', { name: 'סיום עריכה' }).click();
  await page.locator('div').filter({ hasText: 'שלוםרב' }).nth(2).press('ArrowLeft');
  await page.getByRole('combobox', { name: 'סוג קפיצה:' }).click();
  await page.getByRole('option', { name: 'אותיות' }).click();
  await page.getByRole('combobox', { name: 'סוג קפיצה:' }).press('ArrowLeft');
  await page.locator('div').filter({ hasText: 'ש ל ו ם ר ב' }).nth(2).press('ArrowLeft');
  await page.locator('div').filter({ hasText: 'ש ל ו ם ר ב' }).nth(2).press('ArrowLeft');
  await page.locator('div').filter({ hasText: 'ש ל ו ם ר ב' }).nth(2).press('ArrowLeft');
  await page.locator('div').filter({ hasText: 'ש ל ו ם ר ב' }).nth(2).press('ArrowLeft');
  await page.getByRole('button', { name: 'הוספת ניקוד' }).click();
  await page.getByRole('button', { name: 'הסרת ניקוד' }).click();
  await page.getByRole('button', { name: 'הוספת ניקוד' }).click();
});