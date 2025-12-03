"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Save, RotateCcw } from "lucide-react";
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
  getSettings,
  saveSettings,
  getRawResponse,
  getWordSpacing,
  saveWordSpacing,
  resetToDefaults,
  getAppDefaults,
  DEFAULT_MODELS,
  DEFAULT_NIQQUD_PROMPT,
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
} from "@/lib/settings";

export default function SettingsPage() {
  const [niqqudApiKey, setNiqqudApiKey] = useState("");
  const [niqqudModel, setNiqqudModel] = useState(DEFAULT_MODELS[0].value);
  const [niqqudPrompt, setNiqqudPrompt] = useState(DEFAULT_NIQQUD_PROMPT);
  const [niqqudSystemPrompt, setNiqqudSystemPrompt] = useState(DEFAULT_NIQQUD_SYSTEM_PROMPT);
  const [niqqudUserPrompt, setNiqqudUserPrompt] = useState(DEFAULT_NIQQUD_USER_PROMPT);
  const [niqqudTemperature, setNiqqudTemperature] = useState(DEFAULT_TEMPERATURE);
  const [niqqudCompletionSystemPrompt, setNiqqudCompletionSystemPrompt] = useState(DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT);
  const [niqqudCompletionUserPrompt, setNiqqudCompletionUserPrompt] = useState(DEFAULT_NIQQUD_COMPLETION_USER_PROMPT);
  const [syllablesApiKey, setSyllablesApiKey] = useState("");
  const [syllablesModel, setSyllablesModel] = useState(DEFAULT_MODELS[0].value);
  const [syllablesPrompt, setSyllablesPrompt] = useState(DEFAULT_SYLLABLES_PROMPT);
  const [syllablesTemperature, setSyllablesTemperature] = useState(DEFAULT_TEMPERATURE);
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
  const [syllablesRawResponse, setSyllablesRawResponse] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = getSettings();
      setNiqqudApiKey(settings.niqqudApiKey || "");
      setNiqqudModel(settings.niqqudModel || DEFAULT_MODELS[0].value);
      setNiqqudPrompt(settings.niqqudPrompt || DEFAULT_NIQQUD_PROMPT);
      setNiqqudSystemPrompt(settings.niqqudSystemPrompt || DEFAULT_NIQQUD_SYSTEM_PROMPT);
      setNiqqudUserPrompt(settings.niqqudUserPrompt || DEFAULT_NIQQUD_USER_PROMPT);
      setNiqqudTemperature(settings.niqqudTemperature || DEFAULT_TEMPERATURE);
      setNiqqudCompletionSystemPrompt(settings.niqqudCompletionSystemPrompt || DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT);
      setNiqqudCompletionUserPrompt(settings.niqqudCompletionUserPrompt || DEFAULT_NIQQUD_COMPLETION_USER_PROMPT);
      setSyllablesApiKey(settings.syllablesApiKey || "");
      setSyllablesModel(settings.syllablesModel || DEFAULT_MODELS[0].value);
      setSyllablesPrompt(settings.syllablesPrompt || DEFAULT_SYLLABLES_PROMPT);
      setSyllablesTemperature(settings.syllablesTemperature || DEFAULT_TEMPERATURE);
      setSyllableBorderSize(settings.syllableBorderSize || DEFAULT_SYLLABLE_BORDER_SIZE);
      setSyllableBackgroundColor(settings.syllableBackgroundColor || DEFAULT_SYLLABLE_BACKGROUND_COLOR);
      
      // Load wordSpacing from preferences (authenticated) or localStorage (unauthenticated)
      const loadedWordSpacing = await getWordSpacing();
      setWordSpacing(loadedWordSpacing);
      
      setLetterSpacing(settings.letterSpacing || DEFAULT_LETTER_SPACING);
      setWordHighlightPadding(settings.wordHighlightPadding || DEFAULT_WORD_HIGHLIGHT_PADDING);
      setSyllableHighlightPadding(settings.syllableHighlightPadding || DEFAULT_SYLLABLE_HIGHLIGHT_PADDING);
      setLetterHighlightPadding(settings.letterHighlightPadding || DEFAULT_LETTER_HIGHLIGHT_PADDING);
      setWordHighlightColor(settings.wordHighlightColor || DEFAULT_WORD_HIGHLIGHT_COLOR);
      setSyllableHighlightColor(settings.syllableHighlightColor || DEFAULT_SYLLABLE_HIGHLIGHT_COLOR);
      setLetterHighlightColor(settings.letterHighlightColor || DEFAULT_LETTER_HIGHLIGHT_COLOR);
      setSyllablesRawResponse(getRawResponse());
    };
    
    loadSettings();
  }, []);

  const handleSave = async () => {
    // Save wordSpacing to preferences (authenticated) and localStorage (backup)
    await saveWordSpacing(wordSpacing);
    
    // Save other settings to localStorage
    saveSettings({
      niqqudApiKey,
      niqqudModel,
      niqqudPrompt,
      niqqudSystemPrompt,
      niqqudUserPrompt,
      niqqudTemperature,
      niqqudCompletionSystemPrompt,
      niqqudCompletionUserPrompt,
      syllablesApiKey,
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
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    if (!confirm("האם אתה בטוח שברצונך לאפס את כל ההגדרות לערכי ברירת המחדל?")) {
      return;
    }

    setResetting(true);
    try {
      const success = await resetToDefaults();
      if (success) {
        // Reload settings after reset
        const defaults = await getAppDefaults();
        
        // Update state with reset values
        setNiqqudModel((defaults.niqqudModel as string) || DEFAULT_MODELS[0].value);
        setNiqqudSystemPrompt((defaults.niqqudSystemPrompt as string) || DEFAULT_NIQQUD_SYSTEM_PROMPT);
        setNiqqudUserPrompt((defaults.niqqudUserPrompt as string) || DEFAULT_NIQQUD_USER_PROMPT);
        setNiqqudTemperature((defaults.niqqudTemperature as number) ?? DEFAULT_TEMPERATURE);
        setNiqqudCompletionSystemPrompt((defaults.niqqudCompletionSystemPrompt as string) || DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT);
        setNiqqudCompletionUserPrompt((defaults.niqqudCompletionUserPrompt as string) || DEFAULT_NIQQUD_COMPLETION_USER_PROMPT);
        setSyllablesModel((defaults.syllablesModel as string) || DEFAULT_MODELS[0].value);
        setSyllablesPrompt((defaults.syllablesPrompt as string) || DEFAULT_SYLLABLES_PROMPT);
        setSyllablesTemperature((defaults.syllablesTemperature as number) ?? DEFAULT_TEMPERATURE);
        setSyllableBorderSize((defaults.syllableBorderSize as number) ?? DEFAULT_SYLLABLE_BORDER_SIZE);
        setSyllableBackgroundColor((defaults.syllableBackgroundColor as string) || DEFAULT_SYLLABLE_BACKGROUND_COLOR);
        
        const loadedWordSpacing = await getWordSpacing();
        setWordSpacing(loadedWordSpacing);
        
        setLetterSpacing((defaults.letterSpacing as number) ?? DEFAULT_LETTER_SPACING);
        setWordHighlightPadding((defaults.wordHighlightPadding as number) ?? DEFAULT_WORD_HIGHLIGHT_PADDING);
        setSyllableHighlightPadding((defaults.syllableHighlightPadding as number) ?? DEFAULT_SYLLABLE_HIGHLIGHT_PADDING);
        setLetterHighlightPadding((defaults.letterHighlightPadding as number) ?? DEFAULT_LETTER_HIGHLIGHT_PADDING);
        setWordHighlightColor((defaults.wordHighlightColor as string) || DEFAULT_WORD_HIGHLIGHT_COLOR);
        setSyllableHighlightColor((defaults.syllableHighlightColor as string) || DEFAULT_SYLLABLE_HIGHLIGHT_COLOR);
        setLetterHighlightColor((defaults.letterHighlightColor as string) || DEFAULT_LETTER_HIGHLIGHT_COLOR);
        
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-12" dir="rtl">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" data-testid="settings-back-home-link">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowRight className="h-6 w-6" />
              <span className="sr-only">חזרה לעמוד הבית</span>
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-right">
            הגדרות אישיות
          </h1>
        </div>

        {/* Save and Reset Buttons - Accessible from all tabs */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <Button
            onClick={handleSave}
            className="w-full md:w-auto gap-2"
            size="lg"
            disabled={saved}
            data-testid="settings-save-button"
          >
            <Save className="h-4 w-4" />
            {saved ? "נשמר!" : "שמור הגדרות"}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full md:w-auto gap-2"
            size="lg"
            disabled={resetting}
            data-testid="settings-reset-button"
          >
            <RotateCcw className="h-4 w-4" />
            {resetting ? "מאפס..." : "איפוס להגדרות ברירת מחדל"}
          </Button>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="w-full" dir="rtl">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Vertical Tabs List - Left Side */}
            <TabsList className="flex flex-col h-auto w-full md:w-56 p-2 bg-muted rounded-lg space-y-1">
              <TabsTrigger
                value="general"
                className="w-full px-4 py-3 text-right data-[state=active]:bg-background data-[state=active]:shadow-sm"
                style={{ justifyContent: 'flex-start' }}
                data-testid="settings-tab-general"
              >
                כללי
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="w-full px-4 py-3 text-right data-[state=active]:bg-background data-[state=active]:shadow-sm"
                style={{ justifyContent: 'flex-start' }}
                data-testid="settings-tab-appearance"
              >
                מראה
              </TabsTrigger>
              <TabsTrigger
                value="api"
                className="w-full px-4 py-3 text-right data-[state=active]:bg-background data-[state=active]:shadow-sm"
                style={{ justifyContent: 'flex-start' }}
                data-testid="settings-tab-models"
              >
                מודלים
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
                    {/* API Key Input */}
                    <div className="space-y-2">
                      <Label htmlFor="niqqud-api-key" className="text-right block text-base">
                        API Key
                      </Label>
                      <Input
                        id="niqqud-api-key"
                        type="text"
                        value={niqqudApiKey}
                        onChange={(e) => setNiqqudApiKey(e.target.value)}
                        placeholder="הכנס את ה-API Key שלך"
                        className="text-right font-mono"
                        dir="rtl"
                        data-testid="settings-niqqud-api-key-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        מפתח API למודל השפה (לדוגמה: OpenAI)
                      </p>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="niqqud-model" className="text-right block text-base">
                        מודל שפה
                      </Label>
                      <Select value={niqqudModel} onValueChange={setNiqqudModel}>
                        <SelectTrigger id="niqqud-model" className="text-right" dir="rtl" data-testid="settings-niqqud-model-select">
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
                        בחר את מודל השפה שישמש להוספת ניקוד לטקסט
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
                        data-testid="settings-niqqud-system-prompt-textarea"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הוראות ברמת המערכת שמגדירות את תפקיד המודל
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
                        data-testid="settings-niqqud-user-prompt-textarea"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הבקשה למשתמש. השתמש ב-{"{text}"} כמקום לטקסט הקלט.
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
                        data-testid="settings-niqqud-temperature-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        רמת היצירתיות של המודל (0-2). ערך נמוך יותר = תגובות יותר דטרמיניסטיות. ברירת מחדל: 0.2
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
                    הגדרות עבור השלמת ניקוד בטקסט שכבר מכיל ניקוד חלקי
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
                        data-testid="settings-niqqud-completion-system-prompt-textarea"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הוראות למודל לשמירה על ניקוד קיים והוספת ניקוד חסר בלבד
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
                        data-testid="settings-niqqud-completion-user-prompt-textarea"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הבקשה למודל. השתמש ב-{"{text}"} כמקום לטקסט עם הניקוד החלקי.
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
                    {/* API Key Input */}
                    <div className="space-y-2">
                      <Label htmlFor="syllables-api-key" className="text-right block text-base">
                        API Key
                      </Label>
                      <Input
                        id="syllables-api-key"
                        type="text"
                        value={syllablesApiKey}
                        onChange={(e) => setSyllablesApiKey(e.target.value)}
                        placeholder="הכנס את ה-API Key שלך"
                        className="text-right font-mono"
                        dir="rtl"
                        data-testid="settings-syllables-api-key-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        מפתח API למודל השפה (לדוגמה: OpenAI)
                      </p>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="syllables-model" className="text-right block text-base">
                        מודל שפה
                      </Label>
                      <Select value={syllablesModel} onValueChange={setSyllablesModel}>
                        <SelectTrigger id="syllables-model" className="text-right" dir="rtl" data-testid="settings-syllables-model-select">
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
                        בחר את מודל השפה שישמש לחלוקה להברות
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
                        data-testid="settings-syllables-prompt-textarea"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הפרומפט שיישלח למודל לצורך ביצוע המשימה. השתמש ב-{"{text}"} כמקום לטקסט הקלט.
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
                        data-testid="settings-syllables-temperature-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        רמת היצירתיות של המודל (0-2). ערך נמוך יותר = תגובות יותר דטרמיניסטיות. ברירת מחדל: 0.2
                      </p>
                    </div>

                    {/* Raw Response Display */}
                    {syllablesRawResponse && (
                      <div className="space-y-2 mt-4">
                        <Label className="text-right block text-base">
                          תגובה גולמית מהמודל
                        </Label>
                        <div className="p-4 border rounded-lg bg-muted">
                          <pre className="text-xs overflow-auto text-right bg-background p-3 rounded border whitespace-pre-wrap" dir="rtl" data-testid="settings-syllables-raw-response-display">
                            {syllablesRawResponse}
                          </pre>
                        </div>
                        <p className="text-sm text-muted-foreground text-right">
                          התגובה הגולמית האחרונה מהמודל לחלוקה להברות
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* General Tab */}
              <TabsContent value="general" className="mt-0">
                <div className="p-6 border rounded-lg bg-card shadow-sm">
                  <h2 className="text-2xl font-semibold text-right mb-4">
                    הגדרות כלליות
                  </h2>
                  <p className="text-muted-foreground text-right">
                    הגדרות כלליות יופיעו כאן בעתיד.
                  </p>
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
                        data-testid="settings-syllable-border-size-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        גודל המסגרת שמקיפה כל הברה בפיקסלים (0-10)
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
                          data-testid="settings-syllable-background-color-picker"
                        />
                        <Input
                          type="text"
                          value={syllableBackgroundColor}
                          onChange={(e) => setSyllableBackgroundColor(e.target.value)}
                          placeholder="#dbeafe"
                          className="flex-1 text-right font-mono"
                          dir="rtl"
                          data-testid="settings-syllable-background-color-input"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-right">
                        צבע הרקע של כל הברה (hex color או שם צבע)
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
                        data-testid="settings-word-spacing-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        המרחק בין מילה למילה בתצוגת ההברות בפיקסלים (0-50)
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
                        data-testid="settings-letter-spacing-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        המרחק בין אות לאות בכל מצבי הקפיצה בפיקסלים (0-20)
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
                        data-testid="settings-word-highlight-padding-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        גודל הרקע שמקיף מילה בעת הדגשה בפיקסלים (0-20)
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
                          data-testid="settings-word-highlight-color-picker"
                        />
                        <Input
                          type="text"
                          value={wordHighlightColor}
                          onChange={(e) => setWordHighlightColor(e.target.value)}
                          placeholder="#fff176"
                          className="flex-1 text-right font-mono"
                          dir="rtl"
                          data-testid="settings-word-highlight-color-input"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-right">
                        צבע הרקע של מילה בעת הדגשה (hex color)
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
                        data-testid="settings-syllable-highlight-padding-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        גודל הרקע שמקיף הברה בעת הדגשה בפיקסלים (0-20)
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
                          data-testid="settings-syllable-highlight-color-picker"
                        />
                        <Input
                          type="text"
                          value={syllableHighlightColor}
                          onChange={(e) => setSyllableHighlightColor(e.target.value)}
                          placeholder="#fff176"
                          className="flex-1 text-right font-mono"
                          dir="rtl"
                          data-testid="settings-syllable-highlight-color-input"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-right">
                        צבע הרקע של הברה בעת הדגשה (hex color)
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
                        data-testid="settings-letter-highlight-padding-input"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        גודל הרקע שמקיף אות בעת הדגשה בפיקסלים (0-20)
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
                          data-testid="settings-letter-highlight-color-picker"
                        />
                        <Input
                          type="text"
                          value={letterHighlightColor}
                          onChange={(e) => setLetterHighlightColor(e.target.value)}
                          placeholder="#fff176"
                          className="flex-1 text-right font-mono"
                          dir="rtl"
                          data-testid="settings-letter-highlight-color-input"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-right">
                        צבע הרקע של אות בעת הדגשה (hex color)
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
