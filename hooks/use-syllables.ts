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
} from "@/lib/syllables";
import { getSettings } from "@/lib/settings";

export function useSyllables(initialText: string = "") {
  const [syllablesData, setSyllablesData] = useState<SyllablesData | null>(
    null
  );
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const previousTextRef = useRef<string>(initialText);

  // Update when initialText changes externally (user typing/pasting)
  useEffect(() => {
    if (initialText !== previousTextRef.current) {
      previousTextRef.current = initialText;
      // Clear syllables data if text changed significantly
      if (syllablesData) {
        const cached = loadSyllablesFromCache(initialText);
        if (!cached) {
          setSyllablesData(null);
          setIsActive(false);
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
        // Don't auto-activate, let user toggle
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

      // Check cache first
      const cached = loadSyllablesFromCache(currentText);
      if (cached) {
        console.log("[useSyllables] Using cached syllables data");
        setSyllablesData(cached);
        setIsActive(true);
        setIsLoading(false);
        return;
      }

      // Call API to divide into syllables
      const result = await divideIntoSyllables(currentText, {
        apiKey: settings.syllablesApiKey,
        model: settings.syllablesModel,
        prompt: settings.syllablesPrompt,
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

      // Save to cache
      saveSyllablesToCache(currentText, result.syllablesData);

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

  // Toggle syllables display
  const toggleSyllables = useCallback(async () => {
    if (isActive) {
      // Deactivate
      setIsActive(false);
    } else {
      // Activate - divide if needed
      if (!syllablesData) {
        await divideSyllables();
      } else {
        setIsActive(true);
      }
    }
  }, [isActive, syllablesData, divideSyllables]);

  // Clear syllables data
  const clearSyllables = useCallback(() => {
    if (initialText) {
      clearSyllablesCache(initialText);
    }
    setSyllablesData(null);
    setIsActive(false);
    setError(null);
  }, [initialText]);

  // Get button text based on status
  const getButtonText = useCallback(() => {
    if (isLoading) {
      return "מעבד...";
    }
    if (isActive) {
      return "הסתר חלוקה להברות";
    }
    return "חלוקה להברות";
  }, [isActive, isLoading]);

  return {
    syllablesData,
    isActive,
    isLoading,
    error,
    rawResponse,
    getButtonText,
    toggleSyllables,
    divideSyllables,
    clearSyllables,
    clearError: () => setError(null),
  };
}

