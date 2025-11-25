/**
 * Settings management utilities
 * Handles localStorage for app settings
 */

/**
 * Current position in syllables navigation
 */
export interface CurrentPosition {
  mode: "words" | "syllables" | "letters";
  wordIndex: number;      // Always required - which word is selected
  syllableIndex?: number; // Which syllable (if mode = syllables)
  letterIndex?: number;   // Which letter (if mode = letters)
}

export const SETTINGS_KEYS = {
  // Legacy keys (for backward compatibility)
  API_KEY: "niqqud_api_key",
  MODEL: "niqqud_model",
  // Niqqud settings
  NIQQUD_API_KEY: "niqqud_api_key",
  NIQQUD_MODEL: "niqqud_model",
  NIQQUD_PROMPT: "niqqud_prompt", // Legacy - will be replaced by system/user prompts
  NIQQUD_SYSTEM_PROMPT: "niqqud_system_prompt",
  NIQQUD_USER_PROMPT: "niqqud_user_prompt",
  NIQQUD_TEMPERATURE: "niqqud_temperature",
  // Niqqud Completion settings
  NIQQUD_COMPLETION_SYSTEM_PROMPT: "niqqud_completion_system_prompt",
  NIQQUD_COMPLETION_USER_PROMPT: "niqqud_completion_user_prompt",
  // Syllables settings
  SYLLABLES_API_KEY: "syllables_api_key",
  SYLLABLES_MODEL: "syllables_model",
  SYLLABLES_PROMPT: "syllables_prompt",
  SYLLABLES_TEMPERATURE: "syllables_temperature",
  // Appearance settings
  SYLLABLE_BORDER_SIZE: "syllable_border_size",
  SYLLABLE_BACKGROUND_COLOR: "syllable_background_color",
  WORD_SPACING: "word_spacing",
  LETTER_SPACING: "letter_spacing",
  FONT_SIZE: "font_size",
  WORD_HIGHLIGHT_PADDING: "word_highlight_padding",
  SYLLABLE_HIGHLIGHT_PADDING: "syllable_highlight_padding",
  LETTER_HIGHLIGHT_PADDING: "letter_highlight_padding",
  WORD_HIGHLIGHT_COLOR: "word_highlight_color",
  SYLLABLE_HIGHLIGHT_COLOR: "syllable_highlight_color",
  LETTER_HIGHLIGHT_COLOR: "letter_highlight_color",
  // Navigation settings
  SYLLABLES_CURRENT_POSITION: "syllables_current_position",
  SYLLABLES_RAW_RESPONSE: "syllables_raw_response",
} as const;

export interface AppSettings {
  // Legacy fields (for backward compatibility)
  apiKey?: string;
  model?: string;
  // Niqqud settings
  niqqudApiKey: string;
  niqqudModel: string;
  niqqudPrompt: string; // Legacy - for backward compatibility
  niqqudSystemPrompt: string;
  niqqudUserPrompt: string;
  niqqudTemperature: number;
  // Niqqud Completion settings
  niqqudCompletionSystemPrompt: string;
  niqqudCompletionUserPrompt: string;
  // Syllables settings
  syllablesApiKey: string;
  syllablesModel: string;
  syllablesPrompt: string;
  syllablesTemperature: number;
  // Appearance settings
  syllableBorderSize: number;
  syllableBackgroundColor: string;
  wordSpacing: number;
  letterSpacing: number;
  fontSize: number;
  wordHighlightPadding: number;
  syllableHighlightPadding: number;
  letterHighlightPadding: number;
  wordHighlightColor: string;
  syllableHighlightColor: string;
  letterHighlightColor: string;
}

/**
 * Default model options
 * The first model in the array is used as the default model
 */
export const DEFAULT_MODELS = [
  { value: "gpt-4-turbo", label: "GPT-4 Turbo (OpenAI)" },
  { value: "gpt-5-nano", label: "GPT-5 Nano (OpenAI)" },
  { value: "gpt-5-mini", label: "GPT-5 Mini (OpenAI)" },
  { value: "gpt-4o", label: "GPT-4o (OpenAI)" },
  { value: "gpt-4", label: "GPT-4 (OpenAI)" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (OpenAI)" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Google)" },
  { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Google)" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Google)" },
  { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Google)" },
];

/**
 * Default prompts for regular niqqud addition (no niqqud at all)
 */
export const DEFAULT_NIQQUD_SYSTEM_PROMPT = `אתה מומחה בעברית. המשימה שלך היא להוסיף ניקוד מלא לטקסט עברי. החזר רק את הטקסט המנוקד ללא הסברים נוספים.`;

