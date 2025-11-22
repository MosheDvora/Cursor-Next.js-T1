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
  clean: string;      // טקסט ללא ניקוד
  original: string;   // הטקסט כפי שהוזן (יכול להיות חלקי/מלא/נקי)
  full: string | null;// טקסט עם ניקוד מלא מהמודל
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
        const normalizedFull = cache.full?.trim();
        const normalizedClean = cache.clean.trim();

        // Only clear cache if the new text doesn't match any cached version
        if (
          normalizedInitial !== normalizedOriginal &&
          normalizedInitial !== normalizedFull &&
          normalizedInitial !== normalizedClean
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
  const addNiqqud = useCallback(async (forceFull: boolean = false) => {
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
      if (cache && !forceFull) {
        // Normalize text for comparison (trim whitespace)
        const normalizedCurrent = currentText.trim();
        const normalizedOriginal = cache.original.trim();
        const normalizedFull = cache.full?.trim();

        if (normalizedOriginal === normalizedCurrent && cache.full) {
          // Current text is original, use cached full version
          setText(cache.full);
          setIsLoading(false);
          return;
        }
        if (normalizedFull === normalizedCurrent) {
          // Current text already matches cached full version
          setIsLoading(false);
          return;
        }
      }

      // If forceFull is true, or we don't have cache, or cache doesn't match
      // We need to call the API

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
      try {
        const hasNiqqudResult = checkHasNiqqud(result.niqqudText);

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

      // Prepare new cache
      const cleanText = removeNiqqud(currentText);

      const newCache: NiqqudCache = {
        clean: cleanText,
        original: cache?.original || currentText, // Keep original if exists, otherwise current is original
        full: result.niqqudText,
      };

      // If we are forcing full niqqud on already niqqud-ed text, 
      // we might want to update original only if it's not set or if we are starting fresh?
      // Actually, if we have cache, we should probably keep the 'original' from the cache 
      // unless the current text is significantly different (which is handled by the useEffect clearing cache).
      // So `cache?.original || currentText` seems correct.

      setCache(newCache);

      // Update text to niqqud version
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

    // If we have cache, revert to clean version
    if (cache) {
      setText(cache.clean);
      return;
    }

    // If no cache, create it
    const textWithoutNiqqud = removeNiqqud(currentText);

    setCache({
      clean: textWithoutNiqqud,
      original: currentText, // The current text has niqqud, so it is the original in this context
      full: currentText, // It has niqqud, so we assume it's "full" enough to be cached as such, or at least it's a version with niqqud
    });

    setText(textWithoutNiqqud);
  }, [text, cache]);

  // Toggle niqqud
  const toggleNiqqud = useCallback(async () => {
    if (hasNiqqud) {
      removeNiqqudFromText();
    } else {
      await addNiqqud(false);
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
