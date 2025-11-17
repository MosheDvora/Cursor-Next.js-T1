"use client";

import { useEffect, useRef, useCallback } from "react";
import { SyllablesData } from "@/lib/syllables";
import { CurrentPosition, saveCurrentPosition } from "@/lib/settings";
import { Textarea } from "@/components/ui/textarea";

interface EditableSyllablesTextareaProps {
  text: string;
  onChange: (text: string) => void;
  isSyllablesActive: boolean;
  syllablesData: SyllablesData | null;
  currentPosition: CurrentPosition | null;
  onPositionChange: (position: CurrentPosition | null) => void;
  navigationMode: "words" | "syllables" | "letters";
  borderSize: number;
  backgroundColor: string;
  wordSpacing: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Component that displays text with syllables when active, or regular textarea when inactive
 * Supports navigation with arrow keys and dual-level highlighting (word + syllable/letter)
 */
export function EditableSyllablesTextarea({
  text,
  onChange,
  isSyllablesActive,
  syllablesData,
  currentPosition,
  onPositionChange,
  navigationMode,
  borderSize,
  backgroundColor,
  wordSpacing,
  disabled = false,
  placeholder = "הדבק כאן את הטקסט הראשי לצורך מניפולציות...",
  className = "",
}: EditableSyllablesTextareaProps) {
  const displayRef = useRef<HTMLDivElement>(null);

  // Color constants for highlighting
  const WORD_HIGHLIGHT_COLOR = "#e0e7ff"; // Light blue for word level
  const CURRENT_HIGHLIGHT_COLOR = "#fef3c7"; // Light yellow for current syllable/letter
  const CURRENT_BORDER_COLOR = "#f59e0b"; // Amber border

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isSyllablesActive || !syllablesData || !currentPosition) {
        return;
      }

      // Only handle arrow keys
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const { words } = syllablesData;
      const { mode, wordIndex, syllableIndex, letterIndex } = currentPosition;

      let newPosition: CurrentPosition = { ...currentPosition };

      if (mode === "words") {
        // Navigate between words
        if (e.key === "ArrowRight") {
          if (wordIndex < words.length - 1) {
            newPosition.wordIndex = wordIndex + 1;
          }
        } else if (e.key === "ArrowLeft") {
          if (wordIndex > 0) {
            newPosition.wordIndex = wordIndex - 1;
          }
        }
      } else if (mode === "syllables") {
        // Navigate between syllables
        const currentWord = words[wordIndex];
        if (!currentWord) return;

        const syllables = currentWord.syllables;
        const currentSyllableIdx = syllableIndex ?? 0;

        if (e.key === "ArrowRight") {
          if (currentSyllableIdx < syllables.length - 1) {
            newPosition.syllableIndex = currentSyllableIdx + 1;
          } else if (wordIndex < words.length - 1) {
            // Move to next word, first syllable
            newPosition.wordIndex = wordIndex + 1;
            newPosition.syllableIndex = 0;
          }
        } else if (e.key === "ArrowLeft") {
          if (currentSyllableIdx > 0) {
            newPosition.syllableIndex = currentSyllableIdx - 1;
          } else if (wordIndex > 0) {
            // Move to previous word, last syllable
            const prevWord = words[wordIndex - 1];
            newPosition.wordIndex = wordIndex - 1;
            newPosition.syllableIndex = prevWord.syllables.length - 1;
          }
        }
      } else if (mode === "letters") {
        // Navigate between letters
        const currentWord = words[wordIndex];
        if (!currentWord) return;

        const syllables = currentWord.syllables;
        const currentSyllableIdx = syllableIndex ?? 0;
        const currentSyllable = syllables[currentSyllableIdx] || "";
        const currentLetterIdx = letterIndex ?? 0;

        if (e.key === "ArrowRight") {
          if (currentLetterIdx < currentSyllable.length - 1) {
            newPosition.letterIndex = currentLetterIdx + 1;
          } else if (currentSyllableIdx < syllables.length - 1) {
            // Move to next syllable, first letter
            newPosition.syllableIndex = currentSyllableIdx + 1;
            newPosition.letterIndex = 0;
          } else if (wordIndex < words.length - 1) {
            // Move to next word, first syllable, first letter
            newPosition.wordIndex = wordIndex + 1;
            newPosition.syllableIndex = 0;
            newPosition.letterIndex = 0;
          }
        } else if (e.key === "ArrowLeft") {
          if (currentLetterIdx > 0) {
            newPosition.letterIndex = currentLetterIdx - 1;
          } else if (currentSyllableIdx > 0) {
            // Move to previous syllable, last letter
            const prevSyllable = syllables[currentSyllableIdx - 1] || "";
            newPosition.syllableIndex = currentSyllableIdx - 1;
            newPosition.letterIndex = prevSyllable.length - 1;
          } else if (wordIndex > 0) {
            // Move to previous word, last syllable, last letter
            const prevWord = words[wordIndex - 1];
            const lastSyllable = prevWord.syllables[prevWord.syllables.length - 1] || "";
            newPosition.wordIndex = wordIndex - 1;
            newPosition.syllableIndex = prevWord.syllables.length - 1;
            newPosition.letterIndex = lastSyllable.length - 1;
          }
        }
      }

