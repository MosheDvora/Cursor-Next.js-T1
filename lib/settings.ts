/**
 * Settings management utilities
 * Handles localStorage for app settings
 */

const SETTINGS_KEYS = {
  // Legacy keys (for backward compatibility)
  API_KEY: "niqqud_api_key",
  MODEL: "niqqud_model",
  // Niqqud settings
  NIQQUD_API_KEY: "niqqud_api_key",
  NIQQUD_MODEL: "niqqud_model",
  NIQQUD_PROMPT: "niqqud_prompt",
  // Syllables settings
  SYLLABLES_API_KEY: "syllables_api_key",
  SYLLABLES_MODEL: "syllables_model",
  SYLLABLES_PROMPT: "syllables_prompt",
} as const;

export interface AppSettings {
  // Legacy fields (for backward compatibility)
  apiKey?: string;
  model?: string;
  // Niqqud settings
  niqqudApiKey: string;
  niqqudModel: string;
  niqqudPrompt: string;
  // Syllables settings
  syllablesApiKey: string;
  syllablesModel: string;
  syllablesPrompt: string;
}

/**
 * Default model options
 */
export const DEFAULT_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (OpenAI)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo (OpenAI)" },
  { value: "gpt-4", label: "GPT-4 (OpenAI)" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (OpenAI)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Google)" },
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Google)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Google)" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Google)" },
];

/**
 * Default prompts
 */
export const DEFAULT_NIQQUD_PROMPT = `אתה מומחה בעברית. המשימה שלך היא להוסיף ניקוד מלא לטקסט עברי. החזר רק את הטקסט המנוקד ללא הסברים נוספים.

הוסף ניקוד מלא לטקסט הבא:

{text}`;

export const DEFAULT_SYLLABLES_PROMPT = `אתה מומחה בעברית. המשימה שלך היא לחלק טקסט עברי להברות לפי כללי העברית.

חלק את הטקסט הבא להברות והחזר את התוצאה בפורמט הבא:
- כל מילה בשורה נפרדת
- הברות מופרדות במקף (-) בלבד
- אין להשתמש בסימנים אחרים כמו כוכביות (*), נקודות (.), או רווחים
- כל מילה חייבת להיות מחולקת להברות, גם אם יש לה הברה אחת
- החלוקה צריכה להיות לפי כללי העברית - גם אם הטקסט לא מנוקד, חלק לפי ההגייה הנכונה
- אותה מילה תמיד תחולק באותו אופן - שמור על עקביות

דוגמאות מדויקות:

דוגמה 1 - טקסט מנוקד:
אם הטקסט הוא: "דני קם בבוקר שמח והלך לבית הספר"
התגובה צריכה להיות:
דַּ-נִי
קָם
בַּ-בֹּו-קֶר
שָׂ-מֵחַ
וְ-הָ-לַךְ
לְ-בֵית
הַ-סֵּ-פֶר

דוגמה 2 - טקסט לא מנוקד:
אם הטקסט הוא: "וחייכה"
התגובה צריכה להיות:
וְ-חִיי-כָה

או אם הטקסט הוא: "וחייכה" (בלי ניקוד)
התגובה צריכה להיות:
ו-חיי-כה

חשוב מאוד:
- החזר רק את הטקסט המחולק להברות
- ללא הסברים נוספים
- ללא טקסט נוסף לפני או אחרי
- ללא הערות או הסברים
- כל מילה בשורה נפרדת
- הברות מופרדות במקף (-) בלבד
- החלוקה לפי כללי העברית - גם בלי ניקוד, חלק לפי ההגייה הנכונה והעקבית

הטקסט לחלוקה:

{text}`;

/**
 * Get settings from localStorage
 */
/**
 * Check if a model is a Google Gemini model
 */
export function isGoogleModel(model: string): boolean {
  return model.startsWith("gemini-");
}

/**
 * Get API URL for a given model
 */
export function getApiUrl(model: string): string {
  if (isGoogleModel(model)) {
    return "https://generativelanguage.googleapis.com/v1beta/models";
  }
  return "https://api.openai.com/v1/chat/completions";
}

