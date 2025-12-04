/**
 * User preferences management utilities (Client-side only)
 * Handles reading and writing user preferences from/to Supabase profiles table
 * This file is safe to import in client components
 */

'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Type definition for user preferences
 * This can be extended as more preferences are added
 */
export interface UserPreferences {
  wordSpacing?: number;
  // Add more preferences here as needed
}

/**
 * Default preferences values
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  wordSpacing: 12, // Default word spacing in pixels
};

/**
 * Client-side: Get user preferences from Supabase
 * Returns preferences for authenticated user, or null if not authenticated
 */
export async function getUserPreferencesClient(): Promise<UserPreferences | null> {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // User is not authenticated
      return null;
    }

    // Fetch user profile with preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[UserPreferences] Error fetching preferences:', profileError);
      return null;
    }

    // Return preferences, merging with defaults
    const preferences = (profile?.preferences as UserPreferences) || {};
    return {
      ...DEFAULT_PREFERENCES,
      ...preferences,
    };
  } catch (error) {
    console.error('[UserPreferences] Error getting preferences:', error);
    return null;
  }
}

/**
 * Client-side: Save user preferences to Supabase
 * Returns true if successful, false otherwise
 */
export async function saveUserPreferencesClient(
  preferences: Partial<UserPreferences>
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // User is not authenticated
      return false;
    }

    // Get current preferences
    const currentPreferences = await getUserPreferencesClient();
    const mergedPreferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...currentPreferences,
      ...preferences,
    };

    // Update preferences in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        preferences: mergedPreferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[UserPreferences] Error saving preferences:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[UserPreferences] Error saving preferences:', error);
    return false;
  }
}

/**
 * Check if user is authenticated (client-side)
 */
export async function isAuthenticatedClient(): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return !error && !!user;
  } catch {
    return false;
  }
}



