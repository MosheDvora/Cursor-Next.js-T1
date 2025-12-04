/**
 * User preferences management utilities (Server-side only)
 * Handles reading and writing user preferences from/to Supabase profiles table
 * This file should only be imported in server components or API routes
 */

import { createClient } from '@/lib/supabase/server';
import { DEFAULT_PREFERENCES, UserPreferences } from './user-preferences-client';

/**
 * Server-side: Get user preferences from Supabase
 * Returns preferences for authenticated user, or null if not authenticated
 */
export async function getUserPreferences(): Promise<UserPreferences | null> {
  try {
    const supabase = await createClient();
    
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
 * Server-side: Save user preferences to Supabase
 * Returns true if successful, false otherwise
 */
export async function saveUserPreferences(
  preferences: Partial<UserPreferences>
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
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
    const currentPreferences = await getUserPreferences();
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
 * Check if user is authenticated (server-side)
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return !error && !!user;
  } catch {
    return false;
  }
}



