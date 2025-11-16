"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, Loader2, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useNiqqud } from "@/hooks/use-niqqud";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

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
  const { toast } = useToast();

  // Sync niqqud text changes back to local state
  useEffect(() => {
    if (niqqudText !== localText) {
      setLocalText(niqqudText);
    }
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
      // Toast will be shown after state updates
      setTimeout(() => {
        if (wasNiqqud) {
          toast({
            title: "ניקוד הוסר",
            description: "הניקוד הוסר מהטקסט בהצלחה",
          });
        } else {
          toast({
            title: "ניקוד נוסף",
            description: "הניקוד נוסף לטקסט בהצלחה",
          });
        }
      }, 100);
    } catch (err) {
      toast({
        title: "שגיאה",
        description: error || "אירעה שגיאה בעת עיבוד הניקוד",
        variant: "destructive",
      });
    }
  };

  // Show error toast when error occurs
  useEffect(() => {
    if (error) {
      toast({
        title: "שגיאה",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

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

          {/* Niqqud Button */}
          <div className="mb-4 flex justify-end">
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

          {/* Main text input area */}
          <div className="w-full">
            <Textarea
              value={localText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="הדבק כאן את הטקסט הראשי לצורך מניפולציות..."
              className="min-h-[500px] text-right text-lg md:text-xl resize-y"
              dir="rtl"
              disabled={isLoading}
            />
          </div>
        </div>
      </main>
      <Toaster />
    </>
  );
}