export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      niqqudApiKey: "",
      niqqudModel: DEFAULT_MODELS[0].value,
      niqqudPrompt: DEFAULT_NIQQUD_PROMPT,
      syllablesApiKey: "",
      syllablesModel: DEFAULT_MODELS[0].value,
      syllablesPrompt: DEFAULT_SYLLABLES_PROMPT,
    };
  }

  // Check for legacy settings and migrate them
  const legacyApiKey = localStorage.getItem(SETTINGS_KEYS.API_KEY);
  const legacyModel = localStorage.getItem(SETTINGS_KEYS.MODEL);

  // If legacy settings exist but new ones don't, migrate them
  const niqqudApiKey =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_API_KEY) || legacyApiKey || "";
  const niqqudModel =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_MODEL) || legacyModel || DEFAULT_MODELS[0].value;
  const niqqudPrompt =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_PROMPT) || DEFAULT_NIQQUD_PROMPT;

  const syllablesApiKey = localStorage.getItem(SETTINGS_KEYS.SYLLABLES_API_KEY) || legacyApiKey || "";
  const syllablesModel =
    localStorage.getItem(SETTINGS_KEYS.SYLLABLES_MODEL) || legacyModel || DEFAULT_MODELS[0].value;
  const syllablesPrompt =
    localStorage.getItem(SETTINGS_KEYS.SYLLABLES_PROMPT) || DEFAULT_SYLLABLES_PROMPT;

  return {
    apiKey: legacyApiKey || "", // Keep for backward compatibility
    model: legacyModel || DEFAULT_MODELS[0].value, // Keep for backward compatibility
    niqqudApiKey,
    niqqudModel,
    niqqudPrompt,
    syllablesApiKey,
    syllablesModel,
    syllablesPrompt,
  };
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: Partial<AppSettings>): void {
  if (typeof window === "undefined") {
    return;
  }

  // Legacy fields (for backward compatibility)
  if (settings.apiKey !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.API_KEY, settings.apiKey);
  }

  if (settings.model !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.MODEL, settings.model);
  }

  // Niqqud settings
  if (settings.niqqudApiKey !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.NIQQUD_API_KEY, settings.niqqudApiKey);
  }

  if (settings.niqqudModel !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.NIQQUD_MODEL, settings.niqqudModel);
  }

  if (settings.niqqudPrompt !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.NIQQUD_PROMPT, settings.niqqudPrompt);
  }

  // Syllables settings
  if (settings.syllablesApiKey !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.SYLLABLES_API_KEY, settings.syllablesApiKey);
  }

  if (settings.syllablesModel !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.SYLLABLES_MODEL, settings.syllablesModel);
  }

  if (settings.syllablesPrompt !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.SYLLABLES_PROMPT, settings.syllablesPrompt);
  }
}

/**
 * Clear all settings
 */
export function clearSettings(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Legacy keys
  localStorage.removeItem(SETTINGS_KEYS.API_KEY);
  localStorage.removeItem(SETTINGS_KEYS.MODEL);

  // Niqqud keys
  localStorage.removeItem(SETTINGS_KEYS.NIQQUD_API_KEY);
  localStorage.removeItem(SETTINGS_KEYS.NIQQUD_MODEL);
  localStorage.removeItem(SETTINGS_KEYS.NIQQUD_PROMPT);

  // Syllables keys
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_API_KEY);
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_MODEL);
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_PROMPT);
}

/**
 * Fetch settings from server API
 * Falls back to localStorage if API call fails
 */
export async function fetchSettingsFromServer(): Promise<AppSettings> {
  if (typeof window === "undefined") {
    return getSettings();
  }

  try {
    const response = await fetch("/api/settings", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const serverSettings = await response.json() as AppSettings;

    // Cache in localStorage
    saveSettings(serverSettings);

    return {
      niqqudApiKey: serverSettings.niqqudApiKey || "",
      niqqudModel: serverSettings.niqqudModel || DEFAULT_MODELS[0].value,
      niqqudPrompt: serverSettings.niqqudPrompt || DEFAULT_NIQQUD_PROMPT,
      syllablesApiKey: serverSettings.syllablesApiKey || "",
      syllablesModel: serverSettings.syllablesModel || DEFAULT_MODELS[0].value,
      syllablesPrompt: serverSettings.syllablesPrompt || DEFAULT_SYLLABLES_PROMPT,
    };
  } catch (error) {
    console.warn("[Settings] Failed to fetch from server, using localStorage:", error);
    // Fallback to localStorage
    return getSettings();
  }
}

/**
 * Save settings to server API
 * Also updates localStorage as cache
 */
export async function saveSettingsToServer(settings: Partial<AppSettings>): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    // Save to localStorage first (optimistic update)
    saveSettings(settings);

    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    // Update localStorage with server response (in case server modified data)
    if (result.settings) {
      saveSettings(result.settings);
    }

    return true;
  } catch (error) {
    console.error("[Settings] Failed to save to server:", error);
    // Settings already saved to localStorage, so return false but data is still cached
    return false;
  }
}

