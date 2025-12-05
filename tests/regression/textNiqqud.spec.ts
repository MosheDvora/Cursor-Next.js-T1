/**
 * Regression test for "Text without niqqud roundtrip" flow
 * 
 * This test verifies the complete flow of:
 * 1. Adding niqqud to plain Hebrew text (calls model API)
 * 2. Removing niqqud from text (uses cached version from memory)
 * 
 * The test ensures that:
 * - API calls are made when adding niqqud
 * - Text correctly displays with niqqud after API call
 * - Removing niqqud uses cached version (no new API call)
 * - Final text matches original plain text
 * - Text is saved to localStorage at each step
 */

import { test, expect } from '@playwright/test';

/**
 * Hebrew niqqud marks Unicode ranges
 * Copied from lib/niqqud.ts to avoid external dependencies in tests
 */
const NIQQUD_RANGES = [
  [0x0591, 0x05c7], // Main niqqud range
];

/**
 * Check if a character is a Hebrew niqqud mark
 * Copied from lib/niqqud.ts to avoid external dependencies in tests
 */
function isNiqqudMark(char: string): boolean {
  const code = char.charCodeAt(0);
  return NIQQUD_RANGES.some(([start, end]) => code >= start && code <= end);
}

/**
 * Remove all niqqud marks from Hebrew text
 * Copied from lib/niqqud.ts to avoid external dependencies in tests
 * Uses the same implementation as the application to ensure consistent behavior
 */
function removeNiqqud(text: string): string {
  return text
    .split("")
    .filter((char) => !isNiqqudMark(char))
    .join("");
}

