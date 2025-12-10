"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Sparkles, Scissors, Trash2, Plus, Minus, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { useNiqqud } from "@/hooks/use-niqqud";
import { useSyllables } from "@/hooks/use-syllables";
import { useToast } from "@/hooks/use-toast";
import { EditableSyllablesTextarea } from "@/components/editable-syllables-textarea";
import { getSettings, CurrentPosition, loadCurrentPosition, saveCurrentPosition, saveSettings, DEFAULT_FONT_SIZE, SETTINGS_KEYS } from "@/lib/settings";

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
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null);
  const {
    text: niqqudText,
    setText: setNiqqudText,
    hasNiqqud,
    niqqudStatus,
    originalStatus,
    targetState,
    isLoading,
    error,
    getButtonText,
    toggleNiqqud,
    addNiqqud,
    completeNiqqud,
    switchToOriginal,
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

  // Load appearance settings and navigation mode
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

      // Load saved position
      const savedPosition = loadCurrentPosition();
      if (savedPosition) {
        setCurrentPosition(savedPosition);
        setNavigationMode(savedPosition.mode);
      }
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

  const handleTextChange = (newText: string) => {
    setLocalText(newText);
    setNiqqudText(newText);
  };

  const handleToggleNiqqud = async () => {
    clearError();


    try {
      await toggleNiqqud();
      // Don't show toast here - let the useEffect handle it based on actual state changes
    } catch (err) {
      toast({
        title: "שגיאה",
        description:
          err instanceof Error
            ? err.message
            : "אירעה שגיאה בעת עיבוד הניקוד",
        variant: "destructive",
      });
    }
  };

  /**
   * Handler for dividing text into syllables
   * If text has no niqqud or partial niqqud, first adds complete niqqud, then divides into syllables
   * Calls the API to process the text and always shows the result after successful division
   * Checks for existing syllablesData and cache before calling the model to avoid duplicate API calls
   */
  const handleDivideSyllables = async () => {
    clearSyllablesError();
    clearError();

    try {
      // Check if we already have syllables data active for the current text
      // If syllables are already active and we have data, no need to call the API again
      if (isSyllablesActive && syllablesData) {
        console.log("[handleDivideSyllables] Syllables data already exists, skipping API call");
        return;
      }

      // Check if text needs niqqud first
      // If originalStatus is "none" or "partial", add complete niqqud before dividing
      if (originalStatus === "none" || originalStatus === "partial") {
        // First, add complete niqqud
        if (originalStatus === "partial") {
          await completeNiqqud();
        } else {
          await addNiqqud();
        }

        // Check if there was an error adding niqqud
        // Note: We need to wait a bit for the error state to update
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        // If there's an error after adding niqqud, don't proceed to syllable division
        // The error will be shown by the useEffect that handles error toasts
        if (error) {
          return;
        }

        // Wait for the text to sync from niqqudText to localText
        // The useEffect that syncs niqqudText to localText runs after state update
        // We wait a short time for React to process the state updates and sync
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      // Now divide into syllables (will use the updated localText which should have full niqqud if it was added)
      // The useSyllables hook uses localText as initialText, which should now be updated with niqqud
      // The divideSyllables function will check cache before calling the API
      await divideSyllables();
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

  // Clear position when syllables are deactivated
  useEffect(() => {
    if (!isSyllablesActive && currentPosition) {
      setCurrentPosition(null);
      saveCurrentPosition(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSyllablesActive]);

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

    // Clear current position
    setCurrentPosition(null);
    saveCurrentPosition(null);

    // Reset to edit mode
    setIsEditing(true);

    // Show success toast
    toast({
      title: "ניקוי הושלם",
      description: "הטקסט והזיכרון נוקו בהצלחה",
    });
  };

  const handlePositionChange = (position: CurrentPosition | null) => {
    setCurrentPosition(position);
    saveCurrentPosition(position);
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
        title: "חלוקה להברות",
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

            {/* Navigation Mode Selector - always visible */}
            <Label htmlFor="navigation-mode" className="text-right text-base">
              סוג קפיצה:
            </Label>
            <Select
              value={navigationMode}
              onValueChange={(value: "words" | "syllables" | "letters") => {
                // Prevent selecting "syllables" if syllables are not active
                if (value === "syllables" && !isSyllablesActive) {
                  return;
                }
                setNavigationMode(value);
              }}
            >
              <SelectTrigger id="navigation-mode" className="w-[180px] text-right" dir="rtl" data-testid="navigation-mode-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="words" className="text-right">מילים</SelectItem>
                {isSyllablesActive && (
                  <SelectItem value="syllables" className="text-right">הברות</SelectItem>
                )}
                <SelectItem value="letters" className="text-right">אותיות</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="mb-4 flex justify-end gap-3">
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
            {originalStatus === 'partial' ? (
              <div className="flex items-center gap-2" dir="ltr">
                {/* Toggle for Partial/Full Niqqud */}
                <div className="flex items-center bg-secondary rounded-md p-1 border border-input">
                  <Button
                    variant={targetState === 'original' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => switchToOriginal()}
                    className="h-8 px-3 text-xs"
                    data-testid="niqqud-partial-button"
                  >
                    ניקוד חלקי
                  </Button>
                  <Button
                    variant={targetState === 'full' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => completeNiqqud()}
                    className="h-8 px-3 text-xs"
                    data-testid="niqqud-full-button"
                  >
                    ניקוד מלא
                  </Button>
                </div>

                <Button
                  onClick={handleToggleNiqqud}
                  disabled={isLoading || !localText.trim()}
                  className="gap-2 min-w-[140px]"
                  variant={hasNiqqud ? "secondary" : "default"}
                  size="lg"
                  data-testid="niqqud-toggle-button"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>מעבד...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{getButtonText()}</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleToggleNiqqud}
                disabled={isLoading || !localText.trim()}
                className="gap-2 min-w-[160px]"
                variant={hasNiqqud ? "secondary" : "default"}
                size="lg"
                data-testid="niqqud-toggle-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>מעבד...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{getButtonText()}</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Main text input area - unified display */}
          <div className="w-full">
            <EditableSyllablesTextarea
              text={localText}
              onChange={handleTextChange}
              isEditing={isEditing}
              isSyllablesActive={isSyllablesActive}
              syllablesData={syllablesData}
              currentPosition={currentPosition}
              onPositionChange={handlePositionChange}
              navigationMode={navigationMode}
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
