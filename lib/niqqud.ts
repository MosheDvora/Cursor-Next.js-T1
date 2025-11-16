/**
 * Hebrew Niqqud (vowel marks) detection and manipulation utilities
 * 
 * Niqqud marks are Hebrew diacritical marks used to indicate vowels.
 * Unicode range: U+0591 to U+05C7
 */

export type NiqqudStatus = "none" | "partial" | "full";

/**
 * Hebrew niqqud marks Unicode ranges
 */
const NIQQUD_RANGES = [
  [0x0591, 0x05c7], // Main niqqud range
];

/**
 * Check if a character is a Hebrew niqqud mark
 */
function isNiqqudMark(char: string): boolean {
  const code = char.charCodeAt(0);
  return NIQQUD_RANGES.some(([start, end]) => code >= start && code <= end);
}

/**
 * Remove all niqqud marks from Hebrew text
 */
export function removeNiqqud(text: string): string {
  return text
    .split("")
    .filter((char) => !isNiqqudMark(char))
    .join("");
}

/**
 * Detect niqqud status in Hebrew text
 * @param text - Hebrew text to analyze
 * @returns "none" if no niqqud, "partial" if some words have niqqud, "full" if all text has niqqud
 */
export function detectNiqqud(text: string): NiqqudStatus {
  if (!text || text.trim().length === 0) {
    return "none";
  }

  // Split text into words (Hebrew words separated by spaces/punctuation)
  const words = text
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.replace(/[^\u0590-\u05FF]/g, "")) // Keep only Hebrew characters
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return "none";
  }

  let wordsWithNiqqud = 0;
  let totalHebrewChars = 0;

  for (const word of words) {
    let hasNiqqud = false;
    let hebrewChars = 0;

    for (const char of word) {
      const code = char.charCodeAt(0);
      // Check if it's a Hebrew letter (U+0590-U+05FF)
      if (code >= 0x0590 && code <= 0x05ff) {
        hebrewChars++;
        if (isNiqqudMark(char)) {
          hasNiqqud = true;
        }
      }
    }

    if (hebrewChars > 0) {
      totalHebrewChars += hebrewChars;
      if (hasNiqqud) {
        wordsWithNiqqud++;
      }
    }
  }

  if (wordsWithNiqqud === 0) {
    return "none";
  }

  // If more than 80% of words have niqqud, consider it "full"
  const niqqudRatio = wordsWithNiqqud / words.length;
  if (niqqudRatio >= 0.8) {
    return "full";
  }

  return "partial";
}

/**
 * Check if text has any niqqud marks
 */
export function hasNiqqud(text: string): boolean {
  return detectNiqqud(text) !== "none";
}

/**
 * Check if text is fully niqqud
 */
export function isFullyNiqqud(text: string): boolean {
  return detectNiqqud(text) === "full";
}