export const DEFAULT_NIQQUD_USER_PROMPT = `הוסף ניקוד מלא לטקסט הבא:

{text}`;

/**
 * Default prompts for niqqud completion (partial niqqud exists)
 */
export const DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT = `אתה מומחה בעברית ובניקוד. המשימה שלך היא להשלים את הניקוד בטקסט עברי שכבר מכיל ניקוד חלקי. שמור על הניקוד הקיים והוסף ניקוד רק למקומות שחסר.`;

export const DEFAULT_NIQQUD_COMPLETION_USER_PROMPT = `הטקסט הבא מכיל ניקוד חלקי. אנא השלם את הניקוד החסר בלבד. אל תסיר או תשנה את הניקוד הקיים. החזר רק את הטקסט המנוקד במלואו ללא הסברים נוספים.

{text}`;

/**
 * Legacy default niqqud prompt (for backward compatibility)
 * Will be replaced by system/user prompts above
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
 * Default appearance settings
 */
export const DEFAULT_SYLLABLE_BORDER_SIZE = 2; // pixels
export const DEFAULT_SYLLABLE_BACKGROUND_COLOR = "#dbeafe"; // blue-50
export const DEFAULT_WORD_SPACING = 12; // pixels (gap-x-3 in Tailwind)
export const DEFAULT_LETTER_SPACING = 0; // pixels (letter-spacing)
export const DEFAULT_TEMPERATURE = 0.2; // Default temperature for model requests
export const DEFAULT_FONT_SIZE = 30; // pixels
export const DEFAULT_WORD_HIGHLIGHT_PADDING = 4; // pixels
export const DEFAULT_SYLLABLE_HIGHLIGHT_PADDING = 3; // pixels
export const DEFAULT_LETTER_HIGHLIGHT_PADDING = 2; // pixels
export const DEFAULT_WORD_HIGHLIGHT_COLOR = "#fff176"; // Light yellow
export const DEFAULT_SYLLABLE_HIGHLIGHT_COLOR = "#fff176"; // Light yellow
export const DEFAULT_LETTER_HIGHLIGHT_COLOR = "#fff176"; // Light yellow

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

// Get default API keys from environment variables
function getDefaultNiqqudApiKey(): string {
  if (typeof window === "undefined") {
    // Server-side: read from process.env
    return process.env.NIQQUD_API_KEY || process.env.NEXT_PUBLIC_NIQQUD_API_KEY || "";
  }
  // Client-side: environment variables are not available, return empty
  return "";
}

function getDefaultSyllablesApiKey(): string {
  if (typeof window === "undefined") {
    // Server-side: read from process.env
    return process.env.SYLLABLES_API_KEY || process.env.NEXT_PUBLIC_SYLLABLES_API_KEY || "";
  }
  // Client-side: environment variables are not available, return empty
  return "";
}