      // Update position and save
      onPositionChange(newPosition);
      saveCurrentPosition(newPosition);
    },
    [isSyllablesActive, syllablesData, currentPosition, onPositionChange]
  );

  // Initialize position when syllables become active
  useEffect(() => {
    if (isSyllablesActive && syllablesData && !currentPosition) {
      const initialPosition: CurrentPosition = {
        mode: navigationMode,
        wordIndex: 0,
        syllableIndex: navigationMode === "syllables" ? 0 : undefined,
        letterIndex: navigationMode === "letters" ? 0 : undefined,
      };
      onPositionChange(initialPosition);
      saveCurrentPosition(initialPosition);
    }
  }, [isSyllablesActive, syllablesData, currentPosition, navigationMode, onPositionChange]);

  // Update position mode when navigationMode changes
  useEffect(() => {
    if (currentPosition && currentPosition.mode !== navigationMode) {
      const updatedPosition: CurrentPosition = {
        mode: navigationMode,
        wordIndex: currentPosition.wordIndex,
        syllableIndex: navigationMode === "syllables" ? (currentPosition.syllableIndex ?? 0) : undefined,
        letterIndex: navigationMode === "letters" ? (currentPosition.letterIndex ?? 0) : undefined,
      };
      onPositionChange(updatedPosition);
      saveCurrentPosition(updatedPosition);
    }
  }, [navigationMode, currentPosition, onPositionChange]);

  // If syllables are not active, show regular textarea
  if (!isSyllablesActive || !syllablesData) {
    return (
      <Textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`min-h-[500px] text-right text-lg md:text-xl resize-y ${className}`}
        dir="rtl"
        disabled={disabled}
      />
    );
  }

  // Render syllables display with highlighting
  const { words } = syllablesData;
  const currentWordIdx = currentPosition?.wordIndex ?? 0;
  const currentSyllableIdx = currentPosition?.syllableIndex ?? 0;
  const currentLetterIdx = currentPosition?.letterIndex ?? 0;

  return (
    <div
      ref={displayRef}
      className={`w-full min-h-[500px] p-4 border rounded-lg bg-background text-right text-lg md:text-xl ${className}`}
      dir="rtl"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
      contentEditable={false}
    >
      <div
        className="flex flex-wrap gap-y-2 items-center justify-start"
        dir="rtl"
        style={{ gap: `${wordSpacing}px` }}
      >
        {words.map((wordEntry, wordIndex) => {
          const isCurrentWord = wordIndex === currentWordIdx;
          const syllables = wordEntry.syllables;

          return (
            <div
              key={wordIndex}
              className="inline-flex flex-wrap gap-x-1 items-center"
              dir="rtl"
              style={{
                backgroundColor: isCurrentWord && navigationMode === "words" ? WORD_HIGHLIGHT_COLOR : "transparent",
                borderRadius: "4px",
                padding: isCurrentWord && navigationMode === "words" ? "2px" : "0",
              }}
            >
              {syllables.map((syllable, syllableIndex) => {
                const isCurrentSyllable =
                  isCurrentWord &&
                  navigationMode === "syllables" &&
                  syllableIndex === currentSyllableIdx;
                const isCurrentSyllableForLetters =
                  isCurrentWord &&
                  navigationMode === "letters" &&
                  syllableIndex === currentSyllableIdx;

                return (
                  <span
                    key={`${wordIndex}-${syllableIndex}`}
                    className="inline-block px-2 py-1 rounded-lg font-medium text-right"
                    dir="rtl"
                    style={{
                      borderWidth: `${borderSize}px`,
                      borderColor: isCurrentSyllable ? CURRENT_BORDER_COLOR : "#3b82f6",
                      borderStyle: "solid",
                      backgroundColor:
                        isCurrentSyllable
                          ? CURRENT_HIGHLIGHT_COLOR
                          : isCurrentWord && navigationMode === "words"
                          ? WORD_HIGHLIGHT_COLOR
                          : backgroundColor,
                      borderRadius: isCurrentSyllable ? "8px" : "4px",
                      color: "#1e40af",
                    }}
                  >
                    {navigationMode === "letters" && isCurrentSyllableForLetters
                      ? syllable.split("").map((letter, letterIndex) => {
                          const isCurrentLetter = letterIndex === currentLetterIdx;
                          return (
                            <span
                              key={`${wordIndex}-${syllableIndex}-${letterIndex}`}
                              style={{
                                backgroundColor: isCurrentLetter
                                  ? CURRENT_HIGHLIGHT_COLOR
                                  : "transparent",
                                borderRadius: isCurrentLetter ? "4px" : "0",
                                padding: isCurrentLetter ? "1px 2px" : "0",
                                border:
                                  isCurrentLetter
                                    ? `1px solid ${CURRENT_BORDER_COLOR}`
                                    : "none",
                              }}
                            >
                              {letter}
                            </span>
                          );
                        })
                      : syllable}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

