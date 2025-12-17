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
  // Creates cache for ALL text types (with full niqqud, partial niqqud, or no niqqud)
  // This ensures consistent behavior and localStorage persistence
  useEffect(() => {
    if (initialText !== previousTextRef.current) {
      setText(initialText);
      previousTextRef.current = initialText;

      const currentStatus = detectNiqqud(initialText);
      const normalizedInitial = initialText.trim();

      // If text becomes empty, clear all cache and localStorage (same as clear button)
      if (!normalizedInitial) {
        // Clear cache state
        setCache(null);
        setError(null);
        setDisplayMode('original');
        setTargetState('original');
        setLastDisplayState(null);
        
        // Clear localStorage cache keys
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
        return;
      }

      // If input has full niqqud, cache it immediately with full version
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
          // Set lastDisplayState to 'full' for text with full niqqud
          if (!lastDisplayState) {
            setLastDisplayState('full');
          }
        }
      }
      // If we have cache, check if we should clear it or keep it
      else if (cache) {
        const normalizedOriginal = cache.original.trim();
        const normalizedClean = cache.clean.trim();
        const normalizedFull = cache.full?.trim() || "";

        // Only create new cache if the new text doesn't match any cached version
        if (
          normalizedInitial !== normalizedOriginal &&
          normalizedInitial !== normalizedClean &&
          normalizedInitial !== normalizedFull
        ) {
          // Create new cache for text without full niqqud (partial or none)
          // full is set to null - will be populated when user requests niqqud from model
          const cleanText = removeNiqqud(initialText);
          setCache({
            original: initialText,
            clean: cleanText,
            full: null  // Will be set when model returns full niqqud
          });
          setDisplayMode('original');
          // If text is clean, we want to add niqqud (full). If partial, restore original.
          setTargetState(currentStatus === 'none' ? 'full' : 'original');
          // Set lastDisplayState to 'original' for text without full niqqud
          if (!lastDisplayState) {
            setLastDisplayState('original');
          }
        }
      } else {
        // No cache - create cache for text without full niqqud (partial or none)
        // full is set to null - will be populated when user requests niqqud from model
        const cleanText = removeNiqqud(initialText);
        setCache({
          original: initialText,
          clean: cleanText,
          full: null  // Will be set when model returns full niqqud
        });
        setDisplayMode('original');
        // If text is clean, we want to add niqqud (full). If partial, restore original.
        setTargetState(currentStatus === 'none' ? 'full' : 'original');
        // Set lastDisplayState to 'original' for text without full niqqud
        if (!lastDisplayState) {
          setLastDisplayState('original');
        }
      }
    }
  }, [initialText, cache, lastDisplayState]);

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
  // Logic:
  // - If current text has niqqud → "הסרת ניקוד" (remove niqqud)
  // - If current text has no niqqud → respect targetState (toggle position):
  //   - If toggle is on "ניקוד חלקי" (targetState === 'original') → "החזרת ניקוד" (restore original partial)
  //   - If toggle is on "ניקוד מלא" (targetState === 'full') → "הוספת ניקוד" (add full niqqud)
  const getButtonText = useCallback(() => {
    if (hasNiqqud) {
      return "הסרת ניקוד";
    }
    // Respect the toggle state (ניקוד חלקי/ניקוד מלא)
    // If toggle is on "ניקוד חלקי", show "החזרת ניקוד" (restore original partial)
    // If toggle is on "ניקוד מלא", show "הוספת ניקוד" (add full niqqud)
    return targetState === 'full' ? "הוספת ניקוד" : "החזרת ניקוד";
  }, [hasNiqqud, targetState]);

  // Add niqqud to text (for text with no niqqud)
  // Returns the full niqqud text if successful, null if failed or already cached
  const addNiqqud = useCallback(async (): Promise<string | null> => {
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
        return null;
      }

      if (!model) {
        setError("אנא בחר מודל שפה בהגדרות");
        setIsLoading(false);
        return null;
      }

      const currentText = text;

      // Check if we have cached full niqqud version
      if (cache && cache.full) {
        // If we have a full niqqud version in cache, use it
        setText(cache.full);
        setDisplayMode('full');
        setTargetState('full');
        setIsLoading(false);
        return cache.full; // Return the cached full niqqud text
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
        return null;
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
          return null;
        }
      } catch (validationError) {
        console.error("[useNiqqud] Validation error", validationError);
        setError(
          `שגיאה בוולידציה: ${validationError instanceof Error ? validationError.message : "שגיאה לא צפויה"}`
        );
        setIsLoading(false);
        return null;
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

      // Set text based on the target display mode
      // If original was clean text, keep showing clean; if full, show niqqud
      // This preserves the user's display preference after model operations
      if (newDisplayMode === 'original') {
        setText(newCache.original);
      } else if (newDisplayMode === 'clean') {
        setText(newCache.clean);
      } else {
        setText(result.niqqudText);
      }
      setDisplayMode(newDisplayMode);
      setTargetState('full');
      setIsLoading(false);
      
      // Return the full niqqud text so caller can use it immediately
      // This avoids the React state closure issue where cache might not be updated yet
      return result.niqqudText;
    } catch (err) {
      console.error("[useNiqqud] Unexpected error in addNiqqud", err);
      setError(
        err instanceof Error ? err.message : "שגיאה לא צפויה בהוספת ניקוד"
      );
      setIsLoading(false);
      return null;
    }
  }, [text, cache, displayMode, lastDisplayState]);

  // Remove niqqud from text
  const removeNiqqudFromText = useCallback(() => {
    const currentText = text;

    // If we have cache with clean version, use it
    if (cache && cache.clean) {
      setText(cache.clean);
      setDisplayMode('clean');
      // If original has niqqud (partial or full), we can restore it later
      // Set targetState to 'original' if original has niqqud, so toggle button can restore it
      if (cache.original && detectNiqqud(cache.original) !== 'none') {
        setTargetState('original');
      }
      // Save this as the last display state
      setLastDisplayState('clean');
      return;
    }

    // If no cache, create new cache with all three states
    const textWithoutNiqqud = removeNiqqud(currentText);
    const originalHasNiqqud = detectNiqqud(currentText) !== 'none';
    const newCache: NiqqudCache = {
      original: currentText,
      clean: textWithoutNiqqud,
      full: null, // Not yet requested
    };
    setCache(newCache);

    // Set text to version without niqqud
    setText(textWithoutNiqqud);
    setDisplayMode('clean');
    // If original had niqqud, set targetState to 'original' so we can restore it
    if (originalHasNiqqud) {
      setTargetState('original');
    }
    // Save this as the last display state
    setLastDisplayState('clean');
  }, [text, cache]);

  // Complete partial niqqud (for text that already has some niqqud)
  // Changed: Only uses cache, never calls model. The model is only called by "ניקוד והברות" button.
  // This function simply switches to cached full niqqud if available.
  // It also updates targetState to 'full' to reflect the toggle state.
  const completeNiqqud = useCallback(async () => {
    // Only use cache - never call model
    // Button will be disabled if no cache.full exists (handled in UI)
    if (cache && cache.full) {
      setText(cache.full);
      setDisplayMode('full');
      setTargetState('full'); // Update toggle state to reflect current view
      setLastDisplayState('full');
    }
    // If no cache.full, do nothing - button will be disabled
  }, [cache]);

  // Switch to original text
  // Important: Only set targetState to 'original' if original has niqqud
  // If original has no niqqud but cache.full exists, keep targetState as 'full'
  // This ensures the toggle button remains functional after model operations
  const switchToOriginal = useCallback(() => {
    if (cache && cache.original) {
      setText(cache.original);
      setDisplayMode('original');
      // Only set targetState to 'original' if original has niqqud
      // If original has no niqqud but we have full niqqud from model, keep targetState as 'full'
      const originalHasNiqqud = detectNiqqud(cache.original) !== 'none';
      if (originalHasNiqqud) {
        setTargetState('original');
      } else if (cache.full) {
        // Original has no niqqud, but we have full niqqud from model
        // Keep targetState as 'full' so the toggle button can work
        setTargetState('full');
      }
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

  // Toggle niqqud based on current state - only uses cache, never calls model
  // The model is only called by the "ניקוד והברות" button
  // Fixed: Check cache.full directly instead of relying on targetState
  // Important: Does NOT change targetState to preserve the toggle state (ניקוד חלקי/ניקוד מלא)
  const toggleNiqqud = useCallback(async () => {
    if (hasNiqqud) {
      // If has niqqud, remove it (go to clean)
      // Don't change targetState - preserve toggle state (ניקוד חלקי/ניקוד מלא)
      const currentText = text;
      if (cache && cache.clean) {
        setText(cache.clean);
        setDisplayMode('clean');
        setLastDisplayState('clean');
        // Don't change targetState - preserve toggle state
      } else {
        // If no cache, create new cache
        const textWithoutNiqqud = removeNiqqud(currentText);
        const newCache: NiqqudCache = {
          original: currentText,
          clean: textWithoutNiqqud,
          full: null,
        };
        setCache(newCache);
        setText(textWithoutNiqqud);
        setDisplayMode('clean');
        setLastDisplayState('clean');
        // Don't change targetState - preserve toggle state
      }
    } else {
      // If text has no niqqud, check what we can restore based on targetState
      // Respect the toggle state (ניקוד חלקי/ניקוד מלא) - show original if toggle is on "ניקוד חלקי"
      if (targetState === 'original' && cache && cache.original) {
        // If toggle is on "ניקוד חלקי", restore the original partial niqqud
        // Don't change targetState - preserve toggle state
        setText(cache.original);
        setDisplayMode('original');
        setLastDisplayState('original');
        // targetState remains 'original' - no change needed
      } else if (targetState === 'full' && cache && cache.full) {
        // If toggle is on "ניקוד מלא", restore the full niqqud
        // Don't change targetState - preserve toggle state
        setText(cache.full);
        setDisplayMode('full');
        setLastDisplayState('full');
        // targetState remains 'full' - no change needed
      } else if (cache && cache.full) {
        // Fallback: if targetState is 'full' but we only check cache.full existence
        // (for backward compatibility, but should be handled by above condition)
        setText(cache.full);
        setDisplayMode('full');
        setLastDisplayState('full');
      }
      // If no matching cache exists, do nothing - button will be disabled
    }
  }, [hasNiqqud, targetState, cache, text]);

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
    setLastDisplayState, // Exposed to allow setting initial display state when text is first entered
    cache, // Exposed to allow component to check cache state for button disabled logic
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
