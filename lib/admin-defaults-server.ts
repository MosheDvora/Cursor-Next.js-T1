/**
 * Admin defaults management utilities (Server-side only)
 * Handles reading and writing app-wide default values from/to Supabase app_defaults table
 * This file should only be imported in server components or API routes
 * 
 * These defaults are used for:
 * - New users (initial values)
 * - Anonymous users (users without authentication)
 * - Fallback values when user doesn't have a specific setting
 * - Reset functionality for existing users
 */

import { createClient } from '@/lib/supabase/server';
import { AppSettings } from './settings';

/**
 * Interface for app defaults stored in database
 * Each key represents a setting, and the value can be any JSON-serializable type
 */
export interface AppDefaults {
  [key: string]: unknown;
}

/**
 * Mapping between AppSettings keys and database keys
 * This ensures consistent naming between the frontend and database
 */
const SETTINGS_KEY_MAP: Record<keyof AppSettings, string> = {
  // Niqqud settings
  niqqudSystemPrompt: 'niqqud_system_prompt',
  niqqudUserPrompt: 'niqqud_user_prompt',
  niqqudCompletionSystemPrompt: 'niqqud_completion_system_prompt',
  niqqudCompletionUserPrompt: 'niqqud_completion_user_prompt',
  niqqudTemperature: 'niqqud_temperature',
  niqqudModel: 'niqqud_model',
  // Syllables settings
  syllablesPrompt: 'syllables_prompt',
  syllablesTemperature: 'syllables_temperature',
  syllablesModel: 'syllables_model',
  // Appearance settings
  syllableBorderSize: 'syllable_border_size',
  syllableBackgroundColor: 'syllable_background_color',
  wordSpacing: 'word_spacing',
  letterSpacing: 'letter_spacing',
  fontSize: 'font_size',
  wordHighlightPadding: 'word_highlight_padding',
  syllableHighlightPadding: 'syllable_highlight_padding',
  letterHighlightPadding: 'letter_highlight_padding',
  wordHighlightColor: 'word_highlight_color',
  syllableHighlightColor: 'syllable_highlight_color',
  letterHighlightColor: 'letter_highlight_color',
  // Legacy fields (for backward compatibility)
  apiKey: 'api_key',
  model: 'model',
  niqqudApiKey: 'niqqud_api_key',
  niqqudPrompt: 'niqqud_prompt',
  syllablesApiKey: 'syllables_api_key',
};

/**
 * Reverse mapping: from database key to AppSettings key
 */
const REVERSE_KEY_MAP: Record<string, keyof AppSettings> = Object.fromEntries(
  Object.entries(SETTINGS_KEY_MAP).map(([k, v]) => [v, k as keyof AppSettings])
);

/**
 * Check if the current user is an admin
 * @returns true if user is authenticated and is an admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return false;
    }

    // Fetch user profile and check is_admin flag
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return false;
    }

    return profile.is_admin === true;
  } catch (error) {
    console.error('[AdminDefaults] Error checking admin status:', error);
    return false;
  }
}

/**
 * Get all app defaults from database
 * @returns AppDefaults object with all default values, or empty object if none exist
 * @throws Error if user is not an admin
 */
export async function getAppDefaults(): Promise<AppDefaults> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Only admins can access app defaults');
  }

  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('app_defaults')
      .select('key, value');

    if (error) {
      console.error('[AdminDefaults] Error fetching defaults:', error);
      return {};
    }

    // Convert array of {key, value} to object
    const defaults: AppDefaults = {};
    if (data) {
      for (const item of data) {
        defaults[item.key] = item.value;
      }
    }

    return defaults;
  } catch (error) {
    console.error('[AdminDefaults] Error getting defaults:', error);
    return {};
  }
}

/**
 * Get app defaults as AppSettings object
 * Converts database keys to AppSettings keys
 * @returns Partial<AppSettings> with default values
 */
export async function getAppDefaultsAsSettings(): Promise<Partial<AppSettings>> {
  const defaults = await getAppDefaults();
  const settings: Partial<AppSettings> = {};

  // Convert database keys to AppSettings keys
  for (const [dbKey, value] of Object.entries(defaults)) {
    const settingsKey = REVERSE_KEY_MAP[dbKey];
    if (settingsKey) {
      (settings as Record<string, unknown>)[settingsKey] = value;
    }
  }

  return settings;
}

/**
 * Get a specific default value by key
 * @param key - The database key (e.g., 'niqqud_system_prompt')
 * @returns The default value, or null if not found
 */
export async function getDefaultValue(key: string): Promise<unknown> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Only admins can access app defaults');
  }

  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('app_defaults')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !data) {
      return null;
    }

    return data.value;
  } catch (error) {
    console.error('[AdminDefaults] Error getting default value:', error);
    return null;
  }
}

/**
 * Save app defaults to database
 * Converts AppSettings keys to database keys
 * @param defaults - Partial AppSettings object with default values to save
 * @returns true if successful, false otherwise
 * @throws Error if user is not an admin
 */
export async function saveAppDefaults(defaults: Partial<AppSettings>): Promise<boolean> {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error('Unauthorized: Only admins can save app defaults');
  }

  try {
    const supabase = await createClient();
    
    // Convert AppSettings keys to database keys and prepare upsert data
    const upsertData = Object.entries(defaults)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([settingsKey, value]) => {
        const dbKey = SETTINGS_KEY_MAP[settingsKey as keyof AppSettings] || settingsKey;
        return {
          key: dbKey,
          value: value as unknown,
        };
      });

    if (upsertData.length === 0) {
      return true; // Nothing to save
    }

    // Upsert all defaults (insert or update)
    const { error } = await supabase
      .from('app_defaults')
      .upsert(upsertData, {
        onConflict: 'key',
      });

    if (error) {
      console.error('[AdminDefaults] Error saving defaults:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[AdminDefaults] Error saving defaults:', error);
    return false;
  }
}

/**
 * Get app defaults for use in settings (non-admin access)
 * This function can be called by any user to get fallback defaults
 * It does not require admin privileges
 * @returns Partial<AppSettings> with default values, or empty object if none exist
 */
export async function getAppDefaultsForSettings(): Promise<Partial<AppSettings>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('app_defaults')
      .select('key, value');

    if (error) {
      // If error, return empty object (will use hardcoded defaults)
      console.warn('[AdminDefaults] Error fetching defaults for settings:', error);
      return {};
    }

    // Convert array of {key, value} to AppSettings object
    const settings: Partial<AppSettings> = {};
    if (data) {
      for (const item of data) {
        const settingsKey = REVERSE_KEY_MAP[item.key];
        if (settingsKey) {
          (settings as Record<string, unknown>)[settingsKey] = item.value;
        }
      }
    }

    return settings;
  } catch (error) {
    console.warn('[AdminDefaults] Error getting defaults for settings:', error);
    return {};
  }
}




