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

  // Update when initialText changes externally
  useEffect(() => {
    if (initialText !== previousTextRef.current) {
      setText(initialText);
      previousTextRef.current = initialText;
      // Clear cache if text changed significantly
      if (cache && initialText !== cache.original && initialText !== cache.niqqud) {
        setCache(null);
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

      const currentText = text;

      // Check if we have cached version
      if (cache && cache.original === currentText) {
        // Use cached niqqud version
        setText(cache.niqqud);
        setIsLoading(false);
        return;
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

      // Update text to niqqud version
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
    if (!cache) {
      // If no cache, try to remove niqqud directly
      const textWithoutNiqqud = removeNiqqud(text);
      setText(textWithoutNiqqud);
      return;
    }

    // Restore from cache
    setText(cache.original);
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
