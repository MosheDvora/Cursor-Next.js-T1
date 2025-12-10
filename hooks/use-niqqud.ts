/**
 * Custom hook for managing niqqud text state and caching
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { detectNiqqud, removeNiqqud, hasNiqqud as checkHasNiqqud } from "@/lib/niqqud";
import { addNiqqud as addNiqqudService } from "@/services/niqqud-service";
import { getSettings, SETTINGS_KEYS } from "@/lib/settings";

// Debug: Verify imports
if (typeof checkHasNiqqud !== "function") {
  console.error("[useNiqqud] checkHasNiqqud is not a function!", typeof checkHasNiqqud);
}
if (typeof removeNiqqud !== "function") {
  console.error("[useNiqqud] removeNiqqud is not a function!", typeof removeNiqqud);
}

interface NiqqudCache {
  original: string;     // Original text as entered (may have partial/full/no niqqud)
  clean: string;        // Text without any niqqud
  full: string | null;  // Fully niqqud-ed text from model (null if not yet requested)
}

type DisplayMode = 'original' | 'clean' | 'full';

export function useNiqqud(initialText: string = "") {
  const [text, setText] = useState(initialText);
  const [cache, setCache] = useState<NiqqudCache | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('original');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousTextRef = useRef<string>(initialText);

  const [targetState, setTargetState] = useState<'original' | 'full'>('original');
  
  // Last display state to preserve the user's preferred view after model operations
  const [lastDisplayState, setLastDisplayState] = useState<DisplayMode | null>(null);

  // Load cache and last display state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return; // Server-side check

    try {
      // Load niqqud cache
      const original = localStorage.getItem(SETTINGS_KEYS.NIQQUD_CACHE_ORIGINAL);
      const clean = localStorage.getItem(SETTINGS_KEYS.NIQQUD_CACHE_CLEAN);
      const full = localStorage.getItem(SETTINGS_KEYS.NIQQUD_CACHE_FULL);

      // Need at least original and clean to have valid cache
      if (original && clean) {
        // Verify cache matches current text (if text exists)
        // If initialText is empty or matches one of the cache versions, load it
        if (!initialText ||
            original === initialText ||
            clean === initialText ||
            full === initialText) {
          setCache({
            original,
            clean,
            full: full || null
          });
          
          // Restore display mode based on which version matches
          if (initialText) {
            if (full === initialText) {
              setDisplayMode('full');
            } else if (clean === initialText) {
              setDisplayMode('clean');
            } else if (original === initialText) {
              setDisplayMode('original');
            }
          }
        }
      }

      // Load last display state
      const savedLastDisplayState = localStorage.getItem(SETTINGS_KEYS.LAST_DISPLAY_STATE);
      if (savedLastDisplayState && (savedLastDisplayState === 'original' || savedLastDisplayState === 'clean' || savedLastDisplayState === 'full')) {
        const savedMode = savedLastDisplayState as DisplayMode;
        setLastDisplayState(savedMode);
        // Restore the last display state if we loaded cache
        if (original && clean) {
          // We already set display mode above based on text match, but if we have a saved preference, use it
          setDisplayMode(savedMode);
        }
      }
    } catch (error) {
      console.error("[useNiqqud] Failed to load cache from localStorage:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  // Update when initialText changes externally (user typing/pasting)
  useEffect(() => {
    if (initialText !== previousTextRef.current) {
      setText(initialText);
      previousTextRef.current = initialText;

      const currentStatus = detectNiqqud(initialText);
      const normalizedInitial = initialText.trim();

      // If input has full niqqud, cache it immediately
      if (currentStatus === 'full') {
        // If we already have this full text cached, don't overwrite original
        // This preserves 'partial' status when syncing back from completion
        if (cache && cache.full === initialText) {
          if (displayMode !== 'full') setDisplayMode('full');
          if (targetState !== 'full') setTargetState('full');
        } else {
          const cleanText = removeNiqqud(initialText);
          setCache({
            original: initialText,
            clean: cleanText,
            full: initialText
          });
          setDisplayMode('full');
          setTargetState('full');
        }
      }
      // If we have cache, check if we should clear it or keep it
      else if (cache) {
        const normalizedOriginal = cache.original.trim();
        const normalizedClean = cache.clean.trim();
        const normalizedFull = cache.full?.trim() || "";

        // Only clear cache if the new text doesn't match any cached version
        if (
          normalizedInitial !== normalizedOriginal &&
          normalizedInitial !== normalizedClean &&
          normalizedInitial !== normalizedFull
        ) {
          setCache(null);
          setDisplayMode('original');
          // If text is clean, we want to add niqqud (full). If partial, restore original.
          setTargetState(currentStatus === 'none' ? 'full' : 'original');
        }
      } else {
        // No cache and not full niqqud - reset
        setDisplayMode('original');
        // If text is clean, we want to add niqqud (full). If partial, restore original.
        setTargetState(currentStatus === 'none' ? 'full' : 'original');
      }
    }
  }, [initialText, cache]);

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return; // Server-side check

    try {
      if (cache) {
        localStorage.setItem(SETTINGS_KEYS.NIQQUD_CACHE_ORIGINAL, cache.original);
        localStorage.setItem(SETTINGS_KEYS.NIQQUD_CACHE_CLEAN, cache.clean);
        if (cache.full) {
          localStorage.setItem(SETTINGS_KEYS.NIQQUD_CACHE_FULL, cache.full);
        } else {
          localStorage.removeItem(SETTINGS_KEYS.NIQQUD_CACHE_FULL);
        }
      } else {
        // Clear all cache keys
        localStorage.removeItem(SETTINGS_KEYS.NIQQUD_CACHE_ORIGINAL);
        localStorage.removeItem(SETTINGS_KEYS.NIQQUD_CACHE_CLEAN);
        localStorage.removeItem(SETTINGS_KEYS.NIQQUD_CACHE_FULL);
      }
    } catch (error) {
      console.error("[useNiqqud] Failed to save cache to localStorage:", error);
    }
  }, [cache]);

  // Save last display state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return; // Server-side check

    try {
      if (lastDisplayState) {
        localStorage.setItem(SETTINGS_KEYS.LAST_DISPLAY_STATE, lastDisplayState);
      } else {
        localStorage.removeItem(SETTINGS_KEYS.LAST_DISPLAY_STATE);
      }
    } catch (error) {
      console.error("[useNiqqud] Failed to save last display state to localStorage:", error);
    }
  }, [lastDisplayState]);

  // Detect current niqqud status
  const niqqudStatus = detectNiqqud(text);
  const hasNiqqud = niqqudStatus !== "none";

  // Detect original text niqqud status if we have cache
  const originalStatus = cache ? detectNiqqud(cache.original) : niqqudStatus;

  // Get button text based on status
  const getButtonText = useCallback(() => {
    if (hasNiqqud) {
      return "הסרת ניקוד";
    }
    // If clean, button should indicate restoring to target state
    return targetState === 'full' ? "הוספת ניקוד" : "החזרת ניקוד";
  }, [hasNiqqud, targetState]);

  // Add niqqud to text (for text with no niqqud)
  const addNiqqud = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Save current display mode as last display state before model operation
    // This allows us to restore it after getting the result
    if (!lastDisplayState) {
      setLastDisplayState(displayMode);
    }

    try {
      const settings = getSettings();

      const apiKey = settings.niqqudApiKey || settings.apiKey;
      const model = settings.niqqudModel || settings.model;
      const systemPrompt = settings.niqqudSystemPrompt;
      const userPrompt = settings.niqqudUserPrompt;

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

      const currentText = text;

      // Check if we have cached full niqqud version
      if (cache && cache.full) {
        // If we have a full niqqud version in cache, use it
        setText(cache.full);
        setDisplayMode('full');
        setTargetState('full');
        setIsLoading(false);
        return;
      }

      // Call API to add niqqud
      const result = await addNiqqudService(currentText, {
        apiKey,
        model,
        temperature: settings.niqqudTemperature,
        systemPrompt,
        userPrompt,
      });

      if (!result.success || !result.niqqudText) {
        console.error("[useNiqqud] addNiqqud API call failed", {
          success: result.success,
          error: result.error,
        });
        setError(result.error || "שגיאה בהוספת ניקוד");
        setIsLoading(false);
        return;
      }

      console.log("[useNiqqud] API call successful", {
        originalLength: currentText.length,
        niqqudLength: result.niqqudText.length,
      });

      // Validate that the returned text actually has niqqud
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

      // Cache the three states
      const cleanText = removeNiqqud(currentText);
      const newCache: NiqqudCache = {
        original: currentText,
        clean: cleanText,
        full: result.niqqudText,
      };
      setCache(newCache);

      // After getting result from model, restore to the last display state
      // If no lastDisplayState exists, default to 'full' since we just added niqqud
      const newDisplayMode = lastDisplayState || 'full';
      if (!lastDisplayState) {
        setLastDisplayState('full');
      }

      // Update text to niqqud version and set display mode
      setText(result.niqqudText);
      setDisplayMode(newDisplayMode);
      setTargetState('full');
      setIsLoading(false);
    } catch (err) {
      console.error("[useNiqqud] Unexpected error in addNiqqud", err);
      setError(
        err instanceof Error ? err.message : "שגיאה לא צפויה בהוספת ניקוד"
      );
      setIsLoading(false);
    }
  }, [text, cache, displayMode, lastDisplayState]);

  // Remove niqqud from text
  const removeNiqqudFromText = useCallback(() => {
    const currentText = text;

    // If we have cache with clean version, use it
    if (cache && cache.clean) {
      setText(cache.clean);
      setDisplayMode('clean');
      // Save this as the last display state
      setLastDisplayState('clean');
      return;
    }

    // If no cache, create new cache with all three states
    const textWithoutNiqqud = removeNiqqud(currentText);
    const newCache: NiqqudCache = {
      original: currentText,
      clean: textWithoutNiqqud,
      full: null, // Not yet requested
    };
    setCache(newCache);

    // Set text to version without niqqud
    setText(textWithoutNiqqud);
    setDisplayMode('clean');
    // Save this as the last display state
    setLastDisplayState('clean');
  }, [text, cache]);

  // Complete partial niqqud (for text that already has some niqqud)
  const completeNiqqud = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Save current display mode as last display state before model operation
    // This allows us to restore it after getting the result
    if (!lastDisplayState) {
      setLastDisplayState(displayMode);
    }

    try {
      const settings = getSettings();

      const apiKey = settings.niqqudApiKey || settings.apiKey;
      const model = settings.niqqudModel || settings.model;
      const systemPrompt = settings.niqqudCompletionSystemPrompt;
      const userPrompt = settings.niqqudCompletionUserPrompt;

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

      const currentText = text;

      // Check if we already have full niqqud in cache
      if (cache && cache.full) {
        setText(cache.full);
        setDisplayMode('full');
        setTargetState('full');
        setIsLoading(false);
        return;
      }

      //Call API to complete niqqud (send text with partial niqqud)
      const result = await addNiqqudService(currentText, {
        apiKey,
        model,
        temperature: settings.niqqudTemperature,
        systemPrompt,
        userPrompt,
      });

      if (!result.success || !result.niqqudText) {
        console.error("[useNiqqud] completeNiqqud API call failed", {
          success: result.success,
          error: result.error,
        });
        setError(result.error || "שגיאה בהשלמת ניקוד");
        setIsLoading(false);
        return;
      }

      // Validate returned text has niqqud
      if (!checkHasNiqqud(result.niqqudText)) {
        setError("המודל החזיר טקסט ללא ניקוד מלא");
        setIsLoading(false);
        return;
      }

      // Update cache with full niqqud version
      const cleanText = removeNiqqud(currentText);
      const newCache: NiqqudCache = {
        original: cache?.original || currentText,
        clean: cache?.clean || cleanText,
        full: result.niqqudText,
      };
      setCache(newCache);

      // After getting result from model, restore to the last display state
      // If no lastDisplayState exists, default to 'full' since we just completed niqqud
      const newDisplayMode = lastDisplayState || 'full';
      if (!lastDisplayState) {
        setLastDisplayState('full');
      }

      setText(result.niqqudText);
      setDisplayMode(newDisplayMode);
      setTargetState('full');
      setIsLoading(false);
    } catch (err) {
      console.error("[useNiqqud] Unexpected error in completeNiqqud", err);
      setError(
        err instanceof Error ? err.message : "שגיאה לא צפויה בהשלמת ניקוד"
      );
      setIsLoading(false);
    }
  }, [text, cache, displayMode, lastDisplayState]);

  // Switch to original text
  const switchToOriginal = useCallback(() => {
    if (cache && cache.original) {
      setText(cache.original);
      setDisplayMode('original');
      setTargetState('original');
      // Save this as the last display state
      setLastDisplayState('original');
    }
  }, [cache]);

  // Switch to clean text (no niqqud)
  const switchToClean = useCallback(() => {
    if (cache && cache.clean) {
      setText(cache.clean);
      setDisplayMode('clean');
      // Save this as the last display state
      setLastDisplayState('clean');
    }
  }, [cache]);

  // Switch to full niqqud text
  const switchToFull = useCallback(() => {
    if (cache && cache.full) {
      setText(cache.full);
      setDisplayMode('full');
      setTargetState('full');
      // Save this as the last display state
      setLastDisplayState('full');
    }
  }, [cache]);

  // Restore last display state
  const restoreLastDisplayState = useCallback(() => {
    if (lastDisplayState && cache) {
      if (lastDisplayState === 'original' && cache.original) {
        setText(cache.original);
        setDisplayMode('original');
        setTargetState('original');
      } else if (lastDisplayState === 'clean' && cache.clean) {
        setText(cache.clean);
        setDisplayMode('clean');
      } else if (lastDisplayState === 'full' && cache.full) {
        setText(cache.full);
        setDisplayMode('full');
        setTargetState('full');
      }
    }
  }, [lastDisplayState, cache]);

  // Toggle niqqud based on current state and target state
  const toggleNiqqud = useCallback(async () => {
    if (hasNiqqud) {
      // If has niqqud, remove it (go to clean)
      removeNiqqudFromText();
    } else {
      // If clean, restore to target state
      if (targetState === 'full') {
        if (cache && cache.full) {
          switchToFull();
        } else {
          // If target is full but no cache, add/complete niqqud
          // If original was partial, complete it. Else add fresh.
          if (originalStatus === 'partial') {
            await completeNiqqud();
          } else {
            await addNiqqud();
          }
        }
      } else {
        // Target is original (partial)
        switchToOriginal();
      }
    }
  }, [hasNiqqud, targetState, cache, originalStatus, removeNiqqudFromText, switchToFull, switchToOriginal, completeNiqqud, addNiqqud]);

  // Clear niqqud cache and reset state
  const clearNiqqud = useCallback(() => {
    setCache(null);
    setError(null);
    setDisplayMode('original');
    setTargetState('original');
    setLastDisplayState(null);
    // Reset text to empty string
    setText("");
    previousTextRef.current = "";
    
    // Clear all cache keys from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(SETTINGS_KEYS.NIQQUD_CACHE_ORIGINAL);
        localStorage.removeItem(SETTINGS_KEYS.NIQQUD_CACHE_CLEAN);
        localStorage.removeItem(SETTINGS_KEYS.NIQQUD_CACHE_FULL);
        localStorage.removeItem(SETTINGS_KEYS.LAST_DISPLAY_STATE);
      } catch (error) {
        console.error("[useNiqqud] Failed to clear cache from localStorage:", error);
      }
    }
  }, []);

  return {
    text,
    setText,
    hasNiqqud,
    niqqudStatus,
    originalStatus,
    displayMode,
    targetState,
    lastDisplayState,
    isLoading,
    error,
    getButtonText,
    toggleNiqqud,
    addNiqqud,
    completeNiqqud,
    removeNiqqud: removeNiqqudFromText,
    switchToOriginal,
    switchToClean,
    switchToFull,
    restoreLastDisplayState,
    clearNiqqud,
    clearError: () => setError(null),
  };
}
