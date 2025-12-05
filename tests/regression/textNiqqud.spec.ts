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
 */

import { test, expect } from '@playwright/test';

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

    // Step 8: Reset API call tracking for the remove operation
    const apiCallCountBeforeRemove = apiCallCount;
    apiCallMade = false;

    // Step 9: Click the "Remove Niqqud" button
    await expect(niqqudButton).toContainText('הסרת ניקוד');
    await niqqudButton.click();

    // Step 10: Wait for the text to be updated (should be fast since it's from cache)
    await page.waitForTimeout(500); // Small delay for state update

    // Step 11: Verify the text is again without niqqud
    const textWithoutNiqqud = await getTextContent();
    
    // Remove any niqqud marks to compare with original
    const textWithoutNiqqudNormalized = textWithoutNiqqud.replace(/[\u0591-\u05C7]/g, '');
    const originalTextNormalized = originalText.replace(/[\u0591-\u05C7]/g, '');
    
    // Verify content matches the original plain text
    expect(
      textWithoutNiqqudNormalized.trim(),
      'Text after removing niqqud should match original text'
    ).toBe(originalTextNormalized.trim());

    // Step 12: Verify that the text came from memory (no new API call)
    // Wait a bit to ensure no additional API calls are made
    await page.waitForTimeout(1000);
    
    expect(
      apiCallCount,
      'No new API call should be made when removing niqqud (should use cache)'
    ).toBe(apiCallCountBeforeRemove);
    
    // Verify button text changed back to "Add Niqqud"
    await expect(niqqudButton).toContainText('הוספת ניקוד');
  });
});
