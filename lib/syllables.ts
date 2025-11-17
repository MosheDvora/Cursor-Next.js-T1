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
  } catch (error) {
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

    // Parse each line as a word with syllables separated by hyphens
    const validWords: SyllableWord[] = [];
    
    for (const line of lines) {
      // Split by hyphen to get syllables
      const syllables = line.split(/-/).map((s) => s.trim()).filter((s) => s.length > 0);
      
      if (syllables.length === 0) {
        continue; // Skip empty lines
      }

      // Remove hyphens from the original word to get the base word
      // This is an approximation - we'll use the syllables joined together
      const baseWord = syllables.join("").replace(/[\u0591-\u05C7]/g, ""); // Remove niqqud marks for comparison
      
      // If we can't extract a clean base word, use the first syllable without niqqud
      const word = baseWord || syllables[0].replace(/[\u0591-\u05C7]/g, "") || line.replace(/-/g, "");

      validWords.push({
        word: word,
        syllables: syllables,
      });
    }

    if (validWords.length === 0) {
      return null;
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

