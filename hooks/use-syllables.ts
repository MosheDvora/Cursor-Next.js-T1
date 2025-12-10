/**
 * Custom hook for managing syllables division state and caching
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { divideIntoSyllables } from "@/services/syllables-service";
import {
  SyllablesData,
  saveSyllablesToCache,
  loadSyllablesFromCache,
  clearSyllablesCache,
  clearAllSyllablesCache,
  loadSyllablesCacheFromStorage,
  saveSyllablesCacheToStorage,
} from "@/lib/syllables";
import { getSettings } from "@/lib/settings";
import { removeNiqqud } from "@/lib/niqqud";

export function useSyllables(initialText: string = "") {
  const [syllablesData, setSyllablesData] = useState<SyllablesData | null>(
    null
  );
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const previousTextRef = useRef<string>(initialText);

  // Load syllables cache from centralized storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return; // Server-side check
    
    try {
      loadSyllablesCacheFromStorage();
    } catch (error) {
      console.error("[useSyllables] Failed to load cache from storage:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Update when initialText changes externally (user typing/pasting)
  // Also handles niqqud mode changes - syllables should persist regardless of display mode
  useEffect(() => {
    if (initialText !== previousTextRef.current) {
      previousTextRef.current = initialText;
      // Clear syllables data if text changed significantly
      // Check both the exact text AND the text without niqqud (since syllable division
      // should be the same for the same word regardless of niqqud display mode)
      if (syllablesData) {
        const cached = loadSyllablesFromCache(initialText);
        if (!cached) {
          // Also check cache without niqqud - syllables should persist when switching
          // between niqqud/clean display modes
          const textWithoutNiqqud = removeNiqqud(initialText);
          const cachedClean = loadSyllablesFromCache(textWithoutNiqqud);
          if (!cachedClean) {
            setSyllablesData(null);
            setIsActive(false);
          }
        }
      }
    }
  }, [initialText, syllablesData]);

  // Load from cache on mount or text change
  useEffect(() => {
    if (initialText && initialText.trim().length > 0) {
      const cached = loadSyllablesFromCache(initialText);
      if (cached) {
        setSyllablesData(cached);
        // Don't auto-activate - user must click button to activate
      }
    } else {
      setSyllablesData(null);
      setIsActive(false);
    }
  }, [initialText]);

  // Divide text into syllables
  const divideSyllables = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const settings = getSettings();

      if (!settings.syllablesApiKey || settings.syllablesApiKey.trim().length === 0) {
        setError("אנא הגדר API Key בהגדרות");
        setIsLoading(false);
        return;
      }

      if (!settings.syllablesModel || settings.syllablesModel.trim().length === 0) {
        setError("אנא בחר מודל שפה בהגדרות");
        setIsLoading(false);
        return;
      }

      if (!settings.syllablesPrompt || settings.syllablesPrompt.trim().length === 0) {
        setError("אנא הגדר פרומפט בהגדרות");
        setIsLoading(false);
        return;
      }

      const currentText = initialText.trim();

      if (!currentText || currentText.length === 0) {
        setError("טקסט ריק");
        setIsLoading(false);
        return;
      }

      // Check cache first - try both current text (with niqqud if present) and original text (without niqqud)
      // Since syllable division is based on niqqud text, the result should be the same for both
      let cached = loadSyllablesFromCache(currentText);
      if (!cached) {
        // Try to find cache for the text without niqqud (original text)
        // This handles the case where niqqud was added but cache exists for the original text
        const textWithoutNiqqud = removeNiqqud(currentText);
        if (textWithoutNiqqud !== currentText) {
          console.log("[useSyllables] Checking cache for text without niqqud");
          cached = loadSyllablesFromCache(textWithoutNiqqud);
          if (cached) {
            console.log("[useSyllables] Found cached syllables data for text without niqqud, using it");
            // Save cache also for the current text (with niqqud) so future lookups are faster
            saveSyllablesToCache(currentText, cached);
          }
        }
      }
      
      if (cached) {
        console.log("[useSyllables] Using cached syllables data");
        setSyllablesData(cached);
        setIsActive(true);
        setIsLoading(false);
        return;
      }

      // Call API to divide into syllables
      // Use the current text (with niqqud if present) for accurate division
      const result = await divideIntoSyllables(currentText, {
        apiKey: settings.syllablesApiKey,
        model: settings.syllablesModel,
        prompt: settings.syllablesPrompt,
        temperature: settings.syllablesTemperature,
      });

      // Save raw response for debugging
      if (result.rawResponse) {
        setRawResponse(result.rawResponse);
      }

      if (!result.success || !result.syllablesData) {
        console.error("[useSyllables] API call failed", {
          success: result.success,
          error: result.error,
          hasSyllablesData: !!result.syllablesData,
        });
        setError(result.error || "שגיאה בחלוקה להברות");
        setIsLoading(false);
        return;
      }

      console.log("[useSyllables] API call successful", {
        originalLength: currentText.length,
        wordsCount: result.syllablesData.words.length,
      });

      // Save to cache for both the current text (with niqqud) and the original text (without niqqud)
      // This ensures we can use the cache even if the text changes between with/without niqqud
      saveSyllablesToCache(currentText, result.syllablesData);
      
      // Also save for the text without niqqud (if different)
      // Since syllable division is based on niqqud, the result is the same for both
      const textWithoutNiqqud = removeNiqqud(currentText);
      if (textWithoutNiqqud !== currentText) {
        console.log("[useSyllables] Saving cache also for text without niqqud");
        saveSyllablesToCache(textWithoutNiqqud, result.syllablesData);
      }

      // Save to centralized storage for future sync with Supabase
      saveSyllablesCacheToStorage();

      // Update state
      setSyllablesData(result.syllablesData);
      setIsActive(true);
      setIsLoading(false);
    } catch (err) {
      console.error("[useSyllables] Unexpected error in divideSyllables", err);
      setError(
        err instanceof Error ? err.message : "שגיאה לא צפויה בחלוקה להברות"
      );
      setIsLoading(false);
    }
  }, [initialText]);

  // Clear syllables data
  const clearSyllables = useCallback(() => {
    if (initialText) {
      clearSyllablesCache(initialText);
    }
    // Also clear all cache entries to ensure complete cleanup
    clearAllSyllablesCache();
    setSyllablesData(null);
    setIsActive(false);
    setError(null);
    setRawResponse(null);
  }, [initialText]);

  // Get button text - always returns action text (not toggle)
  const getButtonText = useCallback(() => {
    if (isLoading) {
      return "מעבד...";
    }
    return "חלוקה להברות";
  }, [isLoading]);

  return {
    syllablesData,
    isActive,
    isLoading,
    error,
    rawResponse,
    getButtonText,
    divideSyllables,
    clearSyllables,
    clearError: () => setError(null),
  };
}

