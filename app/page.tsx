"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Settings, Loader2, Sparkles, Scissors, Trash2, Plus, Minus, Pencil, Check, ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { detectNiqqud } from "@/lib/niqqud";
import { Label } from "@/components/ui/label";
import { useNiqqud } from "@/hooks/use-niqqud";
import { useSyllables } from "@/hooks/use-syllables";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
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
    isLoading,
    error,
    getButtonText,
    toggleNiqqud,
    addFullNiqqud,
    restoreOriginal,
    clearNiqqud,
    clearError,
    cache: niqqudCache,
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
    const wasNiqqud = hasNiqqud;

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

  const handleFullNiqqud = async () => {
    clearError();
    try {
      await addFullNiqqud();
      toast({
        title: "ניקוד מלא",
        description: "הטקסט נוקד באופן מלא",
      });
    } catch (err) {
      toast({
        title: "שגיאה",
        description:
          err instanceof Error
            ? err.message
            : "אירעה שגיאה בעת הוספת ניקוד מלא",
        variant: "destructive",
      });
    }
  };

  const handleRestoreOriginal = () => {
    restoreOriginal();
    toast({
      title: "חזרה למקור",
      description: "הטקסט חזר לגרסתו המקורית",
    });
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
          {/* Header with title and settings link */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl md:text-5xl font-bold text-right">
              לימוד קריאה
            </h1>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Settings className="h-6 w-6" />
                <span className="sr-only">הגדרות</span>
              </Button>
            </Link>
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
            <div className="flex items-center gap-0">
              <Button
                onClick={handleToggleNiqqud}
                disabled={isLoading || !localText.trim()}
                className="gap-2 min-w-[120px] rounded-l-none border-l-0"
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={isLoading || !localText.trim() || (niqqudCache?.original ? detectNiqqud(niqqudCache.original) !== "partial" : true)}
                    variant={hasNiqqud ? "secondary" : "default"}
                    size="lg"
                    className="px-2 rounded-r-none border-r border-primary-foreground/20"
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">אפשרויות נוספות</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* 
                    Dropdown Logic based on Table:
                    Only active if Original is Partial.
                    
                    If currently Full (after model) -> Show "Return to Original".
                    If currently Clean (was Full) -> Show "Return to Original".
                    
                    If currently Original (Partial) -> Show "Complete Full".
                    If currently Clean (after Remove) -> Show "Complete Full".
                  */}
                  {niqqudCache?.full ? (
                    <DropdownMenuItem onClick={handleRestoreOriginal} className="gap-2 cursor-pointer text-right flex-row-reverse">
                      <RotateCcw className="h-4 w-4" />
                      <span>חזור למקור</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleFullNiqqud} className="gap-2 cursor-pointer text-right flex-row-reverse">
                      <Sparkles className="h-4 w-4" />
                      <span>השלם ניקוד מלא</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
      <Toaster />
    </>
  );
}