export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      niqqudApiKey: getDefaultNiqqudApiKey(),
      niqqudModel: DEFAULT_MODELS[0].value,
      niqqudPrompt: DEFAULT_NIQQUD_PROMPT,
      niqqudSystemPrompt: DEFAULT_NIQQUD_SYSTEM_PROMPT,
      niqqudUserPrompt: DEFAULT_NIQQUD_USER_PROMPT,
      niqqudTemperature: DEFAULT_TEMPERATURE,
      niqqudCompletionSystemPrompt: DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT,
      niqqudCompletionUserPrompt: DEFAULT_NIQQUD_COMPLETION_USER_PROMPT,
      syllablesApiKey: getDefaultSyllablesApiKey(),
      syllablesModel: DEFAULT_MODELS[0].value,
      syllablesPrompt: DEFAULT_SYLLABLES_PROMPT,
      syllablesTemperature: DEFAULT_TEMPERATURE,
      syllableBorderSize: DEFAULT_SYLLABLE_BORDER_SIZE,
      syllableBackgroundColor: DEFAULT_SYLLABLE_BACKGROUND_COLOR,
      wordSpacing: DEFAULT_WORD_SPACING,
      letterSpacing: DEFAULT_LETTER_SPACING,
      fontSize: DEFAULT_FONT_SIZE,
      wordHighlightPadding: DEFAULT_WORD_HIGHLIGHT_PADDING,
      syllableHighlightPadding: DEFAULT_SYLLABLE_HIGHLIGHT_PADDING,
      letterHighlightPadding: DEFAULT_LETTER_HIGHLIGHT_PADDING,
      wordHighlightColor: DEFAULT_WORD_HIGHLIGHT_COLOR,
      syllableHighlightColor: DEFAULT_SYLLABLE_HIGHLIGHT_COLOR,
      letterHighlightColor: DEFAULT_LETTER_HIGHLIGHT_COLOR,
    };
  }

  // Check for legacy settings and migrate them
  const legacyApiKey = localStorage.getItem(SETTINGS_KEYS.API_KEY);
  const legacyModel = localStorage.getItem(SETTINGS_KEYS.MODEL);

  // If legacy settings exist but new ones don't, migrate them
  // Also check for environment variables as default (NEXT_PUBLIC_ prefix required for client-side access)
  const defaultNiqqudApiKey = process.env.NEXT_PUBLIC_NIQQUD_API_KEY || "";
  const defaultSyllablesApiKey = process.env.NEXT_PUBLIC_SYLLABLES_API_KEY || "";

  const niqqudApiKey =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_API_KEY) || legacyApiKey || defaultNiqqudApiKey;
  const niqqudModel =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_MODEL) || legacyModel || DEFAULT_MODELS[0].value;
  const niqqudPrompt =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_PROMPT) || DEFAULT_NIQQUD_PROMPT;
  const niqqudSystemPrompt =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_SYSTEM_PROMPT) || DEFAULT_NIQQUD_SYSTEM_PROMPT;
  const niqqudUserPrompt =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_USER_PROMPT) || DEFAULT_NIQQUD_USER_PROMPT;
  const niqqudTemperature = parseFloat(
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_TEMPERATURE) || String(DEFAULT_TEMPERATURE)
  );
  const niqqudCompletionSystemPrompt =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_COMPLETION_SYSTEM_PROMPT) || DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT;
  const niqqudCompletionUserPrompt =
    localStorage.getItem(SETTINGS_KEYS.NIQQUD_COMPLETION_USER_PROMPT) || DEFAULT_NIQQUD_COMPLETION_USER_PROMPT;

  const syllablesApiKey = localStorage.getItem(SETTINGS_KEYS.SYLLABLES_API_KEY) || legacyApiKey || defaultSyllablesApiKey;
  const syllablesModel =
    localStorage.getItem(SETTINGS_KEYS.SYLLABLES_MODEL) || legacyModel || DEFAULT_MODELS[0].value;
  const syllablesTemperature = parseFloat(
    localStorage.getItem(SETTINGS_KEYS.SYLLABLES_TEMPERATURE) || String(DEFAULT_TEMPERATURE)
  );

  // For syllables prompt: use saved value only if it's different from the current default
  // This ensures that if user hasn't customized it, they get the updated default
  // If saved value matches current default, it means user hasn't customized, so use new default
  const savedSyllablesPrompt = localStorage.getItem(SETTINGS_KEYS.SYLLABLES_PROMPT);

  // If saved value exists and is different from current default, user customized it - use saved value
  // Otherwise, use the current default (which may be updated)
  const syllablesPrompt =
    savedSyllablesPrompt && savedSyllablesPrompt !== DEFAULT_SYLLABLES_PROMPT
      ? savedSyllablesPrompt
      : DEFAULT_SYLLABLES_PROMPT;

  // Appearance settings
  const syllableBorderSize = parseInt(
    localStorage.getItem(SETTINGS_KEYS.SYLLABLE_BORDER_SIZE) || String(DEFAULT_SYLLABLE_BORDER_SIZE),
    10
  );
  const syllableBackgroundColor =
    localStorage.getItem(SETTINGS_KEYS.SYLLABLE_BACKGROUND_COLOR) || DEFAULT_SYLLABLE_BACKGROUND_COLOR;
  const wordSpacing = parseInt(
    localStorage.getItem(SETTINGS_KEYS.WORD_SPACING) || String(DEFAULT_WORD_SPACING),
    10
  );
  const letterSpacing = parseInt(
    localStorage.getItem(SETTINGS_KEYS.LETTER_SPACING) || String(DEFAULT_LETTER_SPACING),
    10
  );
  const fontSize = parseInt(
    localStorage.getItem(SETTINGS_KEYS.FONT_SIZE) || String(DEFAULT_FONT_SIZE),
    10
  );
  const wordHighlightPadding = parseInt(
    localStorage.getItem(SETTINGS_KEYS.WORD_HIGHLIGHT_PADDING) || String(DEFAULT_WORD_HIGHLIGHT_PADDING),
    10
  );
  const syllableHighlightPadding = parseInt(
    localStorage.getItem(SETTINGS_KEYS.SYLLABLE_HIGHLIGHT_PADDING) || String(DEFAULT_SYLLABLE_HIGHLIGHT_PADDING),
    10
  );
  const letterHighlightPadding = parseInt(
    localStorage.getItem(SETTINGS_KEYS.LETTER_HIGHLIGHT_PADDING) || String(DEFAULT_LETTER_HIGHLIGHT_PADDING),
    10
  );
  const wordHighlightColor = localStorage.getItem(SETTINGS_KEYS.WORD_HIGHLIGHT_COLOR) || DEFAULT_WORD_HIGHLIGHT_COLOR;
  const syllableHighlightColor = localStorage.getItem(SETTINGS_KEYS.SYLLABLE_HIGHLIGHT_COLOR) || DEFAULT_SYLLABLE_HIGHLIGHT_COLOR;
  const letterHighlightColor = localStorage.getItem(SETTINGS_KEYS.LETTER_HIGHLIGHT_COLOR) || DEFAULT_LETTER_HIGHLIGHT_COLOR;

  return {
    apiKey: legacyApiKey || "", // Keep for backward compatibility
    model: legacyModel || DEFAULT_MODELS[0].value, // Keep for backward compatibility
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
    fontSize,
    wordHighlightPadding,
    syllableHighlightPadding,
    letterHighlightPadding,
    wordHighlightColor,
    syllableHighlightColor,
    letterHighlightColor,
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

  if (settings.niqqudSystemPrompt !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.NIQQUD_SYSTEM_PROMPT, settings.niqqudSystemPrompt);
  }

  if (settings.niqqudUserPrompt !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.NIQQUD_USER_PROMPT, settings.niqqudUserPrompt);
  }

  if (settings.niqqudTemperature !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.NIQQUD_TEMPERATURE, String(settings.niqqudTemperature));
  }

  if (settings.niqqudCompletionSystemPrompt !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.NIQQUD_COMPLETION_SYSTEM_PROMPT, settings.niqqudCompletionSystemPrompt);
  }

  if (settings.niqqudCompletionUserPrompt !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.NIQQUD_COMPLETION_USER_PROMPT, settings.niqqudCompletionUserPrompt);
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

  // Appearance settings
  if (settings.syllableBorderSize !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.SYLLABLE_BORDER_SIZE, String(settings.syllableBorderSize));
  }

  if (settings.syllableBackgroundColor !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.SYLLABLE_BACKGROUND_COLOR, settings.syllableBackgroundColor);
  }

  if (settings.wordSpacing !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.WORD_SPACING, String(settings.wordSpacing));
  }

  if (settings.letterSpacing !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.LETTER_SPACING, String(settings.letterSpacing));
  }

  if (settings.fontSize !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.FONT_SIZE, String(settings.fontSize));
  }

  if (settings.wordHighlightPadding !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.WORD_HIGHLIGHT_PADDING, String(settings.wordHighlightPadding));
  }

  if (settings.syllableHighlightPadding !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.SYLLABLE_HIGHLIGHT_PADDING, String(settings.syllableHighlightPadding));
  }

  if (settings.letterHighlightPadding !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.LETTER_HIGHLIGHT_PADDING, String(settings.letterHighlightPadding));
  }

  if (settings.wordHighlightColor !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.WORD_HIGHLIGHT_COLOR, settings.wordHighlightColor);
  }

  if (settings.syllableHighlightColor !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.SYLLABLE_HIGHLIGHT_COLOR, settings.syllableHighlightColor);
  }

  if (settings.letterHighlightColor !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.LETTER_HIGHLIGHT_COLOR, settings.letterHighlightColor);
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
  localStorage.removeItem(SETTINGS_KEYS.NIQQUD_SYSTEM_PROMPT);
  localStorage.removeItem(SETTINGS_KEYS.NIQQUD_USER_PROMPT);
  localStorage.removeItem(SETTINGS_KEYS.NIQQUD_COMPLETION_SYSTEM_PROMPT);
  localStorage.removeItem(SETTINGS_KEYS.NIQQUD_COMPLETION_USER_PROMPT);

  // Syllables keys
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_API_KEY);
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_MODEL);
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_PROMPT);
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_TEMPERATURE);

  // Appearance keys
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLE_BORDER_SIZE);
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLE_BACKGROUND_COLOR);
  localStorage.removeItem(SETTINGS_KEYS.WORD_SPACING);
  localStorage.removeItem(SETTINGS_KEYS.LETTER_SPACING);
  localStorage.removeItem(SETTINGS_KEYS.FONT_SIZE);
  localStorage.removeItem(SETTINGS_KEYS.WORD_HIGHLIGHT_PADDING);
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLE_HIGHLIGHT_PADDING);
  localStorage.removeItem(SETTINGS_KEYS.LETTER_HIGHLIGHT_PADDING);
  localStorage.removeItem(SETTINGS_KEYS.WORD_HIGHLIGHT_COLOR);
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLE_HIGHLIGHT_COLOR);
  localStorage.removeItem(SETTINGS_KEYS.LETTER_HIGHLIGHT_COLOR);

  // Navigation keys
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_CURRENT_POSITION);
  localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_RAW_RESPONSE);
}

