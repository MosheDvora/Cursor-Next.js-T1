"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSettings, saveSettings, DEFAULT_MODELS } from "@/lib/settings";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODELS[0].value);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const settings = getSettings();
    setApiKey(settings.apiKey);
    setModel(settings.model);
  }, []);

  const handleSave = () => {
    saveSettings({ apiKey, model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="flex min-h-screen flex-col p-6 md:p-12">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="h-6 w-6" />
              <span className="sr-only">חזרה לעמוד הבית</span>
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-right">
            הגדרות אישיות
          </h1>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-right block text-base">
              API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
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
            <Label htmlFor="model" className="text-right block text-base">
              מודל שפה לניקוד
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model" className="text-right" dir="rtl">
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
        </div>
      </div>
    </main>
  );
}
