"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { SyllablesData } from "@/lib/syllables";
import { CurrentPosition, saveCurrentPosition, loadCurrentPosition } from "@/lib/settings";
import { Textarea } from "@/components/ui/textarea";
import { isNiqqudMark, removeNiqqud } from "@/lib/niqqud";
import { getPreset } from "@/lib/text-styling-presets";
import { cn } from "@/lib/utils";

/**
 * Interface representing the niqqud cache structure
 * Used to store different versions of text (with/without niqqud)
 */
interface NiqqudCache {
  original: string;
  clean: string;
  full: string | null;
}

/**
 * Props for EditableSyllablesTextarea component
 */
interface EditableSyllablesTextareaProps {
  text: string;
  onChange: (text: string) => void;
  isSyllablesActive: boolean;
  syllablesData: SyllablesData | null;
  navigationMode: "words" | "syllables" | "letters";
  displayMode?: 'original' | 'clean' | 'full';
  niqqudCache?: NiqqudCache | null;
  borderSize: number;
  backgroundColor: string;
  wordSpacing: number;
  letterSpacing: number;
  fontSize?: number;
  wordHighlightPadding?: number;
  syllableHighlightPadding?: number;
  letterHighlightPadding?: number;
  wordHighlightColor?: string;
  syllableHighlightColor?: string;
  letterHighlightColor?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  isEditing?: boolean;
  stylingPreset?: string;
  fontFamily?: string;
}

/**
 * Imperative API exposed via ref for external control of navigation
 * This allows parent components to control highlighting without causing re-renders
 */
export interface EditableSyllablesTextareaRef {
  /** Move to the next element (word/syllable/letter) based on current navigation mode */
  focusNext: () => void;
  /** Move to the previous element based on current navigation mode */
  focusPrev: () => void;
  /** Move to the element above in vertical navigation */
  focusUp: () => void;
  /** Move to the element below in vertical navigation */
  focusDown: () => void;
  /** Highlight a specific position directly via DOM manipulation */
  highlight: (position: CurrentPosition) => void;
  /** Remove all highlighting from the display */
  clearHighlight: () => void;
  /** Get the current position without causing a re-render */
  getCurrentPosition: () => CurrentPosition | null;
  /** Reset position to the beginning */
  resetPosition: () => void;
}

// Helper function to check if character is Hebrew letter (not niqqud)
const isHebrewLetter = (char: string): boolean => {
  const code = char.charCodeAt(0);
  // Hebrew letters range: U+0590-U+05FF, but exclude niqqud marks
  return code >= 0x0590 && code <= 0x05ff && !isNiqqudMark(char);
};

// Extract Hebrew letters only from text (for letter navigation)
const getHebrewLetters = (text: string): Array<{ char: string; index: number }> => {
  const letters: Array<{ char: string; index: number }> = [];
  for (let i = 0; i < text.length; i++) {
    if (isHebrewLetter(text[i])) {
      letters.push({ char: text[i], index: i });
    }
  }
  return letters;
};

// Split text into words (for word navigation without syllables)
const getWordsFromText = (text: string): string[] => {
  return text.split(/\s+/).filter(word => word.trim().length > 0);
};

// Group Hebrew letters with their following niqqud marks
// This ensures that letter+niqqud are rendered together in the same span
const groupLettersWithNiqqud = (text: string): Array<{ text: string; index: number; isHebrew: boolean }> => {
  const groups: Array<{ text: string; index: number; isHebrew: boolean }> = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (isHebrewLetter(char)) {
      let combined = char;
      let j = i + 1;
      // צרף את כל סימני הניקוד העוקבים לאות זו
      while (j < text.length && isNiqqudMark(text[j])) {
        combined += text[j];
        j++;
      }
      groups.push({ text: combined, index: i, isHebrew: true });
      i = j;
    } else {
      groups.push({ text: char, index: i, isHebrew: false });
      i++;
    }
  }

  return groups;
};

/**
 * Apply display mode to syllables data by transforming niqqud as needed
 * This ensures the displayed text matches the displayMode (original/clean/full)
 * while preserving the syllable structure for navigation
 * 
 * For 'original' mode with partial niqqud, syllables are transformed on a per-word basis:
 * - Words that have niqqud in original → keep syllables with niqqud
 * - Words that have NO niqqud in original → strip niqqud from syllables
 * 
 * This allows syllable navigation to work correctly even when the original text
 * has partial niqqud (e.g., "שָׁלוֹם רַב לכל האורחים" where only some words have niqqud).
 * 
 * @param syllablesData - The original syllables data (with full niqqud from model)
 * @param displayMode - The current display mode ('original', 'clean', or 'full')
 * @param cache - The niqqud cache containing original, clean, and full versions
 * @returns Processed syllables data with niqqud transformed, or null if syllables cannot be used
 */
export function applyDisplayModeToSyllables(
  syllablesData: SyllablesData,
  displayMode: 'original' | 'clean' | 'full' | undefined,
  cache: NiqqudCache | null | undefined
): SyllablesData | null {
  // If no displayMode or cache, return original data (default behavior)
  if (!displayMode || !cache) {
    return syllablesData;
  }

  // If displayMode is 'full', return original data (with full niqqud from model)
  if (displayMode === 'full') {
    return syllablesData;
  }

  // For 'original' mode: Transform syllables to match the original text's niqqud pattern
  // This handles partial niqqud cases where some words have niqqud and some don't
  if (displayMode === 'original') {
    const originalClean = removeNiqqud(cache.original);
    const fullClean = cache.full ? removeNiqqud(cache.full) : originalClean;
    
    // If the underlying text (without niqqud) is different, the model may have changed text
    // In this case, we can't use syllables for original mode
    if (originalClean !== fullClean) {
      return null; // Cannot use syllables with mismatched text
    }
    
    // If original === full, no transformation needed - return syllablesData as-is
    if (cache.original === cache.full) {
      return syllablesData;
    }
    
    // Partial niqqud case: transform syllables per-word based on original's niqqud status
    // Split both texts into words for comparison
    const originalWords = cache.original.split(/\s+/).filter(w => w.length > 0);
    const fullWords = cache.full ? cache.full.split(/\s+/).filter(w => w.length > 0) : originalWords;
    
    // Safety check: word count should match between syllablesData and original text
    // If they don't match, something is wrong and we can't safely transform
    if (syllablesData.words.length !== originalWords.length) {
      // Word count mismatch - try to proceed if counts are close, otherwise return null
      // This can happen if the model slightly reformatted the text
      if (Math.abs(syllablesData.words.length - originalWords.length) > 1) {
        return null; // Too much difference, can't reliably map words
      }
    }
    
    // Transform each word's syllables based on whether the original word has niqqud
    return {
      words: syllablesData.words.map((wordEntry, idx) => {
        // Get the corresponding words from original and full text
        // Use empty string as fallback if index is out of bounds
        const originalWord = originalWords[idx] || '';
        const fullWord = fullWords[idx] || '';
        
        // If the original word exactly matches the full word (has full niqqud),
        // keep syllables as-is with their niqqud
        if (originalWord === fullWord) {
          return wordEntry;
        }
        
        // Check if the original word has NO niqqud at all
        // If so, strip all niqqud from the syllables for this word
        const originalWordWithoutNiqqud = removeNiqqud(originalWord);
        if (originalWord === originalWordWithoutNiqqud) {
          // Original word has no niqqud - strip niqqud from syllables
          return {
            word: wordEntry.word,
            syllables: wordEntry.syllables.map(syllable => removeNiqqud(syllable)),
          };
        }
        
        // Original word has PARTIAL niqqud (some characters have niqqud, some don't)
        // This is a complex case - for now, keep the full niqqud syllables
        // since partial niqqud within a single word is rare and harder to handle
        // The display will show whatever niqqud the original has
        return wordEntry;
      }),
    };
  }

  // For 'clean' mode: Remove all niqqud from syllables
  return {
    words: syllablesData.words.map((word) => ({
      word: word.word, // Keep the base word structure
      syllables: word.syllables.map((syllable) => {
        // Remove niqqud from each syllable
        return removeNiqqud(syllable);
      }),
    })),
  };
}