/**
 * Save current position to localStorage
 */
export function saveCurrentPosition(position: CurrentPosition | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (position === null) {
      localStorage.removeItem(SETTINGS_KEYS.SYLLABLES_CURRENT_POSITION);
    } else {
      localStorage.setItem(SETTINGS_KEYS.SYLLABLES_CURRENT_POSITION, JSON.stringify(position));
    }
  } catch (error) {
    console.error("[Settings] Failed to save current position:", error);
  }
}

/**
 * Load current position from localStorage
 */
export function loadCurrentPosition(): CurrentPosition | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = localStorage.getItem(SETTINGS_KEYS.SYLLABLES_CURRENT_POSITION);
    if (!saved) {
      return null;
    }

    const position = JSON.parse(saved) as CurrentPosition;
    // Validate position structure
    if (position && typeof position.wordIndex === "number" && position.mode) {
      return position;
    }
    return null;
  } catch (error) {
    console.error("[Settings] Failed to load current position:", error);
    return null;
  }
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
      niqqudSystemPrompt: serverSettings.niqqudSystemPrompt || DEFAULT_NIQQUD_SYSTEM_PROMPT,
      niqqudUserPrompt: serverSettings.niqqudUserPrompt || DEFAULT_NIQQUD_USER_PROMPT,
      niqqudTemperature: serverSettings.niqqudTemperature || DEFAULT_TEMPERATURE,
      niqqudCompletionSystemPrompt: serverSettings.niqqudCompletionSystemPrompt || DEFAULT_NIQQUD_COMPLETION_SYSTEM_PROMPT,
      niqqudCompletionUserPrompt: serverSettings.niqqudCompletionUserPrompt || DEFAULT_NIQQUD_COMPLETION_USER_PROMPT,
      syllablesApiKey: serverSettings.syllablesApiKey || "",
      syllablesModel: serverSettings.syllablesModel || DEFAULT_MODELS[0].value,
      syllablesPrompt: serverSettings.syllablesPrompt || DEFAULT_SYLLABLES_PROMPT,
      syllablesTemperature: serverSettings.syllablesTemperature || DEFAULT_TEMPERATURE,
      syllableBorderSize: serverSettings.syllableBorderSize || DEFAULT_SYLLABLE_BORDER_SIZE,
      syllableBackgroundColor: serverSettings.syllableBackgroundColor || DEFAULT_SYLLABLE_BACKGROUND_COLOR,
      wordSpacing: serverSettings.wordSpacing || DEFAULT_WORD_SPACING,
      letterSpacing: serverSettings.letterSpacing || DEFAULT_LETTER_SPACING,
      fontSize: serverSettings.fontSize || DEFAULT_FONT_SIZE,
      wordHighlightPadding: serverSettings.wordHighlightPadding || DEFAULT_WORD_HIGHLIGHT_PADDING,
      syllableHighlightPadding: serverSettings.syllableHighlightPadding || DEFAULT_SYLLABLE_HIGHLIGHT_PADDING,
      letterHighlightPadding: serverSettings.letterHighlightPadding || DEFAULT_LETTER_HIGHLIGHT_PADDING,
      wordHighlightColor: serverSettings.wordHighlightColor || DEFAULT_WORD_HIGHLIGHT_COLOR,
      syllableHighlightColor: serverSettings.syllableHighlightColor || DEFAULT_SYLLABLE_HIGHLIGHT_COLOR,
      letterHighlightColor: serverSettings.letterHighlightColor || DEFAULT_LETTER_HIGHLIGHT_COLOR,
    };
  } catch (error) {
    console.warn("[Settings] Failed to fetch from server, using localStorage:", error);
    // Fallback to localStorage
    return getSettings();
  }
}

/**
 * Get raw response from localStorage
 */
export function getRawResponse(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(SETTINGS_KEYS.SYLLABLES_RAW_RESPONSE);
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

