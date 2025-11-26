/**
 * Saved texts management utilities (Client-side only)
 * Handles reading and writing saved texts from/to Supabase saved_texts table
 * This file is safe to import in client components
 * Includes localStorage fallback for non-authenticated users
 */

'use client';

import { createClient } from '@/lib/supabase/client';
import { removeNiqqud } from '@/lib/niqqud';

/**
 * Interface for saved text data
 */
export interface SavedTextData {
  original_text: string;
  niqqud_text?: string | null;
  clean_text?: string | null;
}

/**
 * LocalStorage key for saved text (fallback for non-authenticated users)
 */
const LOCAL_STORAGE_TEXT_KEY = 'main_text_field';
const LOCAL_STORAGE_NIQQUD_KEY = 'main_text_niqqud';

/**
 * Debounce utility function
 * Delays execution of a function until after a specified delay
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Client-side: Get the last worked text
 * Tries Supabase first (if authenticated), falls back to localStorage
 * Returns the saved text data or null if not found
 */
export async function getLastWorkedTextClient(): Promise<SavedTextData | null> {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!userError && user) {
      // User is authenticated - try to fetch from Supabase
      const { data: savedText, error: fetchError } = await supabase
        .from('saved_texts')
        .select('original_text, niqqud_text, clean_text')
        .eq('user_id', user.id)
        .eq('is_last_worked', true)
        .order('last_accessed_at', { ascending: false })
        .limit(1)
        .single();

      if (!fetchError && savedText) {
        // Update last_accessed_at timestamp
        await supabase
          .from('saved_texts')
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('is_last_worked', true);

        return {
          original_text: savedText.original_text,
          niqqud_text: savedText.niqqud_text,
          clean_text: savedText.clean_text,
        };
      }
    }

    // Fallback to localStorage (for non-authenticated users or if Supabase fetch failed)
    if (typeof window !== 'undefined') {
      const savedText = localStorage.getItem(LOCAL_STORAGE_TEXT_KEY);
      const savedNiqqud = localStorage.getItem(LOCAL_STORAGE_NIQQUD_KEY);
      
      if (savedText) {
        return {
          original_text: savedText,
          niqqud_text: savedNiqqud || null,
          clean_text: removeNiqqud(savedText),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[SavedTexts] Error getting last worked text:', error);
    
    // Fallback to localStorage on error
    if (typeof window !== 'undefined') {
      const savedText = localStorage.getItem(LOCAL_STORAGE_TEXT_KEY);
      const savedNiqqud = localStorage.getItem(LOCAL_STORAGE_NIQQUD_KEY);
      
      if (savedText) {
        return {
          original_text: savedText,
          niqqud_text: savedNiqqud || null,
          clean_text: removeNiqqud(savedText),
        };
      }
    }
    
    return null;
  }
}

/**
 * Internal function to save text (called by debounced function)
 */
async function _saveTextInternal(textData: SavedTextData): Promise<void> {
  try {
    const supabase = createClient();
    
    // Always save to localStorage as backup
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_TEXT_KEY, textData.original_text);
      if (textData.niqqud_text) {
        localStorage.setItem(LOCAL_STORAGE_NIQQUD_KEY, textData.niqqud_text);
      }
    }

    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // User is not authenticated - only save to localStorage (already done above)
      return;
    }

    // Generate clean_text if not provided
    const cleanText = textData.clean_text || removeNiqqud(textData.original_text);

    // Check if a last_worked text exists for this user
    const { data: existingText } = await supabase
      .from('saved_texts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_last_worked', true)
      .single();

    if (existingText) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('saved_texts')
        .update({
          original_text: textData.original_text,
          niqqud_text: textData.niqqud_text || null,
          clean_text: cleanText,
          is_last_worked: true,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', existingText.id);

      if (updateError) {
        console.error('[SavedTexts] Error updating text:', updateError);
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('saved_texts')
        .insert({
          user_id: user.id,
          original_text: textData.original_text,
          niqqud_text: textData.niqqud_text || null,
          clean_text: cleanText,
          is_last_worked: true,
        });

      if (insertError) {
        console.error('[SavedTexts] Error inserting text:', insertError);
      }
    }
  } catch (error) {
    console.error('[SavedTexts] Error saving text:', error);
    // Ensure localStorage is saved even on error
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_TEXT_KEY, textData.original_text);
      if (textData.niqqud_text) {
        localStorage.setItem(LOCAL_STORAGE_NIQQUD_KEY, textData.niqqud_text);
      }
    }
  }
}

/**
 * Debounced save function (3 seconds delay)
 * This is the function that should be called from components
 */
export const saveTextClient = debounce(_saveTextInternal, 3000);

/**
 * Client-side: Save niqqud text immediately (not debounced)
 * Updates the existing last_worked text with niqqud data, or creates a new one
 * Also saves to localStorage as backup
 */
export async function saveNiqqudTextClient(
  originalText: string,
  niqqudText: string
): Promise<void> {
  try {
    const supabase = createClient();
    
    // Always save to localStorage as backup
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_TEXT_KEY, originalText);
      localStorage.setItem(LOCAL_STORAGE_NIQQUD_KEY, niqqudText);
    }

    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // User is not authenticated - only save to localStorage (already done above)
      return;
    }

    // Generate clean_text from original
    const cleanText = removeNiqqud(originalText);

    // Check if a last_worked text exists for this user
    const { data: existingText } = await supabase
      .from('saved_texts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_last_worked', true)
      .single();

    if (existingText) {
      // Update existing record with niqqud data
      const { error: updateError } = await supabase
        .from('saved_texts')
        .update({
          original_text: originalText,
          niqqud_text: niqqudText,
          clean_text: cleanText,
          is_last_worked: true,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', existingText.id);

      if (updateError) {
        console.error('[SavedTexts] Error updating niqqud text:', updateError);
      }
    } else {
      // Create new record with niqqud data
      const { error: insertError } = await supabase
        .from('saved_texts')
        .insert({
          user_id: user.id,
          original_text: originalText,
          niqqud_text: niqqudText,
          clean_text: cleanText,
          is_last_worked: true,
        });

      if (insertError) {
        console.error('[SavedTexts] Error inserting niqqud text:', insertError);
      }
    }
  } catch (error) {
    console.error('[SavedTexts] Error saving niqqud text:', error);
    // Ensure localStorage is saved even on error
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_TEXT_KEY, originalText);
      localStorage.setItem(LOCAL_STORAGE_NIQQUD_KEY, niqqudText);
    }
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

