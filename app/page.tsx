"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { getLastWorkedTextClient, saveTextClient } from "@/lib/saved-texts-client";
import { createClient } from "@/lib/supabase/client";

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

    originalStatus,

    targetState,
    isLoading,
    error,
    getButtonText,
    toggleNiqqud,

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
    toggleSyllables,
    clearSyllables,
    clearError: clearSyllablesError,
  } = useSyllables(localText);
  const { toast } = useToast();
  const prevHasNiqqudRef = useRef(hasNiqqud);
  const prevIsSyllablesActiveRef = useRef(isSyllablesActive);
  
  // Create supabase client for auth state listening
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);
  
  // Track if we've loaded text initially to avoid overwriting user input
  const hasLoadedInitialText = useRef(false);

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

  // Load text from Supabase (if authenticated) or localStorage on mount
  useEffect(() => {
    if (!mounted || hasLoadedInitialText.current) return;

    const loadText = async () => {
      try {
        // Try to load from Supabase first (if authenticated)
        const savedTextData = await getLastWorkedTextClient();
        
        if (savedTextData && savedTextData.original_text) {
          // Prefer niqqud text if available, otherwise use original
          const textToLoad = savedTextData.niqqud_text || savedTextData.original_text;
          setLocalText(textToLoad);
          setNiqqudText(textToLoad);
          hasLoadedInitialText.current = true;
          return;
        }
        
        // Fallback to localStorage if no Supabase data
        const savedText = localStorage.getItem(MAIN_TEXT_STORAGE_KEY);
        if (savedText) {
          setLocalText(savedText);
          setNiqqudText(savedText);
          hasLoadedInitialText.current = true;
        }
      } catch (error) {
        console.error("[Home] Error loading text:", error);
        // Fallback to localStorage on error
        const savedText = localStorage.getItem(MAIN_TEXT_STORAGE_KEY);
        if (savedText) {
          setLocalText(savedText);
          setNiqqudText(savedText);
        }
        hasLoadedInitialText.current = true;
      }
    };

    loadText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Save text to Supabase (debounced) and localStorage when it changes
  useEffect(() => {
    if (!mounted || !hasLoadedInitialText.current) return;

    if (localText !== undefined && localText !== null) {
      // Always save to localStorage as backup
      localStorage.setItem(MAIN_TEXT_STORAGE_KEY, localText);
      
      // Save to Supabase (debounced - will be called after 3 seconds of no changes)
      // This function is debounced, so it won't fire on every keystroke
      saveTextClient({
        original_text: localText,
        niqqud_text: null, // Will be updated when niqqud is added
        clean_text: null, // Will be generated automatically
      });
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

  // Listen for auth state changes and load text when user logs in
  useEffect(() => {
    if (!supabase || !mounted) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // When user logs in, load their saved text
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const savedTextData = await getLastWorkedTextClient();
          
          if (savedTextData && savedTextData.original_text) {
            // Prefer niqqud text if available, otherwise use original
            const textToLoad = savedTextData.niqqud_text || savedTextData.original_text;
            setLocalText(textToLoad);
            setNiqqudText(textToLoad);
          }
        } catch (error) {
          console.error("[Home] Error loading text on login:", error);
        }
      }
      // When user logs out, we keep using localStorage (already saved there)
    });

    return () => subscription.unsubscribe();
  }, [supabase, mounted]);

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

  const handleToggleSyllables = async () => {
    clearSyllablesError();

    try {
      await toggleSyllables();
      // Don't show toast here - let the useEffect handle it based on actual state changes
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

  // Show success toast for syllables when state changes
  useEffect(() => {
    if (
      prevIsSyllablesActiveRef.current !== isSyllablesActive &&
      !isSyllablesLoading &&
      !syllablesError
    ) {
      if (isSyllablesActive) {
        toast({
          title: "חלוקה להברות",
          description: "הטקסט חולק להברות בהצלחה",
        });
      } else {
        toast({
          title: "חלוקה להברות הוסתרה",
          description: "החלוקה להברות הוסתרה",
        });
      }
    }

    if (!isSyllablesLoading) {
      prevIsSyllablesActiveRef.current = isSyllablesActive;
    }
  }, [isSyllablesActive, isSyllablesLoading, syllablesError, toast]);

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
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[2rem] text-center">
                {appearanceSettings.fontSize}px
              </span>
              <Button
                onClick={() => handleFontSizeChange(1)}
                disabled={appearanceSettings.fontSize >= MAX_FONT_SIZE}
                variant="outline"
                size="icon"
                className="h-8 w-8"
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
              <SelectTrigger id="navigation-mode" className="w-[180px] text-right" dir="rtl">
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
              onClick={handleToggleSyllables}
              disabled={isSyllablesLoading || !localText.trim()}
              className="gap-2 min-w-[180px]"
              variant={isSyllablesActive ? "secondary" : "default"}
              size="lg"
            >
              {isSyllablesLoading ? (
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
                  >
                    ניקוד חלקי
                  </Button>
                  <Button
                    variant={targetState === 'full' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => completeNiqqud()}
                    className="h-8 px-3 text-xs"
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
