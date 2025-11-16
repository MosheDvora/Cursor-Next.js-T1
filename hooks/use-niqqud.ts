/**
 * Custom hook for managing niqqud text state and caching
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { detectNiqqud, removeNiqqud } from "@/lib/niqqud";
import { addNiqqud as addNiqqudService } from "@/services/niqqud-service";
import { getSettings } from "@/lib/settings";

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

      if (!settings.apiKey) {
        setError("אנא הגדר API Key בהגדרות");
        setIsLoading(false);
        return;
      }

      if (!settings.model) {
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
        apiKey: settings.apiKey,
        model: settings.model,
      });

      if (!result.success || !result.niqqudText) {
        setError(result.error || "שגיאה בהוספת ניקוד");
        setIsLoading(false);
        return;
      }

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
    clearError: () => setError(null),
  };
}
