/**
 * Settings management utilities
 * Handles localStorage for app settings
 */

const SETTINGS_KEYS = {
  API_KEY: "niqqud_api_key",
  MODEL: "niqqud_model",
} as const;

export interface AppSettings {
  apiKey: string;
  model: string;
}

/**
 * Default model options
 */
export const DEFAULT_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

/**
 * Get settings from localStorage
 */
export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      apiKey: "",
      model: DEFAULT_MODELS[0].value,
    };
  }

  return {
    apiKey: localStorage.getItem(SETTINGS_KEYS.API_KEY) || "",
    model: localStorage.getItem(SETTINGS_KEYS.MODEL) || DEFAULT_MODELS[0].value,
  };
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: Partial<AppSettings>): void {
  if (typeof window === "undefined") {
    return;
  }

  if (settings.apiKey !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.API_KEY, settings.apiKey);
  }

  if (settings.model !== undefined) {
    localStorage.setItem(SETTINGS_KEYS.MODEL, settings.model);
  }
}

/**
 * Clear all settings
 */
export function clearSettings(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SETTINGS_KEYS.API_KEY);
  localStorage.removeItem(SETTINGS_KEYS.MODEL);
}

