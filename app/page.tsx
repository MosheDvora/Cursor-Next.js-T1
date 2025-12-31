"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Scissors, Trash2, Pencil, Check, Microscope, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNiqqud } from "@/hooks/use-niqqud";
import { useSyllables } from "@/hooks/use-syllables";
import { useMorphology } from "@/hooks/use-morphology";
import { useToast } from "@/hooks/use-toast";
import { EditableSyllablesTextarea, EditableSyllablesTextareaRef } from "@/components/editable-syllables-textarea";
import { ReadingSettingsDrawer } from "@/components/reading-settings-drawer";
import { 
  getSettings, 
  saveSettings, 
  getFontFamily, 
  saveFontFamily,
  saveWordSpacing,
  DEFAULT_FONT_SIZE, 
  DEFAULT_LINE_HEIGHT,
  DEFAULT_WORD_SPACING,
  DEFAULT_LETTER_SPACING,
  DEFAULT_FONT_FAMILY,
  SETTINGS_KEYS 
} from "@/lib/settings";
import { removeNiqqud } from "@/lib/niqqud";
import { getAllPresets } from "@/lib/text-styling-presets";

const MAIN_TEXT_STORAGE_KEY = "main_text_field";

export default function Home() {
  const [localText, setLocalText] = useState("");
  const [mounted, setMounted] = useState(false);
  const [appearanceSettings, setAppearanceSettings] = useState({
    syllableBorderSize: 2,
    syllableBackgroundColor: "#dbeafe",
    wordSpacing: DEFAULT_WORD_SPACING,
    letterSpacing: DEFAULT_LETTER_SPACING,
    lineHeight: DEFAULT_LINE_HEIGHT,
    fontSize: DEFAULT_FONT_SIZE,
    wordHighlightPadding: 4,
    syllableHighlightPadding: 3,
    letterHighlightPadding: 2,
    wordHighlightColor: "#fff176",
    syllableHighlightColor: "#fff176",
    letterHighlightColor: "#fff176",
  });
  const [navigationMode, setNavigationMode] = useState<"words" | "syllables" | "letters">("words");
  const [isEditing, setIsEditing] = useState(true);
  const [selectedStylingPreset, setSelectedStylingPreset] = useState<string>("default");
  const [fontFamily, setFontFamily] = useState<string>("Inter");
  // Local font family for dynamic selection (not saved, only for display)
  const [localFontFamily, setLocalFontFamily] = useState<string | null>(null);
  
  /**
   * Ref to the EditableSyllablesTextarea component for imperative navigation control.
   * This allows us to manage highlighting without causing React re-renders.
   * The component handles its own position state internally via refs.
   */
  const textareaRef = useRef<EditableSyllablesTextareaRef>(null);
  const {
    text: niqqudText,
    setText: setNiqqudText,
    hasNiqqud,
    niqqudStatus: _niqqudStatus, // Prefixed with underscore - available for future use
    originalStatus,
    displayMode,
    lastDisplayState: _lastDisplayState, // Prefixed with underscore - available for future use
    setLastDisplayState: _setLastDisplayState, // Prefixed with underscore - available for future use
    cache,
    isLoading,
    error,
    addNiqqud,
    switchToOriginal,
    switchToClean,
    switchToFull,
    restoreLastDisplayState: _restoreLastDisplayState, // Prefixed with underscore - available for future use
    clearNiqqud,
    clearError,
  } = useNiqqud(localText);
  const {
    syllablesData,
    isActive: isSyllablesActive,
    isLoading: isSyllablesLoading,
    error: syllablesError,
    rawResponse: syllablesRawResponse,
    getButtonText: getSyllablesButtonText,
    divideSyllables,
    clearSyllables,
    clearError: clearSyllablesError,
  } = useSyllables(localText);
  
  // Morphology analysis hook
  const {
    results: morphologyResults,
    rawResponse: morphologyRawResponse,
    isLoading: isMorphologyLoading,
    error: morphologyError,
    analyze: analyzeMorphology,
    clearResults: clearMorphologyResults,
    clearError: clearMorphologyError,
  } = useMorphology();
  
  // State for morphology JSON display panel
  const [isMorphologyPanelOpen, setIsMorphologyPanelOpen] = useState(false);
  
  // State for settings drawer - used to hide header when drawer is open
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  
  const { toast } = useToast();
  const prevHasNiqqudRef = useRef(hasNiqqud);
  const prevIsSyllablesLoadingRef = useRef(isSyllablesLoading);

  // Mark component as mounted (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load appearance settings
  useEffect(() => {
    if (mounted) {
      const loadSettings = async () => {
        const settings = getSettings();
        setAppearanceSettings({
          syllableBorderSize: settings.syllableBorderSize || 2,
          syllableBackgroundColor: settings.syllableBackgroundColor || "#dbeafe",
          wordSpacing: settings.wordSpacing ?? DEFAULT_WORD_SPACING,
          letterSpacing: settings.letterSpacing ?? DEFAULT_LETTER_SPACING,
          lineHeight: settings.lineHeight ?? DEFAULT_LINE_HEIGHT,
          fontSize: settings.fontSize ?? DEFAULT_FONT_SIZE,
          wordHighlightPadding: settings.wordHighlightPadding || 4,
          syllableHighlightPadding: settings.syllableHighlightPadding || 3,
          letterHighlightPadding: settings.letterHighlightPadding || 2,
          wordHighlightColor: settings.wordHighlightColor || "#fff176",
          syllableHighlightColor: settings.syllableHighlightColor || "#fff176",
          letterHighlightColor: settings.letterHighlightColor || "#fff176",
        });
        
        // Load fontFamily from preferences (authenticated) or localStorage (unauthenticated)
        const loadedFontFamily = await getFontFamily();
        setFontFamily(loadedFontFamily);
      };
      
      loadSettings();
      // Note: Position is now managed internally by EditableSyllablesTextarea via refs
      // It loads from localStorage on mount and persists changes automatically
    }
  }, [mounted]);

  // Load text from localStorage on mount (client-side only)
  useEffect(() => {
    if (!mounted) return;

    const savedText = localStorage.getItem(MAIN_TEXT_STORAGE_KEY);
    if (savedText) {
      setLocalText(savedText);
      setNiqqudText(savedText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Save text to localStorage when it changes (client-side only)
  // Also clean up localStorage and syllables when text becomes empty (same as clear button)
  useEffect(() => {
    if (!mounted) return;

    // If text becomes empty, clean up localStorage and syllables (same as clear button)
    if (!localText || localText.trim().length === 0) {
      // Remove text from localStorage (don't just set it to empty string)
      localStorage.removeItem(MAIN_TEXT_STORAGE_KEY);
      // Remove syllables raw response from localStorage
      localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_RAW_RESPONSE);
      // Clear syllables cache and state
      clearSyllables();
      // Clear current position via ref API (no re-render)
      if (textareaRef.current) {
        textareaRef.current.clearHighlight();
      }
    } else {
      // Text exists - save to localStorage
      localStorage.setItem(MAIN_TEXT_STORAGE_KEY, localText);
    }
  }, [localText, mounted, clearSyllables]);

  // Sync niqqud text changes back to local state - this is critical for updates
  useEffect(() => {
    // Only update if niqqudText actually changed (from hook operations)
    if (niqqudText !== localText) {
      setLocalText(niqqudText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niqqudText]);

  // Save raw response to localStorage for display in settings
  useEffect(() => {
    if (syllablesRawResponse) {
      localStorage.setItem(SETTINGS_KEYS.SYLLABLES_RAW_RESPONSE, syllablesRawResponse);
    }
  }, [syllablesRawResponse]);

  /**
   * Handler for text input changes (typing or pasting)
   * Updates both localText and niqqudText states
   * The useNiqqud hook handles cache creation and lastDisplayState setting
   */
  const handleTextChange = (newText: string) => {
    setLocalText(newText);
    setNiqqudText(newText);
    // Note: Cache and lastDisplayState are now handled by useNiqqud hook
    // when initialText changes, ensuring consistent behavior
  };

  /**
   * Handler for dividing text into syllables
   * If text has no niqqud or partial niqqud, first adds complete niqqud, then divides into syllables
   * Calls the API to process the text and always shows the result after successful division
   * Checks for existing syllablesData and cache before calling the model to avoid duplicate API calls
   * After completion, restores the text display to the state it was before clicking the button
   */
  const handleDivideSyllables = async () => {
    clearSyllablesError();
    clearError();

    // Capture the current text (potentially with partial niqqud) before any processing
    // We'll use this to ensure syllables are cached for this specific text version too
    const currentPartialText = localText;

    try {
      // Check if we already have syllables data active for the current text
      // If syllables are already active and we have data, no need to call the API again
      if (isSyllablesActive && syllablesData) {
        console.log("[handleDivideSyllables] Syllables data already exists, skipping API call");
        return;
      }

      // Save the current display mode before any model operations
      // This will be restored after syllable division completes
      const savedDisplayMode = displayMode;
      console.log("[handleDivideSyllables] Saving current display mode:", savedDisplayMode);

      // Check if text needs niqqud first
      // If originalStatus is "none" or "partial", add complete niqqud before dividing
      // For "ניקוד והברות" button, we always call addNiqqud() which calls the model
      // This ensures cache.full is populated for both no-niqqud and partial-niqqud cases
      let fullNiqqudText: string | null = null;
      if (originalStatus === "none" || originalStatus === "partial") {
        // Call addNiqqud() for both cases - it handles both no niqqud and partial niqqud
        // The model will complete the niqqud in both cases
        // addNiqqud now returns the full niqqud text directly, avoiding React state closure issues
        fullNiqqudText = await addNiqqud();
        
        // If addNiqqud failed (returned null), don't proceed to syllable division
        // The error state will be set by addNiqqud and shown by the useEffect that handles error toasts
        // We rely on the return value (null) instead of the error state to avoid stale state issues
        if (!fullNiqqudText) {
          return;
        }
      }

      // Now divide into syllables
      // IMPORTANT: Always use the full niqqud text for accurate syllable division
      // Priority order:
      // 1. fullNiqqudText - if we just got it from addNiqqud() (avoids React state closure issue)
      // 2. cache.full - if available AND cache corresponds to current text (validate cache is not stale)
      // 3. cache.original - if originalStatus is "full" AND cache corresponds to current text
      // 4. localText - fallback (should have full niqqud after addNiqqud, but may not be ideal)
      let textForSyllables: string;
      if (fullNiqqudText) {
        // Use the text we just got from addNiqqud() - this avoids the React state closure issue
        textForSyllables = fullNiqqudText;
      } else if (cache?.full) {
        // Validate that cache corresponds to current text before using it
        // The cache is valid if:
        // 1. cache.original matches localText (user is viewing original text)
        // 2. cache.clean matches localText (user is viewing clean text)
        // 3. cache.clean matches removeNiqqud(localText) (user is viewing text with niqqud, but cache.clean matches)
        // This prevents using stale cache from a previous text operation
        const localTextClean = removeNiqqud(localText);
        const cacheMatchesCurrentText = 
          cache.original === localText || 
          cache.clean === localText ||
          cache.clean === localTextClean;
        
        if (cacheMatchesCurrentText) {
          textForSyllables = cache.full;
        } else {
          // Cache is stale - don't use it, fall back to localText
          console.warn("[handleDivideSyllables] Cache is stale, not using cache.full. Current text:", localText.substring(0, 50), "Cache original:", cache.original?.substring(0, 50));
          textForSyllables = localText;
        }
      } else if (originalStatus === "full" && cache?.original) {
        // Validate that cache corresponds to current text before using it
        // The cache.original should match localText if user entered text with full niqqud
        const cacheMatchesCurrentText = cache.original === localText;
        
        if (cacheMatchesCurrentText) {
          // If original text has full niqqud but cache.full doesn't exist (edge case),
          // use cache.original which is the full niqqud text
          textForSyllables = cache.original;
        } else {
          // Cache is stale - don't use it, fall back to localText
          console.warn("[handleDivideSyllables] Cache is stale, not using cache.original. Current text:", localText.substring(0, 50), "Cache original:", cache.original?.substring(0, 50));
          textForSyllables = localText;
        }
      } else {
        // Fallback to localText (should have full niqqud after addNiqqud if it was called)
        textForSyllables = localText;
      }
      
      console.log("[handleDivideSyllables] Using text for syllables:", {
        hasFullNiqqudText: !!fullNiqqudText,
        hasCacheFull: !!cache?.full,
        originalStatus: originalStatus,
        usingFullNiqqudText: fullNiqqudText === textForSyllables,
        usingCacheFull: cache?.full === textForSyllables,
        usingCacheOriginal: cache?.original === textForSyllables,
        usingLocalText: localText === textForSyllables,
        textLength: textForSyllables.length,
        displayMode: displayMode,
      });
      
      // Pass the current partial text as an additional cache key
      // This ensures that if we have partial niqqud, the result is cached for it too
      // so when we switch back to partial view, the syllables are found
      const additionalKeys: string[] = [];
      if (currentPartialText && currentPartialText !== textForSyllables) {
        additionalKeys.push(currentPartialText);
      }
      
      await divideSyllables(textForSyllables, additionalKeys);

      // After syllable division completes, restore the text display to the saved state
      // Wait a bit for the division to complete and state to update
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // Restore the display mode that was saved before the operation
      console.log("[handleDivideSyllables] Restoring display mode to:", savedDisplayMode);
      if (savedDisplayMode === 'original') {
        switchToOriginal();
      } else if (savedDisplayMode === 'clean') {
        switchToClean();
      } else if (savedDisplayMode === 'full') {
        switchToFull();
      }

      // Toast will be shown by useEffect when division completes successfully
    } catch (err) {
      toast({
        title: "שגיאה",
        description:
          err instanceof Error
            ? err.message
            : "אירעה שגיאה בעת חלוקה להברות",
        variant: "destructive",
      });
    }
  };

  // Clear highlight when syllables are deactivated
  // The textarea component handles this via its ref API
  useEffect(() => {
    if (!isSyllablesActive && textareaRef.current) {
      textareaRef.current.resetPosition();
    }
  }, [isSyllablesActive]);

  /**
   * Handler for morphological analysis
   * If text has no niqqud or partial niqqud, first adds complete niqqud, then analyzes
   * The analysis is performed via OpenRouter API and returns structured JSON
   */
  const handleMorphologyAnalysis = async () => {
    clearMorphologyError();
    clearError();

    try {
      // Save the current display mode before any model operations
      const savedDisplayMode = displayMode;
      console.log("[handleMorphologyAnalysis] Starting morphological analysis");

      let textToAnalyze: string;

      // Check if text needs niqqud first
      // If originalStatus is "none" or "partial", add complete niqqud before analysis
      if (originalStatus === "none" || originalStatus === "partial") {
        // Call addNiqqud() to get fully vocalized text
        const fullNiqqudText = await addNiqqud();
        
        if (!fullNiqqudText) {
          // addNiqqud failed - error will be shown by existing error handling
          return;
        }
        textToAnalyze = fullNiqqudText;
      } else {
        // Text already has full niqqud - use it directly
        // Priority: cache.full > cache.original (if full niqqud) > localText
        if (cache?.full) {
          textToAnalyze = cache.full;
        } else if (originalStatus === "full" && cache?.original) {
          textToAnalyze = cache.original;
        } else {
          textToAnalyze = localText;
        }
      }

      console.log("[handleMorphologyAnalysis] Analyzing text:", {
        textLength: textToAnalyze.length,
        textPreview: textToAnalyze.substring(0, 50),
      });

      // Perform morphological analysis
      const response = await analyzeMorphology(textToAnalyze);

      if (response.success) {
        // Open the results panel automatically
        setIsMorphologyPanelOpen(true);
        
        toast({
          title: "ניתוח מורפולוגי הושלם",
          description: `נותחו ${response.results?.length || 0} מילים`,
        });
      }

      // Restore the display mode after analysis
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log("[handleMorphologyAnalysis] Restoring display mode to:", savedDisplayMode);
      if (savedDisplayMode === 'original') {
        switchToOriginal();
      } else if (savedDisplayMode === 'clean') {
        switchToClean();
      } else if (savedDisplayMode === 'full') {
        switchToFull();
      }
    } catch (err) {
      toast({
        title: "שגיאה",
        description:
          err instanceof Error
            ? err.message
            : "אירעה שגיאה בעת ניתוח מורפולוגי",
        variant: "destructive",
      });
    }
  };

  /**
   * Clear all text and reset the application state
   * Uses the ref API to clear highlights without causing re-renders
   */
  const handleClear = () => {
    // Clear text field
    setLocalText("");
    setNiqqudText("");

    // Clear localStorage
    localStorage.removeItem(MAIN_TEXT_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_RAW_RESPONSE);

    // Clear niqqud cache and state
    clearNiqqud();

    // Clear syllables cache and state
    clearSyllables();

    // Clear morphology results and cache
    clearMorphologyResults();
    setIsMorphologyPanelOpen(false);

    // Clear current position via ref API (no re-render)
    if (textareaRef.current) {
      textareaRef.current.clearHighlight();
    }

    // Reset to edit mode
    setIsEditing(true);

    // Show success toast
    toast({
      title: "ניקוי הושלם",
      description: "הטקסט והזיכרון נוקו בהצלחה",
    });
  };

  /**
   * Handler for drawer font size slider
   * Updates state and persists to settings
   */
  const handleDrawerFontSizeChange = (value: number) => {
    setAppearanceSettings((prev) => ({ ...prev, fontSize: value }));
    saveSettings({ fontSize: value });
  };

  /**
   * Handler for drawer word spacing slider
   * Updates state and persists to settings (with Supabase sync for authenticated users)
   */
  const handleWordSpacingChange = async (value: number) => {
    setAppearanceSettings((prev) => ({ ...prev, wordSpacing: value }));
    await saveWordSpacing(value);
  };

  /**
   * Handler for drawer line height slider
   * Updates state and persists to settings
   */
  const handleLineHeightChange = (value: number) => {
    setAppearanceSettings((prev) => ({ ...prev, lineHeight: value }));
    saveSettings({ lineHeight: value });
  };

  /**
   * Handler for drawer letter spacing slider
   * Updates state and persists to settings
   */
  const handleLetterSpacingChange = (value: number) => {
    setAppearanceSettings((prev) => ({ ...prev, letterSpacing: value }));
    saveSettings({ letterSpacing: value });
  };

  /**
   * Handler for drawer font family selection
   * Updates state and persists to settings (with Supabase sync for authenticated users)
   */
  const handleDrawerFontFamilyChange = async (value: string) => {
    setFontFamily(value);
    setLocalFontFamily(value);
    await saveFontFamily(value);
  };

  /**
   * Handler for drawer reset button
   * Resets all typography settings to defaults
   * 
   * Note: This function is async to properly await Supabase persistence
   * for authenticated users. Without awaiting, settings may not be fully synced.
   */
  const handleDrawerReset = async () => {
    // Reset all typography settings to defaults
    setAppearanceSettings((prev) => ({
      ...prev,
      fontSize: DEFAULT_FONT_SIZE,
      wordSpacing: DEFAULT_WORD_SPACING,
      lineHeight: DEFAULT_LINE_HEIGHT,
      letterSpacing: DEFAULT_LETTER_SPACING,
    }));
    setFontFamily(DEFAULT_FONT_FAMILY);
    setLocalFontFamily(DEFAULT_FONT_FAMILY);
    
    // Persist to settings (await async operations for Supabase sync)
    saveSettings({
      fontSize: DEFAULT_FONT_SIZE,
      wordSpacing: DEFAULT_WORD_SPACING,
      lineHeight: DEFAULT_LINE_HEIGHT,
      letterSpacing: DEFAULT_LETTER_SPACING,
    });
    await saveFontFamily(DEFAULT_FONT_FAMILY);
    await saveWordSpacing(DEFAULT_WORD_SPACING);
    
    toast({
      title: "איפוס הושלם",
      description: "הגדרות התצוגה אופסו לברירת מחדל",
    });
  };

  // Show success toast only when state actually changes successfully
  useEffect(() => {
    // Only show success toast if:
    // 1. State actually changed (prev !== current)
    // 2. Operation completed (!isLoading)
    // 3. No error occurred (!error)
    if (
      prevHasNiqqudRef.current !== hasNiqqud &&
      !isLoading &&
      !error
    ) {
      // State changed and operation completed successfully
      if (hasNiqqud) {
        toast({
          title: "ניקוד נוסף",
          description: "הניקוד נוסף לטקסט בהצלחה",
        });
      } else {
        toast({
          title: "ניקוד הוסר",
          description: "הניקוד הוסר מהטקסט בהצלחה",
        });
      }
    }

    // Update ref to current state (always, to track changes)
    if (!isLoading) {
      prevHasNiqqudRef.current = hasNiqqud;
    }
  }, [hasNiqqud, isLoading, error, toast]);

  // Show success toast for syllables when division completes successfully
  // Only show toast when loading transitions from true to false (division completed)
  useEffect(() => {
    // Check if loading just finished (was loading, now not loading)
    const justFinishedLoading = prevIsSyllablesLoadingRef.current && !isSyllablesLoading;
    
    if (
      justFinishedLoading &&
      isSyllablesActive &&
      !syllablesError &&
      syllablesData
    ) {
      toast({
        title: "ניקוד והברות",
        description: "הטקסט חולק להברות בהצלחה",
      });
    }

    // Update ref to current loading state
    prevIsSyllablesLoadingRef.current = isSyllablesLoading;
  }, [isSyllablesActive, isSyllablesLoading, syllablesError, syllablesData, toast]);

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      // Determine error type for better user feedback
      let errorTitle = "שגיאה";
      let errorDescription = error;

      if (error.includes("API Key")) {
        errorTitle = "הגדרות חסרות";
        errorDescription = "אנא הגדר API Key בהגדרות";
      } else if (error.includes("מודל")) {
        errorTitle = "מודל לא נבחר";
        errorDescription = "אנא בחר מודל שפה בהגדרות";
      } else if (error.includes("ללא ניקוד")) {
        errorTitle = "המודל לא החזיר ניקוד";
        errorDescription = error;
      } else if (error.includes("ריקה") || error.includes("תגובה לא תקינה")) {
        errorTitle = "תגובה לא תקינה מהמודל";
        errorDescription = error;
      } else if (error.includes("שגיאת API") || error.includes("network")) {
        errorTitle = "שגיאת רשת";
        errorDescription = error;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Show error toast for syllables when error occurs
  useEffect(() => {
    if (syllablesError) {
      let errorTitle = "שגיאה";
      let errorDescription = syllablesError;

      if (syllablesError.includes("API Key")) {
        errorTitle = "הגדרות חסרות";
        errorDescription = "אנא הגדר API Key בהגדרות";
      } else if (syllablesError.includes("מודל")) {
        errorTitle = "מודל לא נבחר";
        errorDescription = "אנא בחר מודל שפה בהגדרות";
      } else if (syllablesError.includes("פרומפט")) {
        errorTitle = "פרומפט לא הוגדר";
        errorDescription = "אנא הגדר פרומפט בהגדרות";
      } else if (syllablesError.includes("ריקה") || syllablesError.includes("תגובה לא תקינה")) {
        errorTitle = "תגובה לא תקינה מהמודל";
        errorDescription = syllablesError;
      } else if (syllablesError.includes("שגיאת API") || syllablesError.includes("network")) {
        errorTitle = "שגיאת רשת";
        errorDescription = syllablesError;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    }
  }, [syllablesError, toast]);

  // Show error toast for morphology when error occurs
  useEffect(() => {
    if (morphologyError) {
      let errorTitle = "שגיאה בניתוח מורפולוגי";
      let errorDescription = morphologyError;

      if (morphologyError.includes("API Key")) {
        errorTitle = "הגדרות חסרות";
        errorDescription = "אנא הגדר API Key בהגדרות עבור ניתוח מורפולוגי";
      } else if (morphologyError.includes("מודל")) {
        errorTitle = "מודל לא נבחר";
        errorDescription = "אנא בחר מודל שפה בהגדרות עבור ניתוח מורפולוגי";
      } else if (morphologyError.includes("JSON")) {
        errorTitle = "שגיאה בפענוח תגובה";
        errorDescription = morphologyError;
      } else if (morphologyError.includes("שגיאת API") || morphologyError.includes("network")) {
        errorTitle = "שגיאת רשת";
        errorDescription = morphologyError;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    }
  }, [morphologyError, toast]);

  return (
    <>
      {/* Reading Settings Drawer - Floating settings panel */}
      <ReadingSettingsDrawer
        fontSize={appearanceSettings.fontSize}
        wordSpacing={appearanceSettings.wordSpacing}
        lineHeight={appearanceSettings.lineHeight}
        letterSpacing={appearanceSettings.letterSpacing}
        fontFamily={localFontFamily || fontFamily}
        onFontSizeChange={handleDrawerFontSizeChange}
        onWordSpacingChange={handleWordSpacingChange}
        onLineHeightChange={handleLineHeightChange}
        onLetterSpacingChange={handleLetterSpacingChange}
        onFontFamilyChange={handleDrawerFontFamilyChange}
        onReset={handleDrawerReset}
        onOpenChange={setIsSettingsDrawerOpen}
        // Niqqud (Reading Aids) props
        displayMode={displayMode}
        originalStatus={originalStatus}
        hasFullNiqqud={!!cache?.full}
        isEditing={isEditing}
        onSwitchToClean={switchToClean}
        onSwitchToOriginal={switchToOriginal}
        onSwitchToFull={switchToFull}
        // Navigation Mode props
        navigationMode={navigationMode}
        hasSyllablesData={!!syllablesData}
        onNavigationModeChange={setNavigationMode}
        // Styling Preset props
        selectedStylingPreset={selectedStylingPreset}
        stylingPresets={getAllPresets().filter((preset) => {
          // Filter presets: syllable-frame requires syllables data
          if (preset.id === "syllable-frame") {
            return !!syllablesData;
          }
          return true;
        }).map(p => ({ id: p.id, displayName: p.displayName }))}
        onStylingPresetChange={setSelectedStylingPreset}
      />
      
      <main className="flex min-h-screen flex-col p-6 md:p-12">
        <div className="w-full max-w-6xl mx-auto">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-right">
              לימוד קריאה
            </h1>
          </div>

          {/* Sticky Controls Bar - Hidden when settings drawer is open */}
          {!isSettingsDrawerOpen && (
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-4 py-4 -mx-6 md:-mx-12 px-6 md:px-12 border-b">
            {/* Controls Row */}
            <div className="mb-4 flex justify-end items-center gap-3">
              {/* 
                Font Size Controls - Moved to ReadingSettingsDrawer
                The control is now accessible via the settings drawer under "טיפוגרפיה" accordion.
              */}
              
              {/* 
                Font Family Selection - Moved to ReadingSettingsDrawer
                The control is now accessible via the settings drawer under "טיפוגרפיה" accordion.
              */}

              {/* 
                Navigation Mode Selector - "סוג קפיצה" - Moved to ReadingSettingsDrawer
                The control is now accessible via the settings drawer under "עזרי קריאה" accordion.
              */}
              
              {/* 
                Text Styling Preset Selector - "סגנון עיצוב" - Moved to ReadingSettingsDrawer
                The control is now accessible via the settings drawer under "עיצוב" accordion.
              */}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2 min-w-[120px]"
              variant={isEditing ? "default" : "secondary"}
              size="lg"
              data-testid="edit-toggle-button"
            >
              {isEditing ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>סיום עריכה</span>
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4" />
                  <span>עריכה</span>
                </>
              )}
            </Button>
            <Button
              onClick={handleDivideSyllables}
              disabled={isSyllablesLoading || isLoading || isMorphologyLoading || !localText.trim()}
              className="gap-2 min-w-[180px]"
              variant="default"
              size="lg"
              data-testid="syllables-divide-button"
            >
              {isSyllablesLoading || isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>מעבד...</span>
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4" />
                  <span>{getSyllablesButtonText()}</span>
                </>
              )}
            </Button>
            {/* Morphology Analysis Button */}
            <Button
              onClick={handleMorphologyAnalysis}
              disabled={isSyllablesLoading || isLoading || isMorphologyLoading || !localText.trim()}
              className="gap-2 min-w-[180px]"
              variant="secondary"
              size="lg"
              data-testid="morphology-analyze-button"
            >
              {isMorphologyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>מנתח...</span>
                </>
              ) : (
                <>
                  <Microscope className="h-4 w-4" />
                  <span>ניתוח מורפולוגי</span>
                </>
              )}
            </Button>
            <Button
              onClick={handleClear}
              disabled={isLoading || isSyllablesLoading || isMorphologyLoading || !localText.trim()}
              className="gap-2 min-w-[120px]"
              variant="destructive"
              size="lg"
              data-testid="clear-button"
            >
              <Trash2 className="h-4 w-4" />
              <span>ניקוי</span>
            </Button>
            {/* 
              Niqqud Mode Toggle - Moved to ReadingSettingsDrawer ("עזרי קריאה" accordion)
              The toggle controls are now accessible via the settings drawer on the right side.
            */}
            </div>
          </div>
          )}

          {/* Main text input area - unified display */}
          {/* 
            EditableSyllablesTextarea now uses refs internally for position management.
            This eliminates re-renders on every navigation change, improving performance.
            The ref API (textareaRef) allows external control when needed.
          */}
          <div className="w-full">
            <EditableSyllablesTextarea
              ref={textareaRef}
              text={localText}
              onChange={handleTextChange}
              isEditing={isEditing}
              isSyllablesActive={isSyllablesActive}
              syllablesData={syllablesData}
              navigationMode={navigationMode}
              displayMode={displayMode}
              niqqudCache={cache}
              borderSize={appearanceSettings.syllableBorderSize}
              backgroundColor={appearanceSettings.syllableBackgroundColor}
              wordSpacing={appearanceSettings.wordSpacing}
              letterSpacing={appearanceSettings.letterSpacing}
              fontSize={appearanceSettings.fontSize}
              wordHighlightPadding={appearanceSettings.wordHighlightPadding}
              syllableHighlightPadding={appearanceSettings.syllableHighlightPadding}
              letterHighlightPadding={appearanceSettings.letterHighlightPadding}
              wordHighlightColor={appearanceSettings.wordHighlightColor}
              syllableHighlightColor={appearanceSettings.syllableHighlightColor}
              letterHighlightColor={appearanceSettings.letterHighlightColor}
              disabled={isLoading || isSyllablesLoading || isMorphologyLoading}
              placeholder="הדבק כאן את הטקסט הראשי לצורך מניפולציות..."
              stylingPreset={selectedStylingPreset}
              fontFamily={localFontFamily || fontFamily}
            />
          </div>

          {/* Morphology Results Panel - Collapsible */}
          {morphologyRawResponse && (
            <div className="mt-6 border rounded-lg bg-card shadow-sm overflow-hidden" data-testid="morphology-results-panel">
              {/* Panel Header - Click to toggle */}
              <button
                onClick={() => setIsMorphologyPanelOpen(!isMorphologyPanelOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                data-testid="morphology-panel-toggle"
              >
                <div className="flex items-center gap-2">
                  <Microscope className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-lg">תוצאות ניתוח מורפולוגי</span>
                  {morphologyResults && (
                    <span className="text-sm text-muted-foreground">
                      ({morphologyResults.length} מילים)
                    </span>
                  )}
                </div>
                {isMorphologyPanelOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* Panel Content - JSON Display */}
              {isMorphologyPanelOpen && (
                <div className="border-t p-4" data-testid="morphology-json-display">
                  {/* Summary Stats */}
                  {morphologyResults && (
                    <div className="mb-4 flex items-center gap-4 text-sm" dir="rtl">
                      <span className="text-muted-foreground">
                        סה״כ מילים: <strong>{morphologyResults.length}</strong>
                      </span>
                      <span className="text-green-600">
                        תקין: <strong>{morphologyResults.filter(r => r.validation.valid).length}</strong>
                      </span>
                      {morphologyResults.filter(r => !r.validation.valid).length > 0 && (
                        <span className="text-amber-600">
                          עם אזהרות: <strong>{morphologyResults.filter(r => !r.validation.valid).length}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Raw JSON Display */}
                  <div className="bg-slate-900 rounded-lg p-4 max-h-[500px] overflow-auto">
                    <pre
                      className="text-xs text-cyan-100 font-mono whitespace-pre-wrap"
                      dir="ltr"
                      data-testid="morphology-raw-json"
                    >
                      {(() => {
                        try {
                          // Try to pretty-print the JSON
                          let jsonStr = morphologyRawResponse;
                          if (jsonStr.startsWith('```')) {
                            jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
                          }
                          const parsed = JSON.parse(jsonStr);
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          // If parsing fails, show raw response
                          return morphologyRawResponse;
                        }
                      })()}
                    </pre>
                  </div>

                  {/* Clear Results Button */}
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => {
                        clearMorphologyResults();
                        setIsMorphologyPanelOpen(false);
                      }}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      data-testid="morphology-clear-button"
                    >
                      <Trash2 className="h-4 w-4" />
                      נקה תוצאות
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
