/**
 * Hebrew syllables division utilities
 * Handles parsing, caching, and formatting of syllable division data
 */

export interface SyllableWord {
  word: string;
  syllables: string[];
}

export interface SyllablesData {
  words: SyllableWord[];
}

/**
 * Create a hash from text for cache key generation
 * Uses Web Crypto API for SHA-256 hashing
 */
export async function createTextHash(text: string): Promise<string> {
  if (typeof window === "undefined" || !crypto?.subtle) {
    // Fallback for server-side: use simple hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex.substring(0, 16); // Use first 16 chars for shorter key
  } catch {
    // Fallback to simple hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Synchronous version of createTextHash for cases where async is not needed
 */
export function createTextHashSync(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get cache key for syllables data
 */
export function getSyllablesCacheKey(text: string): string {
  const hash = createTextHashSync(text);
  return `syllables_cache_${hash}`;
}

/**
 * Parse syllables response from language model
 * Handles text format: each line is a word with syllables separated by hyphens
 * Example:
 * דַּ-נִי
 * קָם
 * בַּ-בֹּו-קֶר
 */
export function parseSyllablesResponse(
  response: string
): SyllablesData | null {
  if (!response || response.trim().length === 0) {
    return null;
  }

  try {
    // Clean the response - remove markdown code blocks if present
    let text = response.trim();

    // Remove markdown code blocks if present
    const codeBlockMatch = text.match(/```(?:[a-z]+)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim();
    }

    // Split into lines
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);

    if (lines.length === 0) {
      return null;
    }

    // Parse each line - a line may contain multiple words separated by spaces
    // Each word should have syllables separated by hyphens
    const validWords: SyllableWord[] = [];

    for (const line of lines) {
      // Skip lines that look like explanations or comments
      if (line.startsWith("//") || line.startsWith("#") || line.includes("דוגמה") || line.includes("התגובה")) {
        continue;
      }

      // First, split the line into words by spaces (but preserve hyphens within words)
      // We need to be careful: a space separates words, but hyphens separate syllables within a word
      const wordsInLine = line.split(/\s+/).map((w) => w.trim()).filter((w) => w.length > 0);

      for (const wordText of wordsInLine) {
        let syllables: string[] = [];

        // Try to split by hyphen first (preferred format for syllables)
        if (wordText.includes("-")) {
          syllables = wordText.split(/-/).map((s) => s.trim()).filter((s) => s.length > 0);
        }
        // Try to split by asterisk (fallback)
        else if (wordText.includes("*")) {
          syllables = wordText.split(/\*/).map((s) => s.trim()).filter((s) => s.length > 0);
        }
        // Single syllable word (no separator) - treat the whole word as one syllable
        else {
          syllables = [wordText.trim()];
        }

        if (syllables.length === 0) {
          continue; // Skip empty words
        }

        // Remove separators from the original word to get the base word
        // This is an approximation - we'll use the syllables joined together
        const baseWord = syllables.join("").replace(/[\u0591-\u05C7]/g, ""); // Remove niqqud marks for comparison

        // If we can't extract a clean base word, use the first syllable without niqqud
        const word = baseWord || syllables[0].replace(/[\u0591-\u05C7]/g, "") || wordText.replace(/[-*\s]/g, "");

        validWords.push({
          word: word,
          syllables: syllables,
        });
      }
    }

    if (validWords.length === 0) {
      return null;
    }

    // Check if all words are single syllables (no separators) - this might indicate the model didn't divide
    // Only flag as suspicious if we have multiple words and none have separators
    const wordsWithSeparators = validWords.filter(w => w.syllables.length > 1);
    if (validWords.length > 1 && wordsWithSeparators.length === 0) {
      // All words appear to be single syllables - this might be an error
      // But we'll still return the data, as some words might genuinely be single syllables
      console.warn("[Syllables] Warning: All words appear to be single syllables - model may not have divided the text");
    }

    return { words: validWords };
  } catch (error) {
    console.error("[Syllables] Failed to parse response:", error);
    return null;
  }
}

/**
 * Format syllables data for display
 * Returns a structure ready for rendering
 */
export function formatSyllablesForDisplay(
  data: SyllablesData
): Array<{ word: string; syllables: string[] }> {
  return data.words.map((word) => ({
    word: word.word,
    syllables: word.syllables,
  }));
}

/**
 * Save syllables data to localStorage
 */
export function saveSyllablesToCache(
  text: string,
  data: SyllablesData
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cacheKey = getSyllablesCacheKey(text);
    const cacheData = {
      text: text.trim(),
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error("[Syllables] Failed to save to cache:", error);
  }
}

/**
 * Load syllables data from localStorage cache
 */
export function loadSyllablesFromCache(
  text: string
): SyllablesData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cacheKey = getSyllablesCacheKey(text);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const cacheData = JSON.parse(cached) as {
      text: string;
      data: SyllablesData;
      timestamp: number;
    };

    // Verify that cached text matches current text
    if (cacheData.text.trim() !== text.trim()) {
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.error("[Syllables] Failed to load from cache:", error);
    return null;
  }
}

/**
 * Clear syllables cache for a specific text
 */
export function clearSyllablesCache(text: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cacheKey = getSyllablesCacheKey(text);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error("[Syllables] Failed to clear cache:", error);
  }
}

/**
 * Clear all syllables cache entries from localStorage
 */
export function clearAllSyllablesCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToRemove: string[] = [];

    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("syllables_cache_")) {
        keysToRemove.push(key);
      }
    }

    // Remove all syllables cache keys
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    console.log(`[Syllables] Cleared ${keysToRemove.length} cache entries`);
  } catch (error) {
    console.error("[Syllables] Failed to clear all cache:", error);
  }
}

/**
 * Save all syllables cache entries to a centralized location in localStorage
 * This enables future sync with Supabase or other external storage
 */
export function saveSyllablesCacheToStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const allCacheEntries: Record<string, { text: string; data: SyllablesData; timestamp: number }> = {};

    // Collect all syllables cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("syllables_cache_")) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const cacheData = JSON.parse(cached) as {
              text: string;
              data: SyllablesData;
              timestamp: number;
            };
            allCacheEntries[key] = cacheData;
          } catch (e) {
            console.warn(`[Syllables] Failed to parse cache entry ${key}:`, e);
          }
        }
      }
    }

    // Save all entries to a centralized key for future sync
    localStorage.setItem("syllables_cache_all", JSON.stringify(allCacheEntries));
    console.log(`[Syllables] Saved ${Object.keys(allCacheEntries).length} cache entries to centralized storage`);
  } catch (error) {
    console.error("[Syllables] Failed to save cache to storage:", error);
  }
}

/**
 * Load all syllables cache entries from centralized storage
 * This is useful for syncing with Supabase or other external storage
 */
export function loadSyllablesCacheFromStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const allCacheEntriesStr = localStorage.getItem("syllables_cache_all");
    if (!allCacheEntriesStr) {
      return;
    }

    const allCacheEntries = JSON.parse(allCacheEntriesStr) as Record<
      string,
      { text: string; data: SyllablesData; timestamp: number }
    >;

    // Restore all cache entries
    Object.entries(allCacheEntries).forEach(([key, cacheData]) => {
      try {
        localStorage.setItem(key, JSON.stringify(cacheData));
      } catch (e) {
        console.warn(`[Syllables] Failed to restore cache entry ${key}:`, e);
      }
    });

    console.log(`[Syllables] Loaded ${Object.keys(allCacheEntries).length} cache entries from centralized storage`);
  } catch (error) {
    console.error("[Syllables] Failed to load cache from storage:", error);
  }
}

