"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Scissors, Trash2, Plus, Minus, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNiqqud } from "@/hooks/use-niqqud";
import { useSyllables } from "@/hooks/use-syllables";
import { useToast } from "@/hooks/use-toast";
import { EditableSyllablesTextarea, EditableSyllablesTextareaRef } from "@/components/editable-syllables-textarea";
import { getSettings, saveSettings, DEFAULT_FONT_SIZE, SETTINGS_KEYS } from "@/lib/settings";
import { removeNiqqud } from "@/lib/niqqud";

const MAIN_TEXT_STORAGE_KEY = "main_text_field";
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 32;

export default function Home() {
  const [localText, setLocalText] = useState("");
  const [mounted, setMounted] = useState(false);
  const [appearanceSettings, setAppearanceSettings] = useState({
    syllableBorderSize: 2,
    syllableBackgroundColor: "#dbeafe",
    wordSpacing: 12,
    letterSpacing: 0,
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
      const settings = getSettings();
      setAppearanceSettings({
        syllableBorderSize: settings.syllableBorderSize || 2,
        syllableBackgroundColor: settings.syllableBackgroundColor || "#dbeafe",
        wordSpacing: settings.wordSpacing || 12,
        letterSpacing: settings.letterSpacing || 0,
        fontSize: settings.fontSize || DEFAULT_FONT_SIZE,
        wordHighlightPadding: settings.wordHighlightPadding || 4,
        syllableHighlightPadding: settings.syllableHighlightPadding || 3,
        letterHighlightPadding: settings.letterHighlightPadding || 2,
        wordHighlightColor: settings.wordHighlightColor || "#fff176",
        syllableHighlightColor: settings.syllableHighlightColor || "#fff176",
        letterHighlightColor: settings.letterHighlightColor || "#fff176",
      });
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
  useEffect(() => {
    if (!mounted) return;

    if (localText !== undefined && localText !== null) {
      localStorage.setItem(MAIN_TEXT_STORAGE_KEY, localText);
    }
  }, [localText, mounted]);

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

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, appearanceSettings.fontSize + delta));
    setAppearanceSettings((prev) => ({ ...prev, fontSize: newSize }));
    saveSettings({ fontSize: newSize });
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

  return (
    <>
      <main className="flex min-h-screen flex-col p-6 md:p-12">
        <div className="w-full max-w-6xl mx-auto">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-right">
              לימוד קריאה
            </h1>
          </div>

          {/* Sticky Controls Bar - Always visible at top when scrolling */}
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mb-4 py-4 -mx-6 md:-mx-12 px-6 md:px-12 border-b">
            {/* Navigation Mode Selector and Font Size Controls */}
            <div className="mb-4 flex justify-end items-center gap-3">
              {/* Font Size Controls */}
              <div className="flex items-center gap-2">
                <Label className="text-right text-base">גודל פונט:</Label>
                <Button
                  onClick={() => handleFontSizeChange(-1)}
                  disabled={appearanceSettings.fontSize <= MIN_FONT_SIZE}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  data-testid="font-size-decrease-button"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[2rem] text-center" data-testid="font-size-display">
                  {appearanceSettings.fontSize}px
                </span>
                <Button
                  onClick={() => handleFontSizeChange(1)}
                  disabled={appearanceSettings.fontSize >= MAX_FONT_SIZE}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  data-testid="font-size-increase-button"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* 
                Navigation Mode Selector - "סוג קפיצה"
                
                Behavior:
                - Only shown in VIEW mode (!isEditing) - hidden during editing
                - "מילים" (words) and "אותיות" (letters) are ALWAYS available
                - "הברות" (syllables) is shown ONLY when syllablesData exists in memory
                
                The useSyllables hook now persists syllablesData when niqqud is toggled
                by storing cache for both niqqud and clean text versions.
                This ensures syllables option remains available after adding/removing niqqud.
              */}
              {!isEditing && (
                <>
                  <Label htmlFor="navigation-mode" className="text-right text-base">
                    סוג קפיצה:
                  </Label>
                  <Select
                    value={navigationMode}
                    onValueChange={(value: "words" | "syllables" | "letters") => {
                      // Guard: Prevent selecting "syllables" if no syllables data exists
                      // This prevents navigation errors when syllables haven't been divided yet
                      if (value === "syllables" && !syllablesData) {
                        return;
                      }
                      setNavigationMode(value);
                    }}
                  >
                    <SelectTrigger id="navigation-mode" className="w-[180px] text-right" dir="rtl" data-testid="navigation-mode-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Words option - always available */}
                      <SelectItem value="words" className="text-right">מילים</SelectItem>
                      {/* Syllables option - only shown when syllables data exists in memory from model */}
                      {syllablesData && (
                        <SelectItem value="syllables" className="text-right">הברות</SelectItem>
                      )}
                      {/* Letters option - always available */}
                      <SelectItem value="letters" className="text-right">אותיות</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
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
              disabled={isSyllablesLoading || isLoading || !localText.trim()}
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
            <Button
              onClick={handleClear}
              disabled={isLoading || isSyllablesLoading || !localText.trim()}
              className="gap-2 min-w-[120px]"
              variant="destructive"
              size="lg"
              data-testid="clear-button"
            >
              <Trash2 className="h-4 w-4" />
              <span>ניקוי</span>
            </Button>
            {/* 
              Niqqud Mode Toggle Group
              
              Shows 3 options: "ללא ניקוד", "ניקוד חלקי", "ניקוד מלא"
              - Only visible in view mode (!isEditing)
              - "ללא ניקוד" (clean): Always enabled
              - "ניקוד חלקי" (original): Enabled only if originalStatus === 'partial'
              - "ניקוד מלא" (full): Enabled only if cache?.full exists
              
              The toggle value is determined by getToggleValue() which maps
              displayMode + originalStatus to the correct toggle option.
            */}
            {!isEditing && (
              <ToggleGroup
                type="single"
                value={(() => {
                  // Determine ToggleGroup value based on current display and original status
                  if (displayMode === 'clean') return 'clean';
                  if (displayMode === 'full') return 'full';
                  // displayMode === 'original'
                  if (originalStatus === 'partial') return 'original';
                  if (originalStatus === 'full') return 'full';
                  return 'clean';
                })()}
                onValueChange={(value: string) => {
                  if (!value) return; // Prevent deselection
                  
                  // Store current scroll position before state changes
                  const scrollY = window.scrollY;
                  
                  if (value === 'clean') {
                    switchToClean();
                  } else if (value === 'original') {
                    switchToOriginal();
                  } else if (value === 'full') {
                    switchToFull();
                  }
                  
                  // Prevent scroll by restoring position after focus change
                  // Use multiple attempts to catch scroll at different stages
                  requestAnimationFrame(() => {
                    window.scrollTo({ top: scrollY, behavior: 'instant' });
                    setTimeout(() => {
                      window.scrollTo({ top: scrollY, behavior: 'instant' });
                    }, 0);
                    setTimeout(() => {
                      window.scrollTo({ top: scrollY, behavior: 'instant' });
                    }, 10);
                  });
                }}
                className="border border-input rounded-md"
                dir="rtl"
                data-testid="niqqud-toggle-group"
              >
                <ToggleGroupItem 
                  value="clean" 
                  disabled={false}
                  className="text-sm px-4 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  data-testid="niqqud-clean-option"
                >
                  ללא ניקוד
                </ToggleGroupItem>
                
                <ToggleGroupItem 
                  value="original" 
                  disabled={originalStatus !== 'partial'}
                  className="text-sm px-4 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  data-testid="niqqud-partial-option"
                >
                  ניקוד חלקי
                </ToggleGroupItem>
                
                <ToggleGroupItem 
                  value="full" 
                  disabled={!cache?.full}
                  className="text-sm px-4 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  data-testid="niqqud-full-option"
                >
                  ניקוד מלא
                </ToggleGroupItem>
              </ToggleGroup>
            )}
            </div>
          </div>

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
              disabled={isLoading || isSyllablesLoading}
              placeholder="הדבק כאן את הטקסט הראשי לצורך מניפולציות..."
            />
          </div>
        </div>
      </main>
    </>
  );
}
