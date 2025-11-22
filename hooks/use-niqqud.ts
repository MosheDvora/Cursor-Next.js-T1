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
    // Only update if initialText actually changed and it's not the same as our current internal text
    // This prevents resetting cache when the parent component updates with the text we just set
    if (initialText !== previousTextRef.current && initialText !== text) {
      setText(initialText);
      previousTextRef.current = initialText;

      // Initialize cache based on the new text
      const currentNiqqudStatus = detectNiqqud(initialText);
      const hasNiqqud = currentNiqqudStatus !== "none";

      if (hasNiqqud) {
        // If pasted text has niqqud (partial or full), it becomes the original
        setCache({
          clean: removeNiqqud(initialText),
          original: initialText,
          full: initialText // If initial text has niqqud, we assume it's "full" for now, until API provides a better one
        });
      } else {
        // If pasted text has no niqqud
        setCache({
          clean: initialText,
          original: initialText,
          full: null
        });
      }
    } else if (initialText !== previousTextRef.current) {
      // Just update the ref if it matches our current text (sync)
      previousTextRef.current = initialText;
    }
  }, [initialText, text]);

  // Detect current niqqud status
  const niqqudStatus = detectNiqqud(text);
  const hasNiqqud = niqqudStatus !== "none";

  // Get button text based on status
  const getButtonText = useCallback(() => {
    if (hasNiqqud) {
      return "הסרת ניקוד";
    }
    // If clean
    if (cache) {
      // If we have cache, it means we removed niqqud, so we can "Return" it
      return "החזרת ניקוד";
    }
    // Fresh clean text
    return "הוספת ניקוד";
  }, [hasNiqqud, cache]);

  // Add niqqud to text (Full Niqqud Flow)
  const addFullNiqqud = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if we already have full niqqud cached
      if (cache?.full) {
        setText(cache.full);
        setIsLoading(false);
        return;
      }

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

      // Use the clean text for the API call to ensure consistent full niqqud
      const textToNiqqud = cache?.clean || removeNiqqud(text);

      // Call API to add niqqud
      const result = await addNiqqudService(textToNiqqud, {
        apiKey,
        model,
        temperature: settings.niqqudTemperature,
      });

      if (!result.success || !result.niqqudText) {
        setError(result.error || "שגיאה בהוספת ניקוד");
        setIsLoading(false);
        return;
      }

      // Validate result
      if (!checkHasNiqqud(result.niqqudText)) {
        setError("המודל החזיר טקסט ללא ניקוד");
        setIsLoading(false);
        return;
      }

      // Update cache with full niqqud
      setCache(prev => ({
        clean: prev?.clean || textToNiqqud,
        original: prev?.original || text, // Keep existing original
        full: result.niqqudText || null
      }));

      setText(result.niqqudText);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
      setIsLoading(false);
    }
  }, [text, cache]);

  // Toggle Niqqud Logic
  const toggleNiqqud = useCallback(async () => {
    if (hasNiqqud) {
      // If text has niqqud -> Remove it (go to clean)
      if (cache?.clean) {
        setText(cache.clean);
      } else {
        const clean = removeNiqqud(text);
        setCache(prev => ({
          clean,
          original: prev?.original || text,
          full: prev?.full || null
        }));
        setText(clean);
      }
    } else {
      // If text has NO niqqud -> Add it
      // Logic:
      // 1. If we have Full cached -> Go to Full
      // 2. If Original was Partial -> Go to Original
      // 3. If Original was Clean -> Call API (Full)

      if (cache?.full) {
        setText(cache.full);
        return;
      }

      const originalType = cache?.original ? detectNiqqud(cache.original) : "none";

      if (originalType === "partial" || originalType === "full") {
        // Restore original (Partial or Full)
        setText(cache!.original);
      } else {
        // Original was clean (or no cache), so we need Full Niqqud
        await addFullNiqqud();
      }
    }
  }, [hasNiqqud, cache, text, addFullNiqqud]);

  // Restore Original Text
  const restoreOriginal = useCallback(() => {
    if (cache?.original) {
      setText(cache.original);
    }
  }, [cache]);

  // Clear niqqud cache and reset state
  const clearNiqqud = useCallback(() => {
    setCache(null);
    setError(null);
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
    addFullNiqqud,
    restoreOriginal,
    clearNiqqud,
    clearError: () => setError(null),
    cache, // Expose cache for UI decisions
  };
}
