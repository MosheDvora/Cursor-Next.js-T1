/**
 * Saved texts management utilities (Server-side only)
 * Handles reading and writing saved texts from/to Supabase saved_texts table
 * This file should only be imported in server components or API routes
 */

import { createClient } from '@/lib/supabase/server';
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
 * Interface for saved text record from database
 */
export interface SavedTextRecord extends SavedTextData {
  id: string;
  user_id: string;
  is_last_worked: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

/**
 * Server-side: Get the last worked text for the authenticated user
 * Returns the saved text data or null if not found/not authenticated
 */
export async function getLastWorkedText(): Promise<SavedTextData | null> {
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

    // Fetch the last worked text for this user
    const { data: savedText, error: fetchError } = await supabase
      .from('saved_texts')
      .select('original_text, niqqud_text, clean_text')
      .eq('user_id', user.id)
      .eq('is_last_worked', true)
      .order('last_accessed_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      // No saved text found is not an error
      if (fetchError.code === 'PGRST116') {
        return null;
      }
      console.error('[SavedTexts] Error fetching last worked text:', fetchError);
      return null;
    }

    if (!savedText) {
      return null;
    }

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
  } catch (error) {
    console.error('[SavedTexts] Error getting last worked text:', error);
    return null;
  }
}

/**
 * Server-side: Save or update text for the authenticated user
 * If a last_worked text exists, it will be updated. Otherwise, a new record is created.
 * Returns true if successful, false otherwise
 */
export async function saveText(textData: SavedTextData): Promise<boolean> {
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
        return false;
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
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[SavedTexts] Error saving text:', error);
    return false;
  }
}

/**
 * Server-side: Save niqqud text for the authenticated user
 * Updates the existing last_worked text with niqqud data, or creates a new one
 * Returns true if successful, false otherwise
 */
export async function saveNiqqudText(
  originalText: string,
  niqqudText: string
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
        return false;
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
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[SavedTexts] Error saving niqqud text:', error);
    return false;
  }
}