/**
 * EditableSyllablesTextarea - High-performance text display component with navigation
 * 
 * Key features:
 * - Uses refs instead of state for position tracking to avoid re-renders
 * - Direct DOM manipulation for highlight changes (no React re-renders)
 * - Exposes imperative API for external control
 * - Supports word, syllable, and letter navigation modes
 * - Persists position to localStorage without triggering renders
 * 
 * Architecture:
 * - Position is stored in currentPositionRef (not state)
 * - Highlighted element is tracked via highlightedElementRef
 * - CSS classes are toggled directly on DOM elements
 * - Parent components can use the ref API to control navigation
 */
export const EditableSyllablesTextarea = forwardRef<EditableSyllablesTextareaRef, EditableSyllablesTextareaProps>(
  function EditableSyllablesTextarea({
  text,
  onChange,
  isSyllablesActive,
  syllablesData,
  navigationMode,
  displayMode,
  niqqudCache,
  wordSpacing,
  letterSpacing,
  fontSize = 30,
  disabled = false,
  placeholder = "הדבק כאן את הטקסט הראשי לצורך מניפולציות...",
  className = "",
  isEditing = true,
  stylingPreset,
  fontFamily = "Inter",
  }, ref) {
    // Ref to the display container element
  const displayRef = useRef<HTMLDivElement>(null);
    
    // Current position stored in ref (not state) to avoid re-renders
    const currentPositionRef = useRef<CurrentPosition | null>(null);
    
    // Reference to the currently highlighted DOM element
    const highlightedElementRef = useRef<HTMLElement | null>(null);
    
    // Previous navigation mode to detect mode changes
  const prevModeRef = useRef<string | null>(null);
    
    // Track if we've initialized position for current text
  const initializedTextRef = useRef<string>("");

    /**
     * Get the CSS class name for the active highlight based on navigation mode
     */
    const getActiveClassName = useCallback((mode: "words" | "syllables" | "letters"): string => {
      switch (mode) {
        case "words": return "pyramid-word-active";
        case "syllables": return "pyramid-syllable-active";
        case "letters": return "pyramid-letter-active";
        default: return "pyramid-word-active";
      }
    }, []);

    /**
     * Remove highlight from the currently highlighted element
     * Uses direct DOM manipulation for performance
     */
    const clearCurrentHighlight = useCallback(() => {
      if (highlightedElementRef.current) {
        // Remove all possible active classes
        highlightedElementRef.current.classList.remove(
          "pyramid-word-active",
          "pyramid-syllable-active",
          "pyramid-letter-active"
        );
        highlightedElementRef.current = null;
      }
    }, []);

    /**
     * Apply highlight to a specific position using DOM queries
     * This is the core of the performance optimization - no React re-render needed
     * 
     * @param position - The position to highlight
     */
    const applyHighlight = useCallback((position: CurrentPosition) => {
      if (!displayRef.current) return;

      // First, clear any existing highlight
      clearCurrentHighlight();

      // Build the selector based on position
      let selector: string;
      const { mode, wordIndex, syllableIndex, letterIndex } = position;

      if (mode === "words") {
        selector = `[data-word-index="${wordIndex}"][data-element-type="word"]`;
      } else if (mode === "syllables") {
        selector = `[data-word-index="${wordIndex}"][data-syllable-index="${syllableIndex ?? 0}"][data-element-type="syllable"]`;
      } else {
        // letters mode
        selector = `[data-word-index="${wordIndex}"][data-syllable-index="${syllableIndex ?? 0}"][data-letter-index="${letterIndex ?? 0}"][data-element-type="letter"]`;
      }

      // Find and highlight the element
      const element = displayRef.current.querySelector<HTMLElement>(selector);
      if (element) {
        element.classList.add(getActiveClassName(mode));
        highlightedElementRef.current = element;
        
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, [clearCurrentHighlight, getActiveClassName]);

    /**
     * Update position and apply highlight
     * Also persists to localStorage for session continuity
     * 
     * @param newPosition - The new position to set
     */
    const updatePosition = useCallback((newPosition: CurrentPosition | null) => {
      currentPositionRef.current = newPosition;
      
      if (newPosition) {
        applyHighlight(newPosition);
        // Persist to localStorage (non-blocking)
        saveCurrentPosition(newPosition);
      } else {
        clearCurrentHighlight();
        saveCurrentPosition(null);
      }
    }, [applyHighlight, clearCurrentHighlight]);

  /**
   * Helper function to get line index and word index within line for a given word index
   * Used for vertical navigation (up/down arrows)
   */
    const getLineAndWordPosition = useCallback((wordIndex: number, textLines: string[]): { lineIndex: number; wordIndexInLine: number } | null => {
    let currentWordCount = 0;
    for (let lineIdx = 0; lineIdx < textLines.length; lineIdx++) {
      const lineWords = getWordsFromText(textLines[lineIdx]);
      if (currentWordCount + lineWords.length > wordIndex) {
        return {
          lineIndex: lineIdx,
          wordIndexInLine: wordIndex - currentWordCount,
        };
      }
      currentWordCount += lineWords.length;
    }
    return null;
    }, []);

  /**
   * Helper function to get line index for a word when syllables data is available
   */
    const getLineIndexForWord = useCallback((wordIndex: number, textLines: string[]): number => {
    let wordCount = 0;
    for (let lineIdx = 0; lineIdx < textLines.length; lineIdx++) {
      const lineWords = textLines[lineIdx].split(/\s+/).filter(w => w.trim().length > 0);
      if (wordCount + lineWords.length > wordIndex) {
        return lineIdx;
      }
      wordCount += lineWords.length;
    }
    return 0;
    }, []);

    /**
     * Navigate to next element based on current mode
     * 
     * IMPORTANT: For letter navigation with syllablesData, we must use processedSyllablesData
     * (with displayMode applied) to match the indices in the DOM. When niqqud is removed,
     * the character indices change, so navigation must use the same data structure as rendering.
     */
    const focusNext = useCallback(() => {
      if (!text || text.trim().length === 0) return;
      
      const currentPosition = currentPositionRef.current;
      let newPosition: CurrentPosition | null = null;

      // If no syllables data, navigate on raw text
      if (!syllablesData || !isSyllablesActive) {
        if (navigationMode === "words") {
          const words = getWordsFromText(text);
          const currentWordIdx = currentPosition?.wordIndex ?? 0;

          if (currentWordIdx < words.length - 1) {
            newPosition = { mode: "words", wordIndex: currentWordIdx + 1 };
          } else if (!currentPosition) {
            newPosition = { mode: "words", wordIndex: 0 };
          }
        } else if (navigationMode === "letters") {
          const letters = getHebrewLetters(text);
          const currentLetterIdx = currentPosition?.letterIndex ?? 0;

          if (currentLetterIdx < letters.length - 1) {
            newPosition = { mode: "letters", wordIndex: 0, letterIndex: currentLetterIdx + 1 };
          } else if (!currentPosition) {
            newPosition = { mode: "letters", wordIndex: 0, letterIndex: 0 };
          }
        }
      } else {
        // Navigate with syllables data
        if (!currentPosition) return;

        // Apply display mode to get the same data structure used in DOM rendering
        // This ensures letter indices match between navigation and DOM elements
        const processedData = applyDisplayModeToSyllables(syllablesData, displayMode, niqqudCache);
        
        // If processedData is null, syllables cannot be used for current displayMode
        // Fall back to simple navigation based on displayed text (same as when no syllables data)
        if (!processedData) {
          // Fall back to simple word/letter navigation based on displayed text
          if (navigationMode === "words") {
            const words = getWordsFromText(text);
            const currentWordIdx = currentPosition?.wordIndex ?? 0;

            if (currentWordIdx < words.length - 1) {
              newPosition = { mode: "words", wordIndex: currentWordIdx + 1 };
            } else if (!currentPosition) {
              newPosition = { mode: "words", wordIndex: 0 };
            }
          } else if (navigationMode === "letters") {
            const letters = getHebrewLetters(text);
            const currentLetterIdx = currentPosition?.letterIndex ?? 0;

            if (currentLetterIdx < letters.length - 1) {
              newPosition = { mode: "letters", wordIndex: 0, letterIndex: currentLetterIdx + 1 };
            } else if (!currentPosition) {
              newPosition = { mode: "letters", wordIndex: 0, letterIndex: 0 };
            }
          }
          if (newPosition) {
            updatePosition(newPosition);
          }
          return;
        }
        
        const { words } = processedData;
        const { mode, wordIndex, syllableIndex, letterIndex } = currentPosition;

        if (mode === "words") {
          if (wordIndex < words.length - 1) {
            newPosition = { mode: "words", wordIndex: wordIndex + 1 };
          }
        } else if (mode === "syllables") {
          const currentWord = words[wordIndex];
          if (!currentWord) return;

          const syllables = currentWord.syllables;
          const currentSyllableIdx = syllableIndex ?? 0;

          if (currentSyllableIdx < syllables.length - 1) {
            newPosition = { ...currentPosition, syllableIndex: currentSyllableIdx + 1 };
          } else if (wordIndex < words.length - 1) {
            newPosition = { mode: "syllables", wordIndex: wordIndex + 1, syllableIndex: 0 };
          }
        } else if (mode === "letters") {
          // Navigate between letters - only Hebrew letters
          // Use processed syllables data to match DOM indices
          const allLetters: Array<{ wordIdx: number; syllableIdx: number; letterIdx: number }> = [];

          words.forEach((word, wIdx) => {
            word.syllables.forEach((syllable, sIdx) => {
              for (let i = 0; i < syllable.length; i++) {
                if (isHebrewLetter(syllable[i])) {
                  allLetters.push({ wordIdx: wIdx, syllableIdx: sIdx, letterIdx: i });
                }
              }
            });
          });

          // Find current letter index
          const currentLetterGlobalIdx = allLetters.findIndex(
            l => l.wordIdx === wordIndex &&
              l.syllableIdx === (syllableIndex ?? 0) &&
              l.letterIdx === (letterIndex ?? 0)
          );

          if (currentLetterGlobalIdx === -1 && allLetters.length > 0) {
            const first = allLetters[0];
            newPosition = {
              mode: "letters",
              wordIndex: first.wordIdx,
              syllableIndex: first.syllableIdx,
              letterIndex: first.letterIdx,
            };
          } else if (currentLetterGlobalIdx < allLetters.length - 1) {
            const next = allLetters[currentLetterGlobalIdx + 1];
            newPosition = {
              mode: "letters",
              wordIndex: next.wordIdx,
              syllableIndex: next.syllableIdx,
              letterIndex: next.letterIdx,
            };
          }
        }
      }

      if (newPosition) {
        updatePosition(newPosition);
      }
    }, [text, isSyllablesActive, syllablesData, navigationMode, updatePosition, displayMode, niqqudCache]);

    /**
     * Navigate to previous element based on current mode
     * 
     * IMPORTANT: For letter navigation with syllablesData, we must use processedSyllablesData
     * (with displayMode applied) to match the indices in the DOM. When niqqud is removed,
     * the character indices change, so navigation must use the same data structure as rendering.
     */
    const focusPrev = useCallback(() => {
      if (!text || text.trim().length === 0) return;
      
      const currentPosition = currentPositionRef.current;
      let newPosition: CurrentPosition | null = null;

      if (!syllablesData || !isSyllablesActive) {
        if (navigationMode === "words") {
          const currentWordIdx = currentPosition?.wordIndex ?? 0;
          if (currentWordIdx > 0) {
            newPosition = { mode: "words", wordIndex: currentWordIdx - 1 };
          }
        } else if (navigationMode === "letters") {
          const currentLetterIdx = currentPosition?.letterIndex ?? 0;
          if (currentLetterIdx > 0) {
            newPosition = { mode: "letters", wordIndex: 0, letterIndex: currentLetterIdx - 1 };
          }
        }
      } else {
        if (!currentPosition) return;

        // Apply display mode to get the same data structure used in DOM rendering
        // This ensures letter indices match between navigation and DOM elements
        const processedData = applyDisplayModeToSyllables(syllablesData, displayMode, niqqudCache);
        
        // If processedData is null, syllables cannot be used for current displayMode
        // Fall back to simple navigation based on displayed text (same as when no syllables data)
        if (!processedData) {
          // Fall back to simple word/letter navigation based on displayed text
          if (navigationMode === "words") {
            const currentWordIdx = currentPosition?.wordIndex ?? 0;
            if (currentWordIdx > 0) {
              newPosition = { mode: "words", wordIndex: currentWordIdx - 1 };
            }
          } else if (navigationMode === "letters") {
            const currentLetterIdx = currentPosition?.letterIndex ?? 0;
            if (currentLetterIdx > 0) {
              newPosition = { mode: "letters", wordIndex: 0, letterIndex: currentLetterIdx - 1 };
            }
          }
          if (newPosition) {
            updatePosition(newPosition);
          }
          return;
        }
        
        const { words } = processedData;
        const { mode, wordIndex, syllableIndex, letterIndex } = currentPosition;

        if (mode === "words") {
          if (wordIndex > 0) {
            newPosition = { mode: "words", wordIndex: wordIndex - 1 };
          }
        } else if (mode === "syllables") {
          const currentSyllableIdx = syllableIndex ?? 0;

          if (currentSyllableIdx > 0) {
            newPosition = { ...currentPosition, syllableIndex: currentSyllableIdx - 1 };
          } else if (wordIndex > 0) {
            const prevWord = words[wordIndex - 1];
            newPosition = {
              mode: "syllables",
              wordIndex: wordIndex - 1,
              syllableIndex: prevWord.syllables.length - 1,
            };
          }
        } else if (mode === "letters") {
          // Use processed syllables data to match DOM indices
          const allLetters: Array<{ wordIdx: number; syllableIdx: number; letterIdx: number }> = [];

          words.forEach((word, wIdx) => {
            word.syllables.forEach((syllable, sIdx) => {
              for (let i = 0; i < syllable.length; i++) {
                if (isHebrewLetter(syllable[i])) {
                  allLetters.push({ wordIdx: wIdx, syllableIdx: sIdx, letterIdx: i });
                }
              }
            });
          });

          const currentLetterGlobalIdx = allLetters.findIndex(
            l => l.wordIdx === wordIndex &&
              l.syllableIdx === (syllableIndex ?? 0) &&
              l.letterIdx === (letterIndex ?? 0)
          );

          if (currentLetterGlobalIdx > 0) {
            const prev = allLetters[currentLetterGlobalIdx - 1];
            newPosition = {
              mode: "letters",
              wordIndex: prev.wordIdx,
              syllableIndex: prev.syllableIdx,
              letterIndex: prev.letterIdx,
            };
          }
        }
      }

      if (newPosition) {
        updatePosition(newPosition);
      }
    }, [text, isSyllablesActive, syllablesData, navigationMode, updatePosition, displayMode, niqqudCache]);

    /**
     * Navigate up (to previous line)
     * 
     * IMPORTANT: For letter navigation with syllablesData, we must use processedSyllablesData
     * (with displayMode applied) to match the indices in the DOM.
     */
    const focusUp = useCallback(() => {
      if (!text || text.trim().length === 0) return;
      
      const currentPosition = currentPositionRef.current;
        if (!currentPosition) return;

        const textLines = text.split('\n');
        let newPosition: CurrentPosition | null = null;

        if (!syllablesData || !isSyllablesActive) {
          if (navigationMode === "words") {
            const currentWordIdx = currentPosition.wordIndex ?? 0;
            const pos = getLineAndWordPosition(currentWordIdx, textLines);
          if (!pos || pos.lineIndex === 0) return;

          const targetLineIndex = pos.lineIndex - 1;
            const targetLineWords = getWordsFromText(textLines[targetLineIndex]);
            if (targetLineWords.length === 0) return;

          const targetWordIndexInLine = Math.min(pos.wordIndexInLine, targetLineWords.length - 1);
            let globalWordIndex = 0;
            for (let i = 0; i < targetLineIndex; i++) {
              globalWordIndex += getWordsFromText(textLines[i]).length;
            }
            globalWordIndex += targetWordIndexInLine;

            newPosition = { mode: "words", wordIndex: globalWordIndex };
          } else if (navigationMode === "letters") {
            const letters = getHebrewLetters(text);
            const currentLetterIdx = currentPosition.letterIndex ?? 0;
            if (currentLetterIdx >= letters.length) return;

            let charCount = 0;
            let currentLineIndex = 0;
            for (let i = 0; i < textLines.length; i++) {
              const lineLength = textLines[i].length;
              if (charCount + lineLength > letters[currentLetterIdx].index) {
                currentLineIndex = i;
                break;
              }
            charCount += lineLength + 1;
          }

          const targetLineIndex = currentLineIndex - 1;
          if (targetLineIndex < 0) return;

            const targetLineLetters = getHebrewLetters(textLines[targetLineIndex]);
            if (targetLineLetters.length === 0) return;

            let globalLetterIndex = 0;
            for (let i = 0; i < targetLineIndex; i++) {
              globalLetterIndex += getHebrewLetters(textLines[i]).length;
            }

            if (globalLetterIndex < letters.length) {
              newPosition = { mode: "letters", wordIndex: 0, letterIndex: globalLetterIndex };
            }
          }
        } else {
        // Apply display mode to get the same data structure used in DOM rendering
        const processedData = applyDisplayModeToSyllables(syllablesData, displayMode, niqqudCache);
        
        // If processedData is null, syllables cannot be used for current displayMode
        // Navigation is not possible in this state, so return early
        if (!processedData) {
          return;
        }
        
        const { words } = processedData;
          const { mode, wordIndex } = currentPosition;

          const wordToLineMap: number[] = [];
          let wordCount = 0;
          for (let lineIdx = 0; lineIdx < textLines.length; lineIdx++) {
            const lineWords = textLines[lineIdx].split(/\s+/).filter(w => w.trim().length > 0);
            for (let i = 0; i < lineWords.length && wordCount < words.length; i++) {
              wordToLineMap[wordCount] = lineIdx;
              wordCount++;
            }
          }

          const currentLineIndex = getLineIndexForWord(wordIndex, textLines);
        const targetLineIndex = currentLineIndex - 1;
        if (targetLineIndex < 0) return;

          const wordsByLine: Array<Array<{ wordIdx: number }>> = [];
        textLines.forEach((_, lineIdx) => { wordsByLine[lineIdx] = []; });
          words.forEach((_, wordIdx) => {
            const lineIdx = wordToLineMap[wordIdx] ?? 0;
          if (!wordsByLine[lineIdx]) wordsByLine[lineIdx] = [];
            wordsByLine[lineIdx].push({ wordIdx });
          });

          const targetLineWords = wordsByLine[targetLineIndex] || [];
          if (targetLineWords.length === 0) return;

          const currentLineWords = wordsByLine[currentLineIndex] || [];
          const currentWordIndexInLine = currentLineWords.findIndex(w => w.wordIdx === wordIndex);
          const targetWordIndexInLine = Math.min(
            currentWordIndexInLine >= 0 ? currentWordIndexInLine : 0,
            targetLineWords.length - 1
          );

          const targetWordIdx = targetLineWords[targetWordIndexInLine].wordIdx;

          if (mode === "words") {
            newPosition = { mode: "words", wordIndex: targetWordIdx };
          } else if (mode === "syllables") {
          newPosition = { mode: "syllables", wordIndex: targetWordIdx, syllableIndex: 0 };
          } else if (mode === "letters") {
          // Use processed syllables data to match DOM indices
            const targetWord = words[targetWordIdx];
            if (targetWord) {
              for (let sIdx = 0; sIdx < targetWord.syllables.length; sIdx++) {
                const syllable = targetWord.syllables[sIdx];
                for (let lIdx = 0; lIdx < syllable.length; lIdx++) {
                  if (isHebrewLetter(syllable[lIdx])) {
                    newPosition = {
                      mode: "letters",
                      wordIndex: targetWordIdx,
                      syllableIndex: sIdx,
                      letterIndex: lIdx,
                    };
                    break;
                  }
                }
                if (newPosition) break;
              }
            }
          }
        }

        if (newPosition) {
        updatePosition(newPosition);
      }
    }, [text, isSyllablesActive, syllablesData, navigationMode, getLineAndWordPosition, getLineIndexForWord, updatePosition, displayMode, niqqudCache]);

    /**
     * Navigate down (to next line)
     * 
     * IMPORTANT: For letter navigation with syllablesData, we must use processedSyllablesData
     * (with displayMode applied) to match the indices in the DOM.
     */
    const focusDown = useCallback(() => {
      if (!text || text.trim().length === 0) return;
      
      const currentPosition = currentPositionRef.current;
      if (!currentPosition) return;

      const textLines = text.split('\n');
      let newPosition: CurrentPosition | null = null;

      if (!syllablesData || !isSyllablesActive) {
        if (navigationMode === "words") {
          const currentWordIdx = currentPosition.wordIndex ?? 0;
          const pos = getLineAndWordPosition(currentWordIdx, textLines);
          if (!pos || pos.lineIndex >= textLines.length - 1) return;

          const targetLineIndex = pos.lineIndex + 1;
          const targetLineWords = getWordsFromText(textLines[targetLineIndex]);
          if (targetLineWords.length === 0) return;

          const targetWordIndexInLine = Math.min(pos.wordIndexInLine, targetLineWords.length - 1);
          let globalWordIndex = 0;
          for (let i = 0; i < targetLineIndex; i++) {
            globalWordIndex += getWordsFromText(textLines[i]).length;
          }
          globalWordIndex += targetWordIndexInLine;

          newPosition = { mode: "words", wordIndex: globalWordIndex };
        } else if (navigationMode === "letters") {
          const letters = getHebrewLetters(text);
          const currentLetterIdx = currentPosition.letterIndex ?? 0;
          if (currentLetterIdx >= letters.length) return;

          let charCount = 0;
          let currentLineIndex = 0;
          for (let i = 0; i < textLines.length; i++) {
            const lineLength = textLines[i].length;
            if (charCount + lineLength > letters[currentLetterIdx].index) {
              currentLineIndex = i;
              break;
            }
            charCount += lineLength + 1;
          }

          const targetLineIndex = currentLineIndex + 1;
          if (targetLineIndex >= textLines.length) return;

          const targetLineLetters = getHebrewLetters(textLines[targetLineIndex]);
          if (targetLineLetters.length === 0) return;

          let globalLetterIndex = 0;
          for (let i = 0; i < targetLineIndex; i++) {
            globalLetterIndex += getHebrewLetters(textLines[i]).length;
          }

          if (globalLetterIndex < letters.length) {
            newPosition = { mode: "letters", wordIndex: 0, letterIndex: globalLetterIndex };
          }
        }
      } else {
        // Apply display mode to get the same data structure used in DOM rendering
        const processedData = applyDisplayModeToSyllables(syllablesData, displayMode, niqqudCache);
        
        // If processedData is null, syllables cannot be used for current displayMode
        // Navigation is not possible in this state, so return early
        if (!processedData) {
          return;
        }
        
        const { words } = processedData;
        const { mode, wordIndex } = currentPosition;

        const wordToLineMap: number[] = [];
        let wordCount = 0;
        for (let lineIdx = 0; lineIdx < textLines.length; lineIdx++) {
          const lineWords = textLines[lineIdx].split(/\s+/).filter(w => w.trim().length > 0);
          for (let i = 0; i < lineWords.length && wordCount < words.length; i++) {
            wordToLineMap[wordCount] = lineIdx;
            wordCount++;
          }
        }

        const currentLineIndex = getLineIndexForWord(wordIndex, textLines);
        const targetLineIndex = currentLineIndex + 1;
        if (targetLineIndex >= textLines.length) return;

        const wordsByLine: Array<Array<{ wordIdx: number }>> = [];
        textLines.forEach((_, lineIdx) => { wordsByLine[lineIdx] = []; });
        words.forEach((_, wordIdx) => {
          const lineIdx = wordToLineMap[wordIdx] ?? 0;
          if (!wordsByLine[lineIdx]) wordsByLine[lineIdx] = [];
          wordsByLine[lineIdx].push({ wordIdx });
        });

        const targetLineWords = wordsByLine[targetLineIndex] || [];
        if (targetLineWords.length === 0) return;

        const currentLineWords = wordsByLine[currentLineIndex] || [];
        const currentWordIndexInLine = currentLineWords.findIndex(w => w.wordIdx === wordIndex);
        const targetWordIndexInLine = Math.min(
          currentWordIndexInLine >= 0 ? currentWordIndexInLine : 0,
          targetLineWords.length - 1
        );

        const targetWordIdx = targetLineWords[targetWordIndexInLine].wordIdx;

        if (mode === "words") {
          newPosition = { mode: "words", wordIndex: targetWordIdx };
        } else if (mode === "syllables") {
          newPosition = { mode: "syllables", wordIndex: targetWordIdx, syllableIndex: 0 };
        } else if (mode === "letters") {
          // Use processed syllables data to match DOM indices
          const targetWord = words[targetWordIdx];
          if (targetWord) {
            for (let sIdx = 0; sIdx < targetWord.syllables.length; sIdx++) {
              const syllable = targetWord.syllables[sIdx];
              for (let lIdx = 0; lIdx < syllable.length; lIdx++) {
                if (isHebrewLetter(syllable[lIdx])) {
            newPosition = {
              mode: "letters",
                    wordIndex: targetWordIdx,
                    syllableIndex: sIdx,
                    letterIndex: lIdx,
                  };
                  break;
                }
              }
              if (newPosition) break;
            }
          }
        }
      }

      if (newPosition) {
        updatePosition(newPosition);
      }
    }, [text, isSyllablesActive, syllablesData, navigationMode, getLineAndWordPosition, getLineIndexForWord, updatePosition, displayMode, niqqudCache]);

    /**
     * Reset position to the beginning based on current navigation mode
     */
    const resetPosition = useCallback(() => {
    if (!text || text.trim().length === 0) {
        updatePosition(null);
      return;
    }

      let initialPosition: CurrentPosition;

      if (isSyllablesActive && syllablesData) {
        initialPosition = {
          mode: navigationMode,
          wordIndex: 0,
          syllableIndex: navigationMode === "syllables" ? 0 : undefined,
          letterIndex: navigationMode === "letters" ? 0 : undefined,
        };
      } else {
        if (navigationMode === "words") {
          initialPosition = { mode: "words", wordIndex: 0 };
        } else if (navigationMode === "letters") {
          initialPosition = { mode: "letters", wordIndex: 0, letterIndex: 0 };
        } else {
          // syllables mode not available without syllables data
          initialPosition = { mode: "words", wordIndex: 0 };
        }
      }

      updatePosition(initialPosition);
    }, [text, isSyllablesActive, syllablesData, navigationMode, updatePosition]);

    // Expose imperative API via ref
    useImperativeHandle(ref, () => ({
      focusNext,
      focusPrev,
      focusUp,
      focusDown,
      highlight: updatePosition,
      clearHighlight: () => updatePosition(null),
      getCurrentPosition: () => currentPositionRef.current,
      resetPosition,
    }), [focusNext, focusPrev, focusUp, focusDown, updatePosition, resetPosition]);

    /**
     * Handle keyboard navigation
     * This is called from document keydown event listener
     */
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!text || text.trim().length === 0) return;

        const isArrowLeft = e.key === "ArrowLeft";
        const isArrowRight = e.key === "ArrowRight";
        const isArrowUp = e.key === "ArrowUp";
        const isArrowDown = e.key === "ArrowDown";
        const isTab = e.key === "Tab" && !e.shiftKey;
        const isShiftTab = e.key === "Tab" && e.shiftKey;

        if (!isArrowLeft && !isArrowRight && !isArrowUp && !isArrowDown && !isTab && !isShiftTab) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        // Handle vertical navigation
        if (isArrowUp) {
          focusUp();
          return;
        }
        if (isArrowDown) {
          focusDown();
          return;
        }

        // Handle horizontal navigation
        // ArrowLeft/Tab = forward (next), ArrowRight/Shift+Tab = backward (prev)
        // (Hebrew RTL: Left is forward, Right is backward)
        const isForward = isArrowLeft || isTab;

        if (isForward) {
          focusNext();
        } else {
          focusPrev();
        }
      },
      [text, focusNext, focusPrev, focusUp, focusDown]
    );

    // Initialize position when text changes or on mount
    useEffect(() => {
      if (!text || text.trim().length === 0) {
        if (currentPositionRef.current) {
          updatePosition(null);
        }
        initializedTextRef.current = "";
        return;
      }

      const textChanged = initializedTextRef.current !== text;
      
      if (textChanged || !currentPositionRef.current) {
        initializedTextRef.current = text;
        
        // Try to load saved position from localStorage
        const savedPosition = loadCurrentPosition();
        if (savedPosition && savedPosition.mode === navigationMode) {
          updatePosition(savedPosition);
        } else {
          resetPosition();
        }
      }
    }, [text, navigationMode, updatePosition, resetPosition]);

  // Update position mode when navigationMode changes
  useEffect(() => {
      const currentPosition = currentPositionRef.current;
    if (currentPosition && currentPosition.mode !== navigationMode && prevModeRef.current !== navigationMode) {
      prevModeRef.current = navigationMode;
      const updatedPosition: CurrentPosition = {
        mode: navigationMode,
        wordIndex: currentPosition.wordIndex,
        syllableIndex: navigationMode === "syllables" ? (currentPosition.syllableIndex ?? 0) : undefined,
        letterIndex: navigationMode === "letters" ? (currentPosition.letterIndex ?? 0) : undefined,
      };
        updatePosition(updatedPosition);
      }
    }, [navigationMode, updatePosition]);

    // Re-apply highlight after DOM updates (e.g., when syllablesData changes)
    useEffect(() => {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        const currentPosition = currentPositionRef.current;
        if (currentPosition && !isEditing) {
          applyHighlight(currentPosition);
        }
      }, 50);
      return () => clearTimeout(timer);
    }, [syllablesData, isSyllablesActive, displayMode, applyHighlight, isEditing]);

    // Auto-focus and listen to document keydown events when not editing
  useEffect(() => {
    if (text && text.trim().length > 0 && displayRef.current && !isEditing) {
        // Save current scroll position before focusing
      const savedScrollY = window.scrollY;
      const savedScrollX = window.scrollX;
      
      displayRef.current.focus();
      
        // Restore scroll position
      requestAnimationFrame(() => {
        window.scrollTo(savedScrollX, savedScrollY);
      });

      // Listen to document-level keydown events
        document.addEventListener("keydown", handleKeyDown);
      return () => {
          document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [text, handleKeyDown, isEditing]);

    // Clear highlight when switching to edit mode
    useEffect(() => {
      if (isEditing) {
        clearCurrentHighlight();
      }
    }, [isEditing, clearCurrentHighlight]);

    /**
     * Get CSS font-family value from font name
     * Maps font names to CSS values, including CSS variables for Next.js fonts
     */
    const getFontFamilyValue = (fontName: string): string => {
      switch (fontName) {
        case "Frank Ruhl Libre":
          return "var(--font-frank-ruhl-libre), 'Frank Ruhl Libre', serif";
        case "דנה יד":
          return "var(--font-dana-yad), 'דנה יד', serif";
        case "Inter":
          return "Inter, sans-serif";
        default:
          return fontName;
      }
    };

    /**
     * Render the text display with data attributes for DOM-based highlighting
     */
  const renderTextDisplay = () => {
    // Get styling preset configuration
    const preset = getPreset(stylingPreset);
    
    // Build className strings by combining base classes with preset classes
    const wordClassName = cn("pyramid-word-base", preset.wordClasses);
    const syllableClassName = cn("pyramid-syllable-base", preset.syllableClasses);
    const letterClassName = cn("pyramid-letter-base", preset.letterClasses);
    
    // Get font family CSS value
    const fontFamilyValue = getFontFamilyValue(fontFamily);
    
    if (isEditing || !text || text.trim().length === 0) {
      return (
        <Textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`min-h-[500px] text-right resize-y ${className}`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            letterSpacing: `${letterSpacing}px`,
            padding: '5px 15px',
            fontFamily: fontFamilyValue,
          }}
          dir="rtl"
          disabled={disabled}
          data-testid="editable-textarea"
        />
      );
    }

    // If no syllables data, render simple text with word/letter navigation
    if (!syllablesData || !isSyllablesActive) {
      const textLines = text.split('\n');

      return (
        <div
          ref={displayRef}
          className={`w-full min-h-[500px] p-4 border rounded-lg bg-background text-right ${className}`}
          dir="rtl"
          tabIndex={0}
          style={{ outline: "none", fontSize: `${fontSize}px`, fontFamily: fontFamilyValue }}
          contentEditable={false}
          data-testid="text-display-area"
        >
            {textLines.map((_lineText, lineIndex) => {
              const lineWords = getWordsFromText(textLines[lineIndex]);

            return (
                <div 
                  key={lineIndex} 
                  className="pyramid-line-base mb-2" 
                  dir="rtl" 
                  style={{ letterSpacing: `${letterSpacing}px`, '--dynamic-word-gap': `${wordSpacing}px`, fontFamily: fontFamilyValue } as React.CSSProperties}
                >
                {navigationMode === "words" ? (
                  lineWords.map((word, wordIndex) => {
                    // Find global word index
                    let globalWordIndex = 0;
                    for (let i = 0; i < lineIndex; i++) {
                      globalWordIndex += getWordsFromText(textLines[i]).length;
                    }
                    globalWordIndex += wordIndex;

                    return (
                      <span
                        key={wordIndex}
                          className={wordClassName}
                          data-word-index={globalWordIndex}
                          data-element-type="word"
                          style={{ outline: "none" }}
                          data-testid={`navigation-word-${globalWordIndex}`}
                      >
                        {word}
                      </span>
                    );
                  })
                ) : (
                  // Letters mode - show text with letter highlighting
                  lineWords.map((word, wordIndex) => {
                    const wordLetters = getHebrewLetters(word);
                    let globalLetterOffset = 0;
                    for (let i = 0; i < lineIndex; i++) {
                      globalLetterOffset += getHebrewLetters(textLines[i]).length;
                    }
                    for (let i = 0; i < wordIndex; i++) {
                      globalLetterOffset += getHebrewLetters(lineWords[i]).length;
                    }

                    const charGroups = groupLettersWithNiqqud(word);

                    return (
                      <span key={wordIndex} className="pyramid-word-wrapper">
                        {charGroups.map((group, groupIdx) => {
                          const letterInfo = wordLetters.find(l => l.index === group.index);
                          const letterIdx = letterInfo ? wordLetters.indexOf(letterInfo) : -1;
                          const globalLetterIdx = letterIdx !== -1 ? globalLetterOffset + letterIdx : -1;

                          if (!group.isHebrew) {
                            return <span key={groupIdx}>{group.text}</span>;
                          }

                          return (
                            <span
                              key={groupIdx}
                                className={letterClassName}
                                data-word-index={0}
                                data-syllable-index={0}
                                data-letter-index={globalLetterIdx}
                                data-element-type="letter"
                                style={{ outline: "none" }}
                                data-testid={`navigation-letter-0-0-${globalLetterIdx}`}
                              >
                                {group.text}
                            </span>
                          );
                        })}
                      </span>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // With syllables data - render text without visual syllable division
    // applyDisplayModeToSyllables may return null if syllables cannot be used
    // (e.g., displayMode='original' with partial niqqud that doesn't match the full text)
    const processedSyllablesData = syllablesData
      ? applyDisplayModeToSyllables(syllablesData, displayMode, niqqudCache)
      : null;
    
    // If processedSyllablesData is null, it means syllables cannot be accurately represented
    // for the current displayMode. In this case, fall back to simple word-based rendering.
    if (!processedSyllablesData && syllablesData) {
      // Syllables are not compatible with current displayMode - render without syllable structure
      const textLines = text.split('\n');
      
      return (
        <div
          ref={displayRef}
          className={`w-full min-h-[500px] p-4 border rounded-lg bg-background text-right ${className}`}
          dir="rtl"
          tabIndex={0}
          style={{ outline: "none", fontSize: `${fontSize}px`, fontFamily: fontFamilyValue }}
          contentEditable={false}
          data-testid="text-display-area"
        >
          {textLines.map((lineText, lineIndex) => {
            const lineWords = getWordsFromText(lineText);
            
            return (
              <div 
                key={lineIndex} 
                className="pyramid-line-base mb-2" 
                dir="rtl" 
                style={{ letterSpacing: `${letterSpacing}px`, '--dynamic-word-gap': `${wordSpacing}px` } as React.CSSProperties}
              >
                {navigationMode === "words" ? (
                  lineWords.map((word, wordIndex) => {
                    // Calculate global word index across all lines
                    let globalWordIndex = 0;
                    for (let i = 0; i < lineIndex; i++) {
                      globalWordIndex += getWordsFromText(textLines[i]).length;
                    }
                    globalWordIndex += wordIndex;

                    return (
                      <span
                        key={wordIndex}
                        className={wordClassName}
                        data-word-index={globalWordIndex}
                        data-element-type="word"
                        style={{ outline: "none" }}
                        data-testid={`navigation-word-${globalWordIndex}`}
                      >
                        {word}
                      </span>
                    );
                  })
                ) : navigationMode === "letters" ? (
                  // Letters mode - show text with letter highlighting
                  lineWords.map((word, wordIndex) => {
                    const wordLetters = getHebrewLetters(word);
                    let globalLetterOffset = 0;
                    for (let i = 0; i < lineIndex; i++) {
                      globalLetterOffset += getHebrewLetters(textLines[i]).length;
                    }
                    for (let i = 0; i < wordIndex; i++) {
                      globalLetterOffset += getHebrewLetters(lineWords[i]).length;
                    }

                    const charGroups = groupLettersWithNiqqud(word);

                    return (
                      <span key={wordIndex} className="pyramid-word-wrapper">
                        {charGroups.map((group, groupIdx) => {
                          const letterInfo = wordLetters.find(l => l.index === group.index);
                          const letterIdx = letterInfo ? wordLetters.indexOf(letterInfo) : -1;
                          const globalLetterIdx = letterIdx !== -1 ? globalLetterOffset + letterIdx : -1;

                          if (!group.isHebrew) {
                            return <span key={groupIdx}>{group.text}</span>;
                          }

                          return (
                            <span
                              key={groupIdx}
                              className={letterClassName}
                              data-word-index={0}
                              data-syllable-index={0}
                              data-letter-index={globalLetterIdx}
                              data-element-type="letter"
                              style={{ outline: "none" }}
                              data-testid={`navigation-letter-0-0-${globalLetterIdx}`}
                            >
                              {group.text}
                            </span>
                          );
                        })}
                      </span>
                    );
                  })
                ) : (
                  // Syllables mode not available without processedSyllablesData - show as words
                  lineWords.map((word, wordIndex) => {
                    let globalWordIndex = 0;
                    for (let i = 0; i < lineIndex; i++) {
                      globalWordIndex += getWordsFromText(textLines[i]).length;
                    }
                    globalWordIndex += wordIndex;

                    return (
                      <span
                        key={wordIndex}
                        className={wordClassName}
                        data-word-index={globalWordIndex}
                        data-element-type="word"
                        style={{ outline: "none" }}
                        data-testid={`navigation-word-${globalWordIndex}`}
                      >
                        {word}
                      </span>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      );
    }
    
    const { words } = processedSyllablesData || { words: [] };

    const textLines = text.split('\n');
    const wordToLineMap: number[] = [];
    let wordCount = 0;
    for (let lineIdx = 0; lineIdx < textLines.length; lineIdx++) {
      const lineWords = textLines[lineIdx].split(/\s+/).filter(w => w.trim().length > 0);
      for (let i = 0; i < lineWords.length && wordCount < words.length; i++) {
        wordToLineMap[wordCount] = lineIdx;
        wordCount++;
      }
    }

    const wordsByLine: Array<Array<{ wordIdx: number; wordEntry: typeof words[0] }>> = [];
      textLines.forEach((_, lineIdx) => { wordsByLine[lineIdx] = []; });
    words.forEach((wordEntry, wordIdx) => {
      const lineIdx = wordToLineMap[wordIdx] ?? 0;
        if (!wordsByLine[lineIdx]) wordsByLine[lineIdx] = [];
      wordsByLine[lineIdx].push({ wordIdx, wordEntry });
    });

    return (
      <div
        ref={displayRef}
        className={`w-full min-h-[500px] p-4 border rounded-lg bg-background text-right ${className}`}
        dir="rtl"
        tabIndex={0}
        style={{ outline: "none", fontSize: `${fontSize}px` }}
        contentEditable={false}
        data-testid="text-display-area"
      >
        {textLines.map((lineText, lineIndex) => {
          const lineWords = wordsByLine[lineIndex] || [];

          return (
              <div 
                key={lineIndex} 
                className="pyramid-line-base mb-2" 
                dir="rtl" 
                style={{ letterSpacing: `${letterSpacing}px`, '--dynamic-word-gap': `${wordSpacing}px` } as React.CSSProperties}
              >
              {navigationMode === "words" ? (
                lineWords.map(({ wordIdx, wordEntry }) => {
                  const wordText = wordEntry.syllables.join("");
                  return (
                    <span
                      key={wordIdx}
                        className={wordClassName}
                        data-word-index={wordIdx}
                        data-element-type="word"
                        style={{ outline: "none" }}
                        data-testid={`navigation-word-${wordIdx}`}
                    >
                      {wordText}
                    </span>
                  );
                })
              ) : navigationMode === "syllables" ? (
                  // Syllables mode
                lineWords.map(({ wordIdx, wordEntry }) => {
                  const syllables = wordEntry.syllables;
                  return (
                    <span key={wordIdx} className="pyramid-word-wrapper">
                        {syllables.map((syllable, syllableIndex) => (
                          <span
                            key={`${wordIdx}-${syllableIndex}`}
                            className={syllableClassName}
                            data-word-index={wordIdx}
                            data-syllable-index={syllableIndex}
                            data-element-type="syllable"
                            style={{ outline: "none" }}
                            data-testid={`navigation-syllable-${wordIdx}-${syllableIndex}`}
                          >
                            {syllable}
                          </span>
                        ))}
                    </span>
                  );
                })
              ) : (
                  // Letters mode
                lineWords.map(({ wordIdx, wordEntry }) => {
                  const syllables = wordEntry.syllables;
                  const wordText = syllables.join("");

                  const letterPositions: Array<{ syllableIdx: number; letterIdx: number; charIndex: number }> = [];
                  let charCount = 0;
                  for (let sIdx = 0; sIdx < syllables.length; sIdx++) {
                    const syllable = syllables[sIdx];
                    for (let lIdx = 0; lIdx < syllable.length; lIdx++) {
                      if (isHebrewLetter(syllable[lIdx])) {
                        letterPositions.push({ syllableIdx: sIdx, letterIdx: lIdx, charIndex: charCount });
                      }
                      charCount++;
                    }
                  }

                  const charGroups = groupLettersWithNiqqud(wordText);

                  return (
                    <span key={wordIdx} className="pyramid-word-wrapper">
                      {charGroups.map((group, groupIdx) => {
                        const letterPos = letterPositions.find(lp => lp.charIndex === group.index);

                        if (!group.isHebrew) {
                          return <span key={`${wordIdx}-${groupIdx}`}>{group.text}</span>;
                        }

                        return (
                          <span
                            key={`${wordIdx}-${groupIdx}`}
                              className={letterClassName}
                              data-word-index={wordIdx}
                              data-syllable-index={letterPos?.syllableIdx ?? 0}
                              data-letter-index={letterPos?.letterIdx ?? 0}
                              data-element-type="letter"
                              style={{ outline: "none" }}
                              data-testid={`navigation-letter-${wordIdx}-${letterPos?.syllableIdx ?? groupIdx}-${letterPos?.letterIdx ?? 0}`}
                            >
                              {group.text}
                          </span>
                        );
                      })}
                    </span>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return renderTextDisplay();
}
);