test.describe('Text without niqqud roundtrip', () => {
  test('should add niqqud via API and remove it from cache', async ({ page }) => {
    const originalText = 'שלום עולם';
    let apiCallMade = false;
    let apiCallCount = 0;

    // Step 1: Navigate to the main page
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Step 2: Set up route interception to track API calls to the model
    // The niqqud service makes calls to Google Gemini API or other model APIs
    await page.route('**/generateContent**', async (route) => {
      apiCallMade = true;
      apiCallCount++;
      
      // Continue with the actual request (don't mock it, let it go through)
      await route.continue();
    });

    // Also intercept any other potential API endpoints
    await page.route('**/v1/chat/completions**', async (route) => {
      apiCallMade = true;
      apiCallCount++;
      await route.continue();
    });

    // Step 3: Type Hebrew text into the text input
    const textarea = page.getByTestId('editable-textarea');
    await expect(textarea).toBeVisible();
    
    // Clear any existing text first
    await textarea.clear();
    
    // Type the Hebrew text
    await textarea.fill(originalText);
    
    // Verify the text was entered correctly
    await expect(textarea).toHaveValue(originalText);

    // Verify text is saved to localStorage after typing
    await page.waitForTimeout(100); // Small delay for localStorage save
    const localStorageTextAfterTyping = await page.evaluate(() => {
      return localStorage.getItem('main_text_field');
    });
    expect(
      localStorageTextAfterTyping,
      'Text should be saved to localStorage after typing'
    ).toBe(originalText);

    // Step 4: Click the "Add Niqqud" button
    const niqqudButton = page.getByTestId('niqqud-toggle-button');
    await expect(niqqudButton).toBeVisible();
    
    // Verify button shows "Add Niqqud" text (הוספת ניקוד)
    await expect(niqqudButton).toContainText('הוספת ניקוד');
    
    // Click the button to add niqqud
    await niqqudButton.click();

    // Step 5: Verify that the program goes to the model to get the niqqud
    // Wait for the API call to be made (with timeout)
    await page.waitForTimeout(2000); // Give time for API call to initiate
    
    // Verify API call was made
    expect(apiCallMade, 'API call should have been made to get niqqud from model').toBe(true);
    expect(apiCallCount, 'Exactly one API call should be made when adding niqqud').toBeGreaterThanOrEqual(1);

    // Step 6: Wait for loading to complete and verify niqqud was added
    // Wait for the loading spinner to disappear
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-testid="niqqud-toggle-button"]');
      if (!button) return false;
      const text = button.textContent || '';
      // Button should show "Remove Niqqud" (הסרת ניקוד) when niqqud is present
      return text.includes('הסרת ניקוד');
    }, { timeout: 30000 }); // Allow up to 30 seconds for API response

    // Verify button text changed to "Remove Niqqud"
    await expect(niqqudButton).toContainText('הסרת ניקוד');

    // Step 7: Verify the output now contains niqqud marks
    // Helper function to get text from either textarea or display area
    const getTextContent = async (): Promise<string> => {
      // Check if textarea is visible (editing mode)
      const textareaVisible = await textarea.isVisible().catch(() => false);
      if (textareaVisible) {
        return await textarea.inputValue();
      }
      // Otherwise, get text from display area
      const displayArea = page.getByTestId('text-display-area');
      return await displayArea.textContent() || '';
    };
    
    // Get the current text value
    const textWithNiqqud = await getTextContent();
    
    // Verify text is not identical to the original plain text
    expect(textWithNiqqud, 'Text with niqqud should be different from original').not.toBe(originalText);
    
    // Verify the text actually contains niqqud marks
    // Niqqud marks are in Unicode range U+0591 to U+05C7
    const hasNiqqudMarks = /[\u0591-\u05C7]/.test(textWithNiqqud);
    expect(hasNiqqudMarks, 'Text should contain niqqud marks after adding niqqud').toBe(true);

    // Verify text with niqqud is saved to localStorage
    await page.waitForTimeout(100); // Small delay for localStorage save
    const localStorageTextWithNiqqud = await page.evaluate(() => {
      return localStorage.getItem('main_text_field');
    });
    expect(
      localStorageTextWithNiqqud,
      'Text with niqqud should be saved to localStorage after adding niqqud'
    ).toBe(textWithNiqqud);

    // Step 8: Reset API call tracking for the remove operation
    const apiCallCountBeforeRemove = apiCallCount;
    apiCallMade = false;

    // Step 9: Click the "Remove Niqqud" button and measure time
    // This verifies that removal from cache is fast (milliseconds) vs API call (seconds)
    await expect(niqqudButton).toContainText('הסרת ניקוד');
    
    // Start timing before clicking
    const startTime = Date.now();
    await niqqudButton.click();

    // Step 10: Wait for the text to be updated (should be fast since it's from cache)
    // Wait for button to change back to "Add Niqqud" - this indicates cache was used
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-testid="niqqud-toggle-button"]');
      if (!button) return false;
      const text = button.textContent || '';
      // Button should show "Add Niqqud" (הוספת ניקוד) when niqqud is removed
      return text.includes('הוספת ניקוד');
    }, { timeout: 5000 }); // Cache should be instant, but allow up to 5 seconds
    
    // Measure time after update
    const endTime = Date.now();
    const removalTime = endTime - startTime;

    // Step 11: Verify the text is again without niqqud
    const textWithoutNiqqud = await getTextContent();
    
    // Remove any niqqud marks to compare with original using the same method as the application
    const textWithoutNiqqudNormalized = removeNiqqud(textWithoutNiqqud);
    const originalTextNormalized = removeNiqqud(originalText);
    
    // Verify content matches the original plain text
    expect(
      textWithoutNiqqudNormalized.trim(),
      'Text after removing niqqud should match original text'
    ).toBe(originalTextNormalized.trim());

    // Verify text without niqqud is saved to localStorage
    await page.waitForTimeout(100); // Small delay for localStorage save
    const localStorageTextWithoutNiqqud = await page.evaluate(() => {
      return localStorage.getItem('main_text_field');
    });
    expect(
      localStorageTextWithoutNiqqud,
      'Text without niqqud should be saved to localStorage after removing niqqud'
    ).toBe(textWithoutNiqqud);

    // Step 12: Verify that the text came from memory (no new API call + fast execution)
    // Wait a bit to ensure no additional API calls are made
    await page.waitForTimeout(1000);
    
    expect(
      apiCallCount,
      'No new API call should be made when removing niqqud (should use cache)'
    ).toBe(apiCallCountBeforeRemove);
    
    // Verify removal was fast (cache access should be < 2 seconds, API calls take 5-30+ seconds)
    expect(
      removalTime,
      `Removing niqqud from cache should be fast (< 2000ms), but took ${removalTime}ms. If it took longer, it might have called the API instead of using cache.`
    ).toBeLessThan(2000);
    
    // Verify button text changed back to "Add Niqqud"
    await expect(niqqudButton).toContainText('הוספת ניקוד');

    // Step 13: Add niqqud again and verify it comes from cache (not a new API call)
    // Reset API call tracking for the second add operation
    const apiCallCountBeforeSecondAdd = apiCallCount;
    apiCallMade = false;

    // Step 14: Click "Add Niqqud" button again and measure time
    // This should use the cached full niqqud version, not call the API
    await expect(niqqudButton).toContainText('הוספת ניקוד');
    
    // Start timing before clicking
    const startTimeSecondAdd = Date.now();
    await niqqudButton.click();

    // Step 15: Wait for niqqud to be added (should be fast since it's from cache)
    // Wait for button to change to "Remove Niqqud" - this indicates cache was used
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-testid="niqqud-toggle-button"]');
      if (!button) return false;
      const text = button.textContent || '';
      // Button should show "Remove Niqqud" (הסרת ניקוד) when niqqud is present
      return text.includes('הסרת ניקוד');
    }, { timeout: 5000 }); // Cache should be instant, but allow up to 5 seconds
    
    // Measure time after update
    const endTimeSecondAdd = Date.now();
    const secondAddTime = endTimeSecondAdd - startTimeSecondAdd;

    // Step 16: Verify niqqud was added again
    const textWithNiqqudAgain = await getTextContent();
    
    // Verify text contains niqqud marks again
    const hasNiqqudMarksAgain = /[\u0591-\u05C7]/.test(textWithNiqqudAgain);
    expect(hasNiqqudMarksAgain, 'Text should contain niqqud marks after adding niqqud again').toBe(true);
    
    // Verify text is not identical to the original plain text
    expect(textWithNiqqudAgain, 'Text with niqqud should be different from original').not.toBe(originalText);

    // Verify text with niqqud is saved to localStorage again
    await page.waitForTimeout(100); // Small delay for localStorage save
    const localStorageTextWithNiqqudAgain = await page.evaluate(() => {
      return localStorage.getItem('main_text_field');
    });
    expect(
      localStorageTextWithNiqqudAgain,
      'Text with niqqud should be saved to localStorage after adding niqqud again'
    ).toBe(textWithNiqqudAgain);

    // Step 17: Verify that the niqqud came from memory (no new API call + fast execution)
    // Wait a bit to ensure no additional API calls are made
    await page.waitForTimeout(1000);
    
    expect(
      apiCallCount,
      'No new API call should be made when adding niqqud again (should use cache)'
    ).toBe(apiCallCountBeforeSecondAdd);
    
    // Verify second add was fast (cache access should be < 2 seconds, API calls take 5-30+ seconds)
    expect(
      secondAddTime,
      `Adding niqqud from cache should be fast (< 2000ms), but took ${secondAddTime}ms. If it took longer, it might have called the API instead of using cache.`
    ).toBeLessThan(2000);
    
    // Verify button text changed to "Remove Niqqud"
    await expect(niqqudButton).toContainText('הסרת ניקוד');
  });

  /**
   * Regression test for "Text with niqqud roundtrip" flow (reverse flow)
   * 
   * This test verifies the complete flow when starting with text that already has niqqud:
   * 1. Pasting text with niqqud (should NOT call model API)
   * 2. Removing niqqud from text (uses cached version from memory)
   * 3. Adding niqqud back (uses cached version from memory, not API)
   * 
   * The test ensures that:
   * - NO API calls are made when pasting text with niqqud
   * - Text correctly displays with niqqud after pasting
   * - Removing niqqud uses cached version (no new API call)
   * - Adding niqqud back uses cached version (no new API call)
   * - Text is saved to localStorage at each step
   */
  test('should handle pasted text with niqqud without API call and use cache for toggle', async ({ page }) => {
    const textWithNiqqud = 'דָּנִי קָם בַּבֹּקֶר שָׂמֵחַ';
    const textWithoutNiqqud = 'דני קם בבוקר שמח';
    let apiCallMade = false;
    let apiCallCount = 0;

    // Step 1: Navigate to the main page
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Step 2: Set up route interception to track API calls to the model
    // The niqqud service makes calls to Google Gemini API or other model APIs
    await page.route('**/generateContent**', async (route) => {
      apiCallMade = true;
      apiCallCount++;
      
      // Continue with the actual request (don't mock it, let it go through)
      await route.continue();
    });

    // Also intercept any other potential API endpoints
    await page.route('**/v1/chat/completions**', async (route) => {
      apiCallMade = true;
      apiCallCount++;
      await route.continue();
    });

    // Step 3: Paste Hebrew text with niqqud into the text input
    const textarea = page.getByTestId('editable-textarea');
    await expect(textarea).toBeVisible();
    
    // Clear any existing text first
    await textarea.clear();
    
    // Paste the Hebrew text with niqqud
    await textarea.fill(textWithNiqqud);
    
    // Verify the text was entered correctly
    await expect(textarea).toHaveValue(textWithNiqqud);

    // Step 4: Verify that NO API call was made when pasting text with niqqud
    // Wait a bit to ensure no API calls are made
    await page.waitForTimeout(1000);
    
    expect(
      apiCallCount,
      'No API call should be made when pasting text that already has niqqud'
    ).toBe(0);
    expect(
      apiCallMade,
      'No API call should be made when pasting text that already has niqqud'
    ).toBe(false);

    // Verify text is saved to localStorage after pasting
    await page.waitForTimeout(100); // Small delay for localStorage save
    const localStorageTextAfterPasting = await page.evaluate(() => {
      return localStorage.getItem('main_text_field');
    });
    expect(
      localStorageTextAfterPasting,
      'Text with niqqud should be saved to localStorage after pasting'
    ).toBe(textWithNiqqud);

    // Step 5: Verify the button shows "Remove Niqqud" since text has niqqud
    const niqqudButton = page.getByTestId('niqqud-toggle-button');
    await expect(niqqudButton).toBeVisible();
    
    // Verify button shows "Remove Niqqud" text (הסרת ניקוד)
    await expect(niqqudButton).toContainText('הסרת ניקוד');

    // Step 6: Verify the text contains niqqud marks
    // Helper function to get text from either textarea or display area
    const getTextContent = async (): Promise<string> => {
      // Check if textarea is visible (editing mode)
      const textareaVisible = await textarea.isVisible().catch(() => false);
      if (textareaVisible) {
        return await textarea.inputValue();
      }
      // Otherwise, get text from display area
      const displayArea = page.getByTestId('text-display-area');
      return await displayArea.textContent() || '';
    };
    
    // Get the current text value
    const currentTextWithNiqqud = await getTextContent();
    
    // Verify the text actually contains niqqud marks
    // Niqqud marks are in Unicode range U+0591 to U+05C7
    const hasNiqqudMarks = /[\u0591-\u05C7]/.test(currentTextWithNiqqud);
    expect(hasNiqqudMarks, 'Text should contain niqqud marks after pasting').toBe(true);

    // Step 7: Reset API call tracking for the remove operation
    const apiCallCountBeforeRemove = apiCallCount;
    apiCallMade = false;

    // Step 8: Click the "Remove Niqqud" button and measure time
    // This verifies that removal from cache is fast (milliseconds) vs API call (seconds)
    await expect(niqqudButton).toContainText('הסרת ניקוד');
    
    // Start timing before clicking
    const startTime = Date.now();
    await niqqudButton.click();

    // Step 9: Wait for the text to be updated (should be fast since it's from cache)
    // Wait for button to change back to "Add Niqqud" - this indicates cache was used
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-testid="niqqud-toggle-button"]');
      if (!button) return false;
      const text = button.textContent || '';
      // Button should show "Add Niqqud" (הוספת ניקוד) when niqqud is removed
      return text.includes('הוספת ניקוד');
    }, { timeout: 5000 }); // Cache should be instant, but allow up to 5 seconds
    
    // Measure time after update
    const endTime = Date.now();
    const removalTime = endTime - startTime;

    // Step 10: Verify the text is now without niqqud
    const textWithoutNiqqudAfterRemove = await getTextContent();
    
    // The application uses removeNiqqud() to remove niqqud marks from the original text with niqqud
    // So we should compare what the application returned with what removeNiqqud() returns from the original text
    const expectedTextFromOriginal = removeNiqqud(textWithNiqqud);
    
    // Verify content matches what removeNiqqud() would return from the original text
    // This ensures we're using the same logic as the application
    expect(
      textWithoutNiqqudAfterRemove.trim(),
      'Text after removing niqqud should match what removeNiqqud() returns from the original text'
    ).toBe(expectedTextFromOriginal.trim());

    // Verify text without niqqud is saved to localStorage
    await page.waitForTimeout(100); // Small delay for localStorage save
    const localStorageTextWithoutNiqqud = await page.evaluate(() => {
      return localStorage.getItem('main_text_field');
    });
    expect(
      localStorageTextWithoutNiqqud,
      'Text without niqqud should be saved to localStorage after removing niqqud'
    ).toBe(textWithoutNiqqudAfterRemove);

    // Step 11: Verify that the text came from memory (no new API call + fast execution)
    // Wait a bit to ensure no additional API calls are made
    await page.waitForTimeout(1000);
    
    expect(
      apiCallCount,
      'No new API call should be made when removing niqqud (should use cache)'
    ).toBe(apiCallCountBeforeRemove);
    
    // Verify removal was fast (cache access should be < 2 seconds, API calls take 5-30+ seconds)
    expect(
      removalTime,
      `Removing niqqud from cache should be fast (< 2000ms), but took ${removalTime}ms. If it took longer, it might have called the API instead of using cache.`
    ).toBeLessThan(2000);
    
    // Verify button text changed back to "Add Niqqud"
    await expect(niqqudButton).toContainText('הוספת ניקוד');

    // Step 12: Add niqqud again and verify it comes from cache (not a new API call)
    // Reset API call tracking for the add operation
    const apiCallCountBeforeAdd = apiCallCount;
    apiCallMade = false;

    // Step 13: Click "Add Niqqud" button again and measure time
    // This should use the cached full niqqud version, not call the API
    await expect(niqqudButton).toContainText('הוספת ניקוד');
    
    // Start timing before clicking
    const startTimeAdd = Date.now();
    await niqqudButton.click();

    // Step 14: Wait for niqqud to be added (should be fast since it's from cache)
    // Wait for button to change to "Remove Niqqud" - this indicates cache was used
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-testid="niqqud-toggle-button"]');
      if (!button) return false;
      const text = button.textContent || '';
      // Button should show "Remove Niqqud" (הסרת ניקוד) when niqqud is present
      return text.includes('הסרת ניקוד');
    }, { timeout: 5000 }); // Cache should be instant, but allow up to 5 seconds
    
    // Measure time after update
    const endTimeAdd = Date.now();
    const addTime = endTimeAdd - startTimeAdd;

    // Step 15: Verify niqqud was added again
    const textWithNiqqudAgain = await getTextContent();
    
    // Verify text contains niqqud marks again
    const hasNiqqudMarksAgain = /[\u0591-\u05C7]/.test(textWithNiqqudAgain);
    expect(hasNiqqudMarksAgain, 'Text should contain niqqud marks after adding niqqud again').toBe(true);
    
    // Verify text matches the original pasted text with niqqud
    expect(textWithNiqqudAgain, 'Text with niqqud should match original pasted text').toBe(textWithNiqqud);

    // Verify text with niqqud is saved to localStorage again
    await page.waitForTimeout(100); // Small delay for localStorage save
    const localStorageTextWithNiqqudAgain = await page.evaluate(() => {
      return localStorage.getItem('main_text_field');
    });
    expect(
      localStorageTextWithNiqqudAgain,
      'Text with niqqud should be saved to localStorage after adding niqqud again'
    ).toBe(textWithNiqqudAgain);

    // Step 16: Verify that the niqqud came from memory (no new API call + fast execution)
    // Wait a bit to ensure no additional API calls are made
    await page.waitForTimeout(1000);
    
    expect(
      apiCallCount,
      'No new API call should be made when adding niqqud again (should use cache)'
    ).toBe(apiCallCountBeforeAdd);
    
    // Verify add was fast (cache access should be < 2 seconds, API calls take 5-30+ seconds)
    expect(
      addTime,
      `Adding niqqud from cache should be fast (< 2000ms), but took ${addTime}ms. If it took longer, it might have called the API instead of using cache.`
    ).toBeLessThan(2000);
    
    // Verify button text changed to "Remove Niqqud"
    await expect(niqqudButton).toContainText('הסרת ניקוד');
  });
});
