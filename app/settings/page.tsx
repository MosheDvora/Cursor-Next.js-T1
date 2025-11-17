"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Save } from "lucide-react";
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
  DEFAULT_MODELS,
  DEFAULT_NIQQUD_PROMPT,
  DEFAULT_SYLLABLES_PROMPT,
} from "@/lib/settings";

export default function SettingsPage() {
  const [niqqudApiKey, setNiqqudApiKey] = useState("");
  const [niqqudModel, setNiqqudModel] = useState(DEFAULT_MODELS[0].value);
  const [niqqudPrompt, setNiqqudPrompt] = useState(DEFAULT_NIQQUD_PROMPT);
  const [syllablesApiKey, setSyllablesApiKey] = useState("");
  const [syllablesModel, setSyllablesModel] = useState(DEFAULT_MODELS[0].value);
  const [syllablesPrompt, setSyllablesPrompt] = useState(DEFAULT_SYLLABLES_PROMPT);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const settings = getSettings();
    setNiqqudApiKey(settings.niqqudApiKey || "");
    setNiqqudModel(settings.niqqudModel || DEFAULT_MODELS[0].value);
    setNiqqudPrompt(settings.niqqudPrompt || DEFAULT_NIQQUD_PROMPT);
    setSyllablesApiKey(settings.syllablesApiKey || "");
    setSyllablesModel(settings.syllablesModel || DEFAULT_MODELS[0].value);
    setSyllablesPrompt(settings.syllablesPrompt || DEFAULT_SYLLABLES_PROMPT);
  }, []);

  const handleSave = () => {
    saveSettings({
      niqqudApiKey,
      niqqudModel,
      niqqudPrompt,
      syllablesApiKey,
      syllablesModel,
      syllablesPrompt,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
          <h1 className="text-4xl md:text-5xl font-bold text-right">
            הגדרות אישיות
          </h1>
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
              >
                כללי
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="w-full px-4 py-3 text-right data-[state=active]:bg-background data-[state=active]:shadow-sm"
                style={{ justifyContent: 'flex-start' }}
              >
                מראה
              </TabsTrigger>
              <TabsTrigger
                value="api"
                className="w-full px-4 py-3 text-right data-[state=active]:bg-background data-[state=active]:shadow-sm"
                style={{ justifyContent: 'flex-start' }}
              >
                API
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
                        type="password"
                        value={niqqudApiKey}
                        onChange={(e) => setNiqqudApiKey(e.target.value)}
                        placeholder="הכנס את ה-API Key שלך"
                        className="text-right"
                        dir="rtl"
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
                        בחר את מודל השפה שישמש להוספת ניקוד לטקסט
                      </p>
                    </div>

                    {/* Prompt Textarea */}
                    <div className="space-y-2">
                      <Label htmlFor="niqqud-prompt" className="text-right block text-base">
                        פרומפט למודל
                      </Label>
                      <Textarea
                        id="niqqud-prompt"
                        value={niqqudPrompt}
                        onChange={(e) => setNiqqudPrompt(e.target.value)}
                        placeholder="הכנס את הפרומפט שיישלח למודל"
                        className="text-right min-h-[120px] font-mono text-sm"
                        dir="rtl"
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הפרומפט שיישלח למודל לצורך ביצוע המשימה. השתמש ב-{"{text}"} כמקום לטקסט הקלט.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Area 2: טיפול בהברות */}
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
                        type="password"
                        value={syllablesApiKey}
                        onChange={(e) => setSyllablesApiKey(e.target.value)}
                        placeholder="הכנס את ה-API Key שלך"
                        className="text-right"
                        dir="rtl"
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
                      />
                      <p className="text-sm text-muted-foreground text-right">
                        הפרומפט שיישלח למודל לצורך ביצוע המשימה. השתמש ב-{"{text}"} כמקום לטקסט הקלט.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  className="w-full gap-2"
                  size="lg"
                  disabled={saved}
                >
                  <Save className="h-4 w-4" />
                  {saved ? "נשמר!" : "שמור הגדרות"}
                </Button>
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
                <div className="p-6 border rounded-lg bg-card shadow-sm">
                  <h2 className="text-2xl font-semibold text-right mb-4">
                    הגדרות מראה
                  </h2>
                  <p className="text-muted-foreground text-right">
                    הגדרות מראה יופיעו כאן בעתיד.
                  </p>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </main>
  );
}
