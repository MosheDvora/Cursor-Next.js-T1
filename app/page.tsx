"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Settings, Loader2, Sparkles, Scissors } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useNiqqud } from "@/hooks/use-niqqud";
import { useSyllables } from "@/hooks/use-syllables";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { SyllablesDisplay } from "@/components/syllables-display";

const MAIN_TEXT_STORAGE_KEY = "main_text_field";

export default function Home() {
  const [localText, setLocalText] = useState("");
  const {
    text: niqqudText,
    setText: setNiqqudText,
    hasNiqqud,
    isLoading,
    error,
    getButtonText,
    toggleNiqqud,
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
    clearError: clearSyllablesError,
  } = useSyllables(localText);
  const { toast } = useToast();
  const prevHasNiqqudRef = useRef(hasNiqqud);
  const prevIsSyllablesActiveRef = useRef(isSyllablesActive);

  // Load text from localStorage on mount
  useEffect(() => {
    const savedText = localStorage.getItem(MAIN_TEXT_STORAGE_KEY);
    if (savedText) {
      setLocalText(savedText);
      setNiqqudText(savedText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save text to localStorage when it changes
  useEffect(() => {
    if (localText !== undefined && localText !== null) {
      localStorage.setItem(MAIN_TEXT_STORAGE_KEY, localText);
    }
  }, [localText]);

  // Sync niqqud text changes back to local state - this is critical for updates
  useEffect(() => {
    // Only update if niqqudText actually changed (from hook operations)
    if (niqqudText !== localText) {
      setLocalText(niqqudText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niqqudText]);

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

          {/* Action Buttons */}
          <div className="mb-4 flex justify-end gap-3">
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
          </div>

          {/* Syllables display area (shown when active) */}
          {isSyllablesActive && syllablesData && (
            <div className="w-full mb-4">
              <SyllablesDisplay data={syllablesData} />
            </div>
          )}

          {/* Raw response display (temporary for testing) */}
          {syllablesRawResponse && (
            <div className="w-full mb-4">
              <div className="p-4 border rounded-lg bg-muted">
                <h3 className="text-sm font-semibold mb-2 text-right">תגובה גולמית מהמודל (זמני לבדיקה):</h3>
                <pre className="text-xs overflow-auto text-right bg-background p-3 rounded border whitespace-pre-wrap" dir="rtl">
                  {syllablesRawResponse}
                </pre>
              </div>
            </div>
          )}

          {/* Main text input area */}
          <div className="w-full">
            <Textarea
              value={localText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="הדבק כאן את הטקסט הראשי לצורך מניפולציות..."
              className="min-h-[500px] text-right text-lg md:text-xl resize-y"
              dir="rtl"
              disabled={isLoading || isSyllablesLoading}
            />
          </div>
        </div>
      </main>
      <Toaster />
    </>
  );
}
