"use client";

/**
 * Admin Defaults Management Page
 * 
 * This page allows administrators to set site-wide default values that will be used:
 * - For new users (initial values)
 * - For anonymous users (users without authentication)
 * - As fallback values when user doesn't have a specific setting
 * - As reset values for existing users
 * 
 * The page is protected and only accessible to users with is_admin = true in their profile.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  DEFAULT_MODELS,
  DEFAULT_NIQQUD_SYSTEM_PROMPT,
  DEFAULT_NIQQUD_USER_PROMPT,
  DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT,
  DEFAULT_NIQQUD_COMPLETION_USER_PROMPT,
  DEFAULT_SYLLABLES_PROMPT,
  DEFAULT_SYLLABLE_BORDER_SIZE,
  DEFAULT_SYLLABLE_BACKGROUND_COLOR,
  DEFAULT_WORD_SPACING,
  DEFAULT_LETTER_SPACING,
  DEFAULT_WORD_HIGHLIGHT_PADDING,
  DEFAULT_SYLLABLE_HIGHLIGHT_PADDING,
  DEFAULT_LETTER_HIGHLIGHT_PADDING,
  DEFAULT_WORD_HIGHLIGHT_COLOR,
  DEFAULT_SYLLABLE_HIGHLIGHT_COLOR,
  DEFAULT_LETTER_HIGHLIGHT_COLOR,
  DEFAULT_TEMPERATURE,
  AppSettings,
} from "@/lib/settings";

export default function AdminDefaultsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Niqqud settings
  const [niqqudModel, setNiqqudModel] = useState(DEFAULT_MODELS[0].value);
  const [niqqudSystemPrompt, setNiqqudSystemPrompt] = useState(DEFAULT_NIQQUD_SYSTEM_PROMPT);
  const [niqqudUserPrompt, setNiqqudUserPrompt] = useState(DEFAULT_NIQQUD_USER_PROMPT);
  const [niqqudTemperature, setNiqqudTemperature] = useState(DEFAULT_TEMPERATURE);
  const [niqqudCompletionSystemPrompt, setNiqqudCompletionSystemPrompt] = useState(DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT);
  const [niqqudCompletionUserPrompt, setNiqqudCompletionUserPrompt] = useState(DEFAULT_NIQQUD_COMPLETION_USER_PROMPT);
  
  // Syllables settings
  const [syllablesModel, setSyllablesModel] = useState(DEFAULT_MODELS[0].value);
  const [syllablesPrompt, setSyllablesPrompt] = useState(DEFAULT_SYLLABLES_PROMPT);
  const [syllablesTemperature, setSyllablesTemperature] = useState(DEFAULT_TEMPERATURE);
  
  // Appearance settings
  const [syllableBorderSize, setSyllableBorderSize] = useState(DEFAULT_SYLLABLE_BORDER_SIZE);
  const [syllableBackgroundColor, setSyllableBackgroundColor] = useState(DEFAULT_SYLLABLE_BACKGROUND_COLOR);
  const [wordSpacing, setWordSpacing] = useState(DEFAULT_WORD_SPACING);
  const [letterSpacing, setLetterSpacing] = useState(DEFAULT_LETTER_SPACING);
  const [wordHighlightPadding, setWordHighlightPadding] = useState(DEFAULT_WORD_HIGHLIGHT_PADDING);
  const [syllableHighlightPadding, setSyllableHighlightPadding] = useState(DEFAULT_SYLLABLE_HIGHLIGHT_PADDING);
  const [letterHighlightPadding, setLetterHighlightPadding] = useState(DEFAULT_LETTER_HIGHLIGHT_PADDING);
  const [wordHighlightColor, setWordHighlightColor] = useState(DEFAULT_WORD_HIGHLIGHT_COLOR);
  const [syllableHighlightColor, setSyllableHighlightColor] = useState(DEFAULT_SYLLABLE_HIGHLIGHT_COLOR);
  const [letterHighlightColor, setLetterHighlightColor] = useState(DEFAULT_LETTER_HIGHLIGHT_COLOR);
  
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check admin status and load defaults
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch defaults from API (this will also check admin status)
        const response = await fetch("/api/admin/defaults", {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 403) {
          // User is not an admin
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load defaults");
        }

        // User is admin, load the defaults
        setIsAdmin(true);
        const defaults = (await response.json()) as Partial<AppSettings>;

        // Set state with loaded defaults or fallback to hardcoded defaults
        setNiqqudModel(defaults.niqqudModel || DEFAULT_MODELS[0].value);
        setNiqqudSystemPrompt(defaults.niqqudSystemPrompt || DEFAULT_NIQQUD_SYSTEM_PROMPT);
        setNiqqudUserPrompt(defaults.niqqudUserPrompt || DEFAULT_NIQQUD_USER_PROMPT);
        setNiqqudTemperature(defaults.niqqudTemperature ?? DEFAULT_TEMPERATURE);
        setNiqqudCompletionSystemPrompt(defaults.niqqudCompletionSystemPrompt || DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT);
        setNiqqudCompletionUserPrompt(defaults.niqqudCompletionUserPrompt || DEFAULT_NIQQUD_COMPLETION_USER_PROMPT);
        setSyllablesModel(defaults.syllablesModel || DEFAULT_MODELS[0].value);
        setSyllablesPrompt(defaults.syllablesPrompt || DEFAULT_SYLLABLES_PROMPT);
        setSyllablesTemperature(defaults.syllablesTemperature ?? DEFAULT_TEMPERATURE);
        setSyllableBorderSize(defaults.syllableBorderSize ?? DEFAULT_SYLLABLE_BORDER_SIZE);
        setSyllableBackgroundColor(defaults.syllableBackgroundColor || DEFAULT_SYLLABLE_BACKGROUND_COLOR);
        setWordSpacing(defaults.wordSpacing ?? DEFAULT_WORD_SPACING);
        setLetterSpacing(defaults.letterSpacing ?? DEFAULT_LETTER_SPACING);
        setWordHighlightPadding(defaults.wordHighlightPadding ?? DEFAULT_WORD_HIGHLIGHT_PADDING);
        setSyllableHighlightPadding(defaults.syllableHighlightPadding ?? DEFAULT_SYLLABLE_HIGHLIGHT_PADDING);
        setLetterHighlightPadding(defaults.letterHighlightPadding ?? DEFAULT_LETTER_HIGHLIGHT_PADDING);
        setWordHighlightColor(defaults.wordHighlightColor || DEFAULT_WORD_HIGHLIGHT_COLOR);
        setSyllableHighlightColor(defaults.syllableHighlightColor || DEFAULT_SYLLABLE_HIGHLIGHT_COLOR);
        setLetterHighlightColor(defaults.letterHighlightColor || DEFAULT_LETTER_HIGHLIGHT_COLOR);
      } catch (err) {
        console.error("Error loading defaults:", err);
        setError("שגיאה בטעינת הערכים הדיפולטיביים");
      } finally {
        setLoading(false);
      }
    };

    loadDefaults();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      const defaults: Partial<AppSettings> = {
        niqqudModel,
        niqqudSystemPrompt,
        niqqudUserPrompt,
        niqqudTemperature,
        niqqudCompletionSystemPrompt,
        niqqudCompletionUserPrompt,
        syllablesModel,
        syllablesPrompt,
        syllablesTemperature,
        syllableBorderSize,
        syllableBackgroundColor,
        wordSpacing,
        letterSpacing,
        wordHighlightPadding,
        syllableHighlightPadding,
        letterHighlightPadding,
        wordHighlightColor,
        syllableHighlightColor,
        letterHighlightColor,
      };

      const response = await fetch("/api/admin/defaults", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(defaults),
      });

      if (response.status === 403) {
        setError("אין לך הרשאות מנהל");
        setIsAdmin(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to save defaults");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Error saving defaults:", err);
      setError("שגיאה בשמירת הערכים הדיפולטיביים");
    } finally {
      setSaving(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <p className="text-lg">טוען...</p>
        </div>
      </main>
    );
  }

  // Show unauthorized message
  if (isAdmin === false) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6" dir="rtl">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-4">אין הרשאה</h1>
          <p className="text-muted-foreground mb-6">
            רק מנהלים יכולים לגשת לדף זה. אם אתה מנהל, ודא שהחשבון שלך מסומן כמנהל במערכת.
          </p>
          <Link href="/">
            <Button>חזרה לעמוד הבית</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-12" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowRight className="h-6 w-6" />
              <span className="sr-only">חזרה לעמוד הבית</span>
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-right">
              ניהול ערכים דיפולטיביים
            </h1>
            <p className="text-muted-foreground text-right mt-2">
              הגדר ערכי ברירת מחדל שישמשו למשתמשים חדשים, משתמשים אנונימיים, וכערכי fallback
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 border border-destructive rounded-lg bg-destructive/10">
            <p className="text-destructive text-right">{error}</p>
          </div>
        )}

        {/* Save Button */}
        <div className="mb-6">
          <Button
            onClick={handleSave}
            className="w-full md:w-auto gap-2"
            size="lg"
            disabled={saving || saved}
          >
            <Save className="h-4 w-4" />
            {saving ? "שומר..." : saved ? "נשמר!" : "שמור ערכים דיפולטיביים"}
          </Button>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="api" className="w-full" dir="rtl">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Vertical Tabs List */}
            <TabsList className="flex flex-col h-auto w-full md:w-56 p-2 bg-muted rounded-lg space-y-1">
              <TabsTrigger
                value="api"
                className="w-full px-4 py-3 text-right data-[state=active]:bg-background data-[state=active]:shadow-sm"
                style={{ justifyContent: 'flex-start' }}
              >
                מודלים
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="w-full px-4 py-3 text-right data-[state=active]:bg-background data-[state=active]:shadow-sm"
                style={{ justifyContent: 'flex-start' }}
              >
                מראה
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 w-full">
              {/* API Tab */}
              <TabsContent value="api" className="mt-0 space-y-6">
                {/* Area 1: טיפול בניקוד */}
                <div className="space-y-6 p-6 border rounded-lg bg-card shadow-sm">
                  <h2 className="text-2xl font-semibold text-right mb-4">
                    טיפול בניקוד
                  </h2>

                  <div className="space-y-4">
                    {/* Model Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="niqqud-model" className="text-right block text-base">
                        מודל שפה
                      </Label>
                      <Select value={niqqudModel} onValueChange={setNiqqudModel}>
                        <SelectTrigger id="niqqud-model" className="text-right" dir="rtl">
                          <SelectValue placeholder="בחר מודל" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_MODELS.map((modelOption) => (
                            <SelectItem
                              key={modelOption.value}
                              value={modelOption.value}
                              className="text-right"
                            >
                              {modelOption.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground text-right">
                        מודל השפה שישמש להוספת ניקוד לטקסט (ברירת מחדל)
                      </p>
                    </div>

                    {/* System Prompt Textarea */}
                    <div className="space-y-2">
                      <Label htmlFor="niqqud-system-prompt" className="text-right block text-base">
                        System Prompt (הוראות למודל)
                      </Label>
                      <Textarea
                        id="niqqud-system-prompt"
                        value={niqqudSystemPrompt}
                        onChange={(e) => setNiqqudSystemPrompt(e.target.value)}
                        placeholder="הוראות כלליות למודל"
                        className="text-right min-h-[80px] font-mono text-sm"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הוראות ברמת המערכת שמגדירות את תפקיד המודל (ברירת מחדל)
                      </p>
                    </div>

                    {/* User Prompt Textarea */}
                    <div className="space-y-2">
                      <Label htmlFor="niqqud-user-prompt" className="text-right block text-base">
                        User Prompt (בקשה למודל)
                      </Label>
                      <Textarea
                        id="niqqud-user-prompt"
                        value={niqqudUserPrompt}
                        onChange={(e) => setNiqqudUserPrompt(e.target.value)}
                        placeholder="הבקשה הספציפית למודל"
                        className="text-right min-h-[80px] font-mono text-sm"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הבקשה למשתמש. השתמש ב-{"{text}"} כמקום לטקסט הקלט (ברירת מחדל)
                      </p>
                    </div>

                    {/* Temperature Input */}
                    <div className="space-y-2">
                      <Label htmlFor="niqqud-temperature" className="text-right block text-base">
                        טמפרטורה
                      </Label>
                      <Input
                        id="niqqud-temperature"
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={niqqudTemperature}
                        onChange={(e) => setNiqqudTemperature(parseFloat(e.target.value) || DEFAULT_TEMPERATURE)}
                        placeholder="0.2"
                        className="text-right"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        רמת היצירתיות של המודל (0-2). ערך נמוך יותר = תגובות יותר דטרמיניסטיות (ברירת מחדל)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Area 2: השלמת ניקוד */}
                <div className="space-y-6 p-6 border rounded-lg bg-card shadow-sm">
                  <h2 className="text-2xl font-semibold text-right mb-4">
                    השלמת ניקוד חלקי
                  </h2>
                  <p className="text-sm text-muted-foreground text-right mb-4">
                    הגדרות עבור השלמת ניקוד בטקסט שכבר מכיל ניקוד חלקי (ברירת מחדל)
                  </p>

                  <div className="space-y-4">
                    {/* Completion System Prompt */}
                    <div className="space-y-2">
                      <Label htmlFor="niqqud-completion-system-prompt" className="text-right block text-base">
                        System Prompt להשלמת ניקוד
                      </Label>
                      <Textarea
                        id="niqqud-completion-system-prompt"
                        value={niqqudCompletionSystemPrompt}
                        onChange={(e) => setNiqqudCompletionSystemPrompt(e.target.value)}
                        placeholder="הוראות למודל להשלמת ניקוד חלקי"
                        className="text-right min-h-[80px] font-mono text-sm"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הוראות למודל לשמירה על ניקוד קיים והוספת ניקוד חסר בלבד (ברירת מחדל)
                      </p>
                    </div>

                    {/* Completion User Prompt */}
                    <div className="space-y-2">
                      <Label htmlFor="niqqud-completion-user-prompt" className="text-right block text-base">
                        User Prompt להשלמת ניקוד
                      </Label>
                      <Textarea
                        id="niqqud-completion-user-prompt"
                        value={niqqudCompletionUserPrompt}
                        onChange={(e) => setNiqqudCompletionUserPrompt(e.target.value)}
                        placeholder="בקשה למודל להשלמת הניקוד"
                        className="text-right min-h-[80px] font-mono text-sm"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הבקשה למודל. השתמש ב-{"{text}"} כמקום לטקסט עם הניקוד החלקי (ברירת מחדל)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Area 3: טיפול בהברות */}
                <div className="space-y-6 p-6 border rounded-lg bg-card shadow-sm">
                  <h2 className="text-2xl font-semibold text-right mb-4">
                    טיפול בהברות
                  </h2>

                  <div className="space-y-4">
                    {/* Model Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="syllables-model" className="text-right block text-base">
                        מודל שפה
                      </Label>
                      <Select value={syllablesModel} onValueChange={setSyllablesModel}>
                        <SelectTrigger id="syllables-model" className="text-right" dir="rtl">
                          <SelectValue placeholder="בחר מודל" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEFAULT_MODELS.map((modelOption) => (
                            <SelectItem
                              key={modelOption.value}
                              value={modelOption.value}
                              className="text-right"
                            >
                              {modelOption.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground text-right">
                        מודל השפה שישמש לחלוקה להברות (ברירת מחדל)
                      </p>
                    </div>

                    {/* Prompt Textarea */}
                    <div className="space-y-2">
                      <Label htmlFor="syllables-prompt" className="text-right block text-base">
                        פרומפט למודל
                      </Label>
                      <Textarea
                        id="syllables-prompt"
                        value={syllablesPrompt}
                        onChange={(e) => setSyllablesPrompt(e.target.value)}
                        placeholder="הכנס את הפרומפט שיישלח למודל"
                        className="text-right min-h-[120px] font-mono text-sm"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הפרומפט שיישלח למודל לצורך ביצוע המשימה. השתמש ב-{"{text}"} כמקום לטקסט הקלט (ברירת מחדל)
                      </p>
                    </div>

                    {/* Temperature Input */}
                    <div className="space-y-2">
                      <Label htmlFor="syllables-temperature" className="text-right block text-base">
                        טמפרטורה
                      </Label>
                      <Input
                        id="syllables-temperature"
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={syllablesTemperature}
                        onChange={(e) => setSyllablesTemperature(parseFloat(e.target.value) || DEFAULT_TEMPERATURE)}
                        placeholder="0.2"
                        className="text-right"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        רמת היצירתיות של המודל (0-2). ערך נמוך יותר = תגובות יותר דטרמיניסטיות (ברירת מחדל)
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="mt-0">
                <div className="space-y-6 p-6 border rounded-lg bg-card shadow-sm">
                  <h2 className="text-2xl font-semibold text-right mb-4">
                    הגדרות מראה - תצוגת הברות
                  </h2>

                  <div className="space-y-4">
                    {/* Border Size Input */}
                    <div className="space-y-2">
                      <Label htmlFor="syllable-border-size" className="text-right block text-base">
                        גודל מסגרת הברה (פיקסלים)
                      </Label>
                      <Input
                        id="syllable-border-size"
                        type="number"
                        min="0"
                        max="10"
                        value={syllableBorderSize}
                        onChange={(e) => setSyllableBorderSize(parseInt(e.target.value, 10) || 0)}
                        placeholder="2"
                        className="text-right"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        גודל המסגרת שמקיפה כל הברה בפיקסלים (0-10) - ברירת מחדל
                      </p>
                    </div>

                    {/* Background Color Input */}
                    <div className="space-y-2">
                      <Label htmlFor="syllable-background-color" className="text-right block text-base">
                        צבע רקע הברה
                      </Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="syllable-background-color"
                          type="color"
                          value={syllableBackgroundColor}
                          onChange={(e) => setSyllableBackgroundColor(e.target.value)}
                          className="w-20 h-10 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={syllableBackgroundColor}
                          onChange={(e) => setSyllableBackgroundColor(e.target.value)}
                          placeholder="#dbeafe"
                          className="flex-1 text-right font-mono"
                          dir="rtl"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-right">
                        צבע הרקע של כל הברה (hex color או שם צבע) - ברירת מחדל
                      </p>
                    </div>

                    {/* Word Spacing Input */}
                    <div className="space-y-2">
                      <Label htmlFor="word-spacing" className="text-right block text-base">
                        מרחק בין מילים (פיקסלים)
                      </Label>
                      <Input
                        id="word-spacing"
                        type="number"
                        min="0"
                        max="50"
                        value={wordSpacing}
                        onChange={(e) => setWordSpacing(parseInt(e.target.value, 10) || 0)}
                        placeholder="12"
                        className="text-right"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        המרחק בין מילה למילה בתצוגת ההברות בפיקסלים (0-50) - ברירת מחדל
                      </p>
                    </div>

                    {/* Letter Spacing Input */}
                    <div className="space-y-2">
                      <Label htmlFor="letter-spacing" className="text-right block text-base">
                        מרחק בין אותיות (פיקסלים)
                      </Label>
                      <Input
                        id="letter-spacing"
                        type="number"
                        min="0"
                        max="20"
                        value={letterSpacing}
                        onChange={(e) => setLetterSpacing(parseInt(e.target.value, 10) || 0)}
                        placeholder="0"
                        className="text-right"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        המרחק בין אות לאות בכל מצבי הקפיצה בפיקסלים (0-20) - ברירת מחדל
                      </p>
                    </div>

                    {/* Word Highlight Padding */}
                    <div className="space-y-2">
                      <Label htmlFor="word-highlight-padding" className="text-right block text-base">
                        גודל רקע מילה (פיקסלים)
                      </Label>
                      <Input
                        id="word-highlight-padding"
                        type="number"
                        min="0"
                        max="20"
                        value={wordHighlightPadding}
                        onChange={(e) => setWordHighlightPadding(parseInt(e.target.value, 10) || 0)}
                        placeholder="4"
                        className="text-right"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        גודל הרקע שמקיף מילה בעת הדגשה בפיקסלים (0-20) - ברירת מחדל
                      </p>
                    </div>

                    {/* Word Highlight Color */}
                    <div className="space-y-2">
                      <Label htmlFor="word-highlight-color" className="text-right block text-base">
                        צבע רקע מילה
                      </Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="word-highlight-color"
                          type="color"
                          value={wordHighlightColor}
                          onChange={(e) => setWordHighlightColor(e.target.value)}
                          className="w-20 h-10 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={wordHighlightColor}
                          onChange={(e) => setWordHighlightColor(e.target.value)}
                          placeholder="#fff176"
                          className="flex-1 text-right font-mono"
                          dir="rtl"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-right">
                        צבע הרקע של מילה בעת הדגשה (hex color) - ברירת מחדל
                      </p>
                    </div>

                    {/* Syllable Highlight Padding */}
                    <div className="space-y-2">
                      <Label htmlFor="syllable-highlight-padding" className="text-right block text-base">
                        גודל רקע הברה (פיקסלים)
                      </Label>
                      <Input
                        id="syllable-highlight-padding"
                        type="number"
                        min="0"
                        max="20"
                        value={syllableHighlightPadding}
                        onChange={(e) => setSyllableHighlightPadding(parseInt(e.target.value, 10) || 0)}
                        placeholder="3"
                        className="text-right"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        גודל הרקע שמקיף הברה בעת הדגשה בפיקסלים (0-20) - ברירת מחדל
                      </p>
                    </div>

                    {/* Syllable Highlight Color */}
                    <div className="space-y-2">
                      <Label htmlFor="syllable-highlight-color" className="text-right block text-base">
                        צבע רקע הברה
                      </Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="syllable-highlight-color"
                          type="color"
                          value={syllableHighlightColor}
                          onChange={(e) => setSyllableHighlightColor(e.target.value)}
                          className="w-20 h-10 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={syllableHighlightColor}
                          onChange={(e) => setSyllableHighlightColor(e.target.value)}
                          placeholder="#fff176"
                          className="flex-1 text-right font-mono"
                          dir="rtl"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-right">
                        צבע הרקע של הברה בעת הדגשה (hex color) - ברירת מחדל
                      </p>
                    </div>

                    {/* Letter Highlight Padding */}
                    <div className="space-y-2">
                      <Label htmlFor="letter-highlight-padding" className="text-right block text-base">
                        גודל רקע אות (פיקסלים)
                      </Label>
                      <Input
                        id="letter-highlight-padding"
                        type="number"
                        min="0"
                        max="20"
                        value={letterHighlightPadding}
                        onChange={(e) => setLetterHighlightPadding(parseInt(e.target.value, 10) || 0)}
                        placeholder="2"
                        className="text-right"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        גודל הרקע שמקיף אות בעת הדגשה בפיקסלים (0-20) - ברירת מחדל
                      </p>
                    </div>

                    {/* Letter Highlight Color */}
                    <div className="space-y-2">
                      <Label htmlFor="letter-highlight-color" className="text-right block text-base">
                        צבע רקע אות
                      </Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="letter-highlight-color"
                          type="color"
                          value={letterHighlightColor}
                          onChange={(e) => setLetterHighlightColor(e.target.value)}
                          className="w-20 h-10 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={letterHighlightColor}
                          onChange={(e) => setLetterHighlightColor(e.target.value)}
                          placeholder="#fff176"
                          className="flex-1 text-right font-mono"
                          dir="rtl"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-right">
                        צבע הרקע של אות בעת הדגשה (hex color) - ברירת מחדל
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </main>
  );
}


