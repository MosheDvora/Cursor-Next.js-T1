import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to detect if text contains niqqud marks
 * Niqqud marks are in Unicode range U+0591 to U+05C7
 */
function hasNiqqudMarks(text: string): boolean {
  // Check for niqqud marks using Unicode range
  const niqqudRegex = /[\u0591-\u05C7]/;
  return niqqudRegex.test(text);
}

/**
 * Helper function to get text content from the textarea or display area
 * The component can be in edit mode (textarea) or display mode (div)
 */
async function getTextContent(page: Page): Promise<string> {
  // Try to get text from textarea first (edit mode)
  const textarea = page.locator('[data-testid="editable-textarea"]');
  const isTextareaVisible = await textarea.isVisible().catch(() => false);
  
  if (isTextareaVisible) {
    const value = await textarea.inputValue();
    return value || '';
  }
  
  // Otherwise, get text from display area (non-edit mode)
  const displayArea = page.locator('[data-testid="text-display-area"]');
  const textContent = await displayArea.textContent();
  return textContent || '';
}

/**
 * Helper function to read text from localStorage
 */
async function getLocalStorageText(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return localStorage.getItem('main_text_field');
  });
}

/**
 * Helper function to wait for niqqud button to finish loading
 * Waits for the button to not be disabled and for loading spinner to disappear
 */
async function waitForNiqqudButtonReady(page: Page) {
  const button = page.locator('[data-testid="niqqud-toggle-button"]');
  
  // Wait for button to not be disabled
  await expect(button).not.toBeDisabled({ timeout: 30000 });
  
  // Wait for loading text/spinner to disappear (button should not contain "מעבד...")
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="niqqud-toggle-button"]');
      if (!btn) return false;
      const text = btn.textContent || '';
      return !text.includes('מעבד...');
    },
    { timeout: 30000 }
  );
}

test.describe('Niqqud Roundtrip', () => {
  test('text without niqqud roundtrip', async ({ page }) => {
    const originalText = 'שלום עולם';
    
    // ============================================
    // Step 1: Navigate to main page and type text
    // ============================================
    await page.goto('http://localhost:3000/');
    
    // Wait for page to load - check for the main textarea to be visible
    await page.waitForSelector('[data-testid="editable-textarea"]', { timeout: 10000 });
    
    // Type the sample Hebrew text into the textarea
    const textarea = page.locator('[data-testid="editable-textarea"]');
    await textarea.fill(originalText);
    
    // Verify the text was typed correctly
    const typedText = await textarea.inputValue();
    expect(typedText).toBe(originalText);
    
    // ============================================
    // Step 2: Add Niqqud and verify
    // ============================================
    // Get the niqqud toggle button
    const niqqudButton = page.locator('[data-testid="niqqud-toggle-button"]');
    
    // Verify button initially shows "הוספת ניקוד" (Add Niqqud)
    await expect(niqqudButton).toContainText('הוספת ניקוד');
    
    // Click the button to add niqqud
    await niqqudButton.click();
    
    // Wait for the operation to complete (button should not be disabled and loading should finish)
    await waitForNiqqudButtonReady(page);
    
    // Verify button text changed to "הסרת ניקוד" (Remove Niqqud)
    await expect(niqqudButton).toContainText('הסרת ניקוד');
    
    // Get the text content after adding niqqud
    const textWithNiqqud = await getTextContent(page);
    
    // Verify the text now contains niqqud marks
    expect(hasNiqqudMarks(textWithNiqqud)).toBe(true);
    
    // Verify the text is different from the original plain text
    expect(textWithNiqqud).not.toBe(originalText);
    
    // Verify the text still contains the original words (without niqqud marks)
    const textWithoutNiqqud = textWithNiqqud.replace(/[\u0591-\u05C7]/g, '');
    expect(textWithoutNiqqud.trim()).toBe(originalText.trim());
    
    // ============================================
    // Step 3: Remove Niqqud and verify localStorage
    // ============================================
    // Click the niqqud toggle button again to remove niqqud
    await niqqudButton.click();
    
    // Wait for the operation to complete
    await waitForNiqqudButtonReady(page);
    
    // Verify button text changed back to "הוספת ניקוד" (Add Niqqud)
    await expect(niqqudButton).toContainText('הוספת ניקוד');
    
    // Get the text content after removing niqqud
    const textWithoutNiqqudAfterRemoval = await getTextContent(page);
    
    // Verify the text is back to plain text without niqqud
    expect(hasNiqqudMarks(textWithoutNiqqudAfterRemoval)).toBe(false);
    
    // Verify the text matches the original "שלום עולם"
    expect(textWithoutNiqqudAfterRemoval.trim()).toBe(originalText.trim());
    
    // Verify localStorage contains the plain text
    const localStorageText = await getLocalStorageText(page);
    expect(localStorageText).toBe(originalText);
    
    // ============================================
    // Step 4: Add Niqqud again from localStorage
    // ============================================
    // Click the niqqud toggle button again to add niqqud
    // This time it should use the cached version from localStorage
    await niqqudButton.click();
    
    // Wait for the operation to complete
    // Note: This should be faster since it uses the cache
    await waitForNiqqudButtonReady(page);
    
    // Verify button text changed to "הסרת ניקוד" (Remove Niqqud)
    await expect(niqqudButton).toContainText('הסרת ניקוד');
    
    // Get the text content after adding niqqud again
    const textWithNiqqudAgain = await getTextContent(page);
    
    // Verify the text now contains niqqud marks again
    expect(hasNiqqudMarks(textWithNiqqudAgain)).toBe(true);
    
    // Verify the text came from localStorage by checking it matches the previously stored text
    // The niqqud version should be the same as before (from cache)
    expect(textWithNiqqudAgain).toBe(textWithNiqqud);
    
    // Verify localStorage still contains the original plain text
    const localStorageTextAfterSecondAdd = await getLocalStorageText(page);
    expect(localStorageTextAfterSecondAdd).toBe(originalText);
  });
});

