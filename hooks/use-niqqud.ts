/**
 * Custom hook for managing niqqud text state and caching
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { detectNiqqud, removeNiqqud, hasNiqqud as checkHasNiqqud } from "@/lib/niqqud";
import { addNiqqud as addNiqqudService } from "@/services/niqqud-service";
import { getSettings } from "@/lib/settings";

// Debug: Verify imports
if (typeof checkHasNiqqud !== "function") {
  console.error("[useNiqqud] checkHasNiqqud is not a function!", typeof checkHasNiqqud);
}
if (typeof removeNiqqud !== "function") {
  console.error("[useNiqqud] removeNiqqud is not a function!", typeof removeNiqqud);
}

interface NiqqudCache {
  original: string;
  niqqud: string;
}

export function useNiqqud(initialText: string = "") {
  const [text, setText] = useState(initialText);
  const [cache, setCache] = useState<NiqqudCache | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousTextRef = useRef<string>(initialText);

  // Update when initialText changes externally (user typing/pasting)
  useEffect(() => {
    if (initialText !== previousTextRef.current) {
      setText(initialText);
      previousTextRef.current = initialText;
      // Clear cache if text changed significantly (not just niqqud toggle)
      if (cache) {
        const normalizedInitial = initialText.trim();
        const normalizedOriginal = cache.original.trim();
        const normalizedNiqqud = cache.niqqud.trim();
        
        // Only clear cache if the new text doesn't match either cached version
        if (
          normalizedInitial !== normalizedOriginal &&
          normalizedInitial !== normalizedNiqqud
        ) {
          setCache(null);
        }
      }
    }
  }, [initialText, cache]);

  // Detect current niqqud status
  const niqqudStatus = detectNiqqud(text);
  const hasNiqqud = niqqudStatus !== "none";

  // Get button text based on status
  const getButtonText = useCallback(() => {
    if (hasNiqqud) {
      return "הסרת ניקוד";
    }
    return "הוספת ניקוד";
  }, [hasNiqqud]);

  // Add niqqud to text
  const addNiqqud = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const settings = getSettings();

      const apiKey = settings.niqqudApiKey || settings.apiKey;
      const model = settings.niqqudModel || settings.model;
      
      if (!apiKey) {
        setError("אנא הגדר API Key בהגדרות");
        setIsLoading(false);
        return;
      }

      if (!model) {
        setError("אנא בחר מודל שפה בהגדרות");
        setIsLoading(false);
        return;
      }

      // Use the latest text value - get it fresh from state
      const currentText = text;

      // Check if we have cached version
      // Try both directions: if current text matches original OR niqqud version
      if (cache) {
        // Normalize text for comparison (trim whitespace)
        const normalizedCurrent = currentText.trim();
        const normalizedOriginal = cache.original.trim();
        const normalizedNiqqud = cache.niqqud.trim();

        if (normalizedOriginal === normalizedCurrent) {
          // Current text is original, use cached niqqud version
          const niqqudVersion = cache.niqqud;
          setText(niqqudVersion);
          setIsLoading(false);
          // Force update by also updating initialText through the returned setText
          return;
        }
        if (normalizedNiqqud === normalizedCurrent) {
          // Current text already matches cached niqqud version
          setIsLoading(false);
          return;
        }
      }

      // Call API to add niqqud
      const result = await addNiqqudService(currentText, {
        apiKey,
        model,
        temperature: settings.niqqudTemperature,
      });

      if (!result.success || !result.niqqudText) {
        console.error("[useNiqqud] API call failed", {
          success: result.success,
          error: result.error,
          hasNiqqudText: !!result.niqqudText,
        });
        setError(result.error || "שגיאה בהוספת ניקוד");
        setIsLoading(false);
        return;
      }

      console.log("[useNiqqud] API call successful", {
        originalLength: currentText.length,
        niqqudLength: result.niqqudText.length,
      });

      // Double-check that the returned text actually has niqqud
      // (additional validation in case API service validation missed something)
      try {
        const hasNiqqudResult = checkHasNiqqud(result.niqqudText);
        console.log("[useNiqqud] Validation check", {
          hasNiqqud: hasNiqqudResult,
          textLength: result.niqqudText.length,
          textPreview: result.niqqudText.substring(0, 50),
        });

        if (!hasNiqqudResult) {
          console.error("[useNiqqud] Text does not have niqqud after API call");
          setError(
            "המודל החזיר טקסט ללא ניקוד. נסה שוב או בחר מודל אחר"
          );
          setIsLoading(false);
          return;
        }
      } catch (validationError) {
        console.error("[useNiqqud] Validation error", validationError);
        setError(
          `שגיאה בוולידציה: ${validationError instanceof Error ? validationError.message : "שגיאה לא צפויה"}`
        );
        setIsLoading(false);
        return;
      }

      // Verify that niqqud was actually added (text should be different)
      const normalizedOriginal = removeNiqqud(currentText.trim());
      const normalizedReturned = removeNiqqud(result.niqqudText.trim());
      
      // If texts are the same after removing niqqud, but returned has niqqud, that's good
      // If returned text doesn't have niqqud, we already checked above
      // So if we reach here, niqqud was successfully added

      // Cache the original and niqqud versions
      const newCache = {
        original: currentText,
        niqqud: result.niqqudText,
      };
      setCache(newCache);

      // Update text to niqqud version - this will trigger useEffect in page.tsx
      setText(result.niqqudText);
      setIsLoading(false);
    } catch (err) {
      console.error("[useNiqqud] Unexpected error in addNiqqud", err);
      setError(
        err instanceof Error ? err.message : "שגיאה לא צפויה בהוספת ניקוד"
      );
      setIsLoading(false);
    }
  }, [text, cache]);

  // Remove niqqud from text
  const removeNiqqudFromText = useCallback(() => {
    const currentText = text;
    
    // Normalize for comparison
    const normalizedCurrent = currentText.trim();
    
    // If we have cache and current text matches the niqqud version, restore original
    if (cache) {
      const normalizedNiqqud = cache.niqqud.trim();
      if (normalizedNiqqud === normalizedCurrent) {
        setText(cache.original);
        return;
      }
    }

    // If no cache or text doesn't match cache, create new cache
    // This handles the case where user pastes text with niqqud and wants to remove it
    const textWithoutNiqqud = removeNiqqud(currentText);
    
    // Cache both versions: original (without niqqud) and niqqud (with niqqud)
    setCache({
      original: textWithoutNiqqud,
      niqqud: currentText, // The current text has niqqud
    });
    
    // Set text to version without niqqud
    setText(textWithoutNiqqud);
  }, [text, cache]);

  // Toggle niqqud
  const toggleNiqqud = useCallback(async () => {
    if (hasNiqqud) {
      removeNiqqudFromText();
    } else {
      await addNiqqud();
    }
  }, [hasNiqqud, addNiqqud, removeNiqqudFromText]);

  // Clear niqqud cache and reset state
  const clearNiqqud = useCallback(() => {
    setCache(null);
    setError(null);
    // Reset text to empty string
    setText("");
    previousTextRef.current = "";
  }, []);

  return {
    text,
    setText,
    hasNiqqud,
    niqqudStatus,
    isLoading,
    error,
    getButtonText,
    toggleNiqqud,
    addNiqqud,
    removeNiqqud: removeNiqqudFromText,
    clearNiqqud,
    clearError: () => setError(null),
  };
}
