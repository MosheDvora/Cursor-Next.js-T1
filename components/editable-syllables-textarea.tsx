"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { SyllablesData } from "@/lib/syllables";
import { CurrentPosition, saveCurrentPosition } from "@/lib/settings";
import { Textarea } from "@/components/ui/textarea";
import { isNiqqudMark } from "@/lib/niqqud";

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
  letterSpacing,
  fontSize = 30,
  wordHighlightPadding = 4,
  syllableHighlightPadding = 3,
  letterHighlightPadding = 2,
  wordHighlightColor = "#fff176",
  syllableHighlightColor = "#fff176",
  letterHighlightColor = "#fff176",
  disabled = false,
  placeholder = "הדבק כאן את הטקסט הראשי לצורך מניפולציות...",
  className = "",
}: EditableSyllablesTextareaProps) {
  const displayRef = useRef<HTMLDivElement>(null);
  const prevModeRef = useRef<string | null>(null);
  const initializedTextRef = useRef<string>("");
  const [hoveredWordIndex, setHoveredWordIndex] = useState<number | null>(null);
  const [hoveredLetterIndex, setHoveredLetterIndex] = useState<number | null>(null);

  // Color constants for highlighting - use props with defaults
  const WORD_HIGHLIGHT_COLOR = wordHighlightColor;
  const CURRENT_HIGHLIGHT_COLOR = syllableHighlightColor;
  const LETTER_HIGHLIGHT_COLOR = letterHighlightColor;
  const HOVER_HIGHLIGHT_COLOR = "#fffacd"; // Soft yellow for hover

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

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement> | KeyboardEvent) => {
      if (!text || text.trim().length === 0) {
        return;
      }

      // Handle arrow keys and Tab
      const isArrowLeft = e.key === "ArrowLeft";
      const isArrowRight = e.key === "ArrowRight";
      const isTab = e.key === "Tab" && !e.shiftKey;
      const isShiftTab = e.key === "Tab" && e.shiftKey;

      if (!isArrowLeft && !isArrowRight && !isTab && !isShiftTab) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Determine direction: ArrowLeft/Tab = forward (increase index), ArrowRight/Shift+Tab = backward (decrease index)
      const isForward = isArrowLeft || isTab;
      const isBackward = isArrowRight || isShiftTab;

      let newPosition: CurrentPosition | null = null;

      // If no syllables data, navigate on raw text
      if (!syllablesData || !isSyllablesActive) {
        if (navigationMode === "words") {
          const words = getWordsFromText(text);
          const currentWordIdx = currentPosition?.wordIndex ?? 0;
          
          if (isForward && currentWordIdx < words.length - 1) {
            newPosition = { mode: "words", wordIndex: currentWordIdx + 1 };
          } else if (isBackward && currentWordIdx > 0) {
            newPosition = { mode: "words", wordIndex: currentWordIdx - 1 };
          } else if (!currentPosition) {
            newPosition = { mode: "words", wordIndex: 0 };
          }
        } else if (navigationMode === "letters") {
          const letters = getHebrewLetters(text);
          const currentLetterIdx = currentPosition?.letterIndex ?? 0;
          
          if (isForward && currentLetterIdx < letters.length - 1) {
            newPosition = { mode: "letters", wordIndex: 0, letterIndex: currentLetterIdx + 1 };
          } else if (isBackward && currentLetterIdx > 0) {
            newPosition = { mode: "letters", wordIndex: 0, letterIndex: currentLetterIdx - 1 };
          } else if (!currentPosition) {
            newPosition = { mode: "letters", wordIndex: 0, letterIndex: 0 };
          }
        }
      } else {
        // Navigate with syllables data
        if (!currentPosition) return;

        const { words } = syllablesData;
        const { mode, wordIndex, syllableIndex, letterIndex } = currentPosition;

        newPosition = { ...currentPosition };

        if (mode === "words") {
          // Navigate between words
          if (isForward) {
            if (wordIndex < words.length - 1) {
              newPosition.wordIndex = wordIndex + 1;
            }
          } else if (isBackward) {
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

          if (isForward) {
            if (currentSyllableIdx < syllables.length - 1) {
              newPosition.syllableIndex = currentSyllableIdx + 1;
            } else if (wordIndex < words.length - 1) {
              // Move to next word, first syllable
              newPosition.wordIndex = wordIndex + 1;
              newPosition.syllableIndex = 0;
            }
          } else if (isBackward) {
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
          // Navigate between letters - only Hebrew letters, skip niqqud
          const allLetters: Array<{ wordIdx: number; syllableIdx: number; letterIdx: number }> = [];
          
          // Collect all Hebrew letters from all words/syllables
          words.forEach((word, wIdx) => {
            word.syllables.forEach((syllable, sIdx) => {
              for (let i = 0; i < syllable.length; i++) {
                if (isHebrewLetter(syllable[i])) {
                  allLetters.push({ wordIdx: wIdx, syllableIdx: sIdx, letterIdx: i });
                }
              }
            });
          });

          // Find current letter index - verify it's actually a Hebrew letter
          let currentLetterGlobalIdx = -1;
          if (wordIndex < words.length) {
            const currentWord = words[wordIndex];
            const currentSyllableIdx = syllableIndex ?? 0;
            const currentLetterIdx = letterIndex ?? 0;
            
            if (currentSyllableIdx < currentWord.syllables.length) {
              const currentSyllable = currentWord.syllables[currentSyllableIdx];
              if (currentLetterIdx < currentSyllable.length && isHebrewLetter(currentSyllable[currentLetterIdx])) {
                // Current position points to a Hebrew letter, find it in the list
                currentLetterGlobalIdx = allLetters.findIndex(
                  l => l.wordIdx === wordIndex && 
                       l.syllableIdx === currentSyllableIdx && 
                       l.letterIdx === currentLetterIdx
                );
              }
            }
          }

          // If current position doesn't match a Hebrew letter, go to first letter
          if (currentLetterGlobalIdx === -1 && allLetters.length > 0) {
            newPosition = {
              mode: "letters",
              wordIndex: allLetters[0].wordIdx,
              syllableIndex: allLetters[0].syllableIdx,
              letterIndex: allLetters[0].letterIdx,
            };
          } else if (isForward && currentLetterGlobalIdx < allLetters.length - 1) {
            // Move forward to next Hebrew letter
            const next = allLetters[currentLetterGlobalIdx + 1];
            newPosition = {
              mode: "letters",
              wordIndex: next.wordIdx,
              syllableIndex: next.syllableIdx,
              letterIndex: next.letterIdx,
            };
          } else if (isBackward && currentLetterGlobalIdx > 0) {
            // Move backward to previous Hebrew letter
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

      // Update position and save
      if (newPosition) {
        onPositionChange(newPosition);
        saveCurrentPosition(newPosition);
      }
    },
    [text, isSyllablesActive, syllablesData, currentPosition, navigationMode, onPositionChange]
  );

  // Initialize position when text changes or navigation mode changes
  useEffect(() => {
    if (!text || text.trim().length === 0) {
      if (currentPosition) {
        onPositionChange(null);
        saveCurrentPosition(null);
      }
      initializedTextRef.current = "";
      return;
    }

    // Only initialize if text changed or we don't have a position yet
    const textChanged = initializedTextRef.current !== text;
    if (textChanged || !currentPosition) {
      initializedTextRef.current = text;
      
      let initialPosition: CurrentPosition;
      
      if (isSyllablesActive && syllablesData) {
        initialPosition = {
          mode: navigationMode,
          wordIndex: 0,
          syllableIndex: navigationMode === "syllables" ? 0 : undefined,
          letterIndex: navigationMode === "letters" ? 0 : undefined,
        };
      } else {
        // No syllables data - initialize based on navigation mode
        if (navigationMode === "words") {
          initialPosition = { mode: "words", wordIndex: 0 };
        } else if (navigationMode === "letters") {
          initialPosition = { mode: "letters", wordIndex: 0, letterIndex: 0 };
        } else {
          // syllables mode not available without syllables data
          return;
        }
      }
      
      onPositionChange(initialPosition);
      saveCurrentPosition(initialPosition);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, isSyllablesActive, syllablesData, navigationMode]);

  // Update position mode when navigationMode changes
  useEffect(() => {
    if (currentPosition && currentPosition.mode !== navigationMode && prevModeRef.current !== navigationMode) {
      prevModeRef.current = navigationMode;
      const updatedPosition: CurrentPosition = {
        mode: navigationMode,
        wordIndex: currentPosition.wordIndex,
        syllableIndex: navigationMode === "syllables" ? (currentPosition.syllableIndex ?? 0) : undefined,
        letterIndex: navigationMode === "letters" ? (currentPosition.letterIndex ?? 0) : undefined,
      };
      onPositionChange(updatedPosition);
      saveCurrentPosition(updatedPosition);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationMode]);

  // Auto-focus and listen to document keydown events when text exists
  useEffect(() => {
    if (text && text.trim().length > 0 && displayRef.current) {
      // Auto-focus the display element
      displayRef.current.focus();

      // Listen to document-level keydown events
      const handleDocumentKeyDown = (e: KeyboardEvent) => {
        handleKeyDown(e);
      };

      document.addEventListener("keydown", handleDocumentKeyDown);
      return () => {
        document.removeEventListener("keydown", handleDocumentKeyDown);
      };
    }
  }, [text, handleKeyDown]);

  // Render text display with navigation support
  // Always show text, but hide syllable division visually
  const renderTextDisplay = () => {
    if (!text || text.trim().length === 0) {
      return (
        <Textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`min-h-[500px] text-right resize-y ${className}`}
          style={{ fontSize: `${fontSize}px` }}
          dir="rtl"
          disabled={disabled}
        />
      );
    }

    // If no syllables data, render simple text with word/letter navigation
    if (!syllablesData || !isSyllablesActive) {
      const words = getWordsFromText(text);
      const letters = getHebrewLetters(text);
      const currentWordIdx = currentPosition?.wordIndex ?? 0;
      const currentLetterIdx = currentPosition?.letterIndex ?? 0;
      
      // Split text into lines
      const textLines = text.split('\n');

      return (
        <div
          ref={displayRef}
          className={`w-full min-h-[500px] p-4 border rounded-lg bg-background text-right ${className}`}
          dir="rtl"
          tabIndex={0}
          style={{ outline: "none", fontSize: `${fontSize}px` }}
          contentEditable={false}
        >
          {textLines.map((lineText, lineIndex) => {
            const lineWords = getWordsFromText(lineText);
            const lineLetters = getHebrewLetters(lineText);
            let lineCharOffset = 0;
            for (let i = 0; i < lineIndex; i++) {
              lineCharOffset += textLines[i].length + 1; // +1 for \n
            }

            return (
              <div key={lineIndex} className="pyramid-line-base mb-2" dir="rtl" style={{ letterSpacing: `${letterSpacing}px`, '--dynamic-word-gap': `${wordSpacing}px` } as React.CSSProperties}>
                {navigationMode === "words" ? (
                  lineWords.map((word, wordIndex) => {
                    // Find global word index
                    let globalWordIndex = 0;
                    for (let i = 0; i < lineIndex; i++) {
                      globalWordIndex += getWordsFromText(textLines[i]).length;
                    }
                    globalWordIndex += wordIndex;
                    
                    const isCurrentWord = globalWordIndex === currentWordIdx;
                    const isHoveredWord = globalWordIndex === hoveredWordIndex;
                    return (
                      <span
                        key={wordIndex}
                        className={`pyramid-word-base ${isCurrentWord ? 'pyramid-word-active' : ''}`}
                        onMouseEnter={() => setHoveredWordIndex(globalWordIndex)}
                        onMouseLeave={() => setHoveredWordIndex(null)}
                        style={{
                          backgroundColor: isHoveredWord 
                            ? HOVER_HIGHLIGHT_COLOR 
                            : isCurrentWord 
                            ? WORD_HIGHLIGHT_COLOR 
                            : undefined,
                          outline: "none",
                        }}
                      >
                        {word}
                      </span>
                    );
                  })
                ) : (
                  // Letters mode - show text with letter highlighting
                  lineWords.map((word, wordIndex) => {
                    // Calculate character offset for this word within the line
                    let wordCharOffset = 0;
                    for (let i = 0; i < wordIndex; i++) {
                      wordCharOffset += lineWords[i].length;
                      // Add space after each word (except last)
                      if (i < lineWords.length - 1) {
                        wordCharOffset += 1; // space character
                      }
                    }
                    
                    // Find letters in this word
                    const wordLetters = getHebrewLetters(word);
                    
                    // Calculate global letter offset (letters from previous lines + previous words in this line)
                    let globalLetterOffset = 0;
                    for (let i = 0; i < lineIndex; i++) {
                      globalLetterOffset += getHebrewLetters(textLines[i]).length;
                    }
                    for (let i = 0; i < wordIndex; i++) {
                      globalLetterOffset += getHebrewLetters(lineWords[i]).length;
                    }
                    
                    return (
                      <span key={wordIndex} className="pyramid-word-wrapper">
                        {word.split("").map((char, charIndexInWord) => {
                          const charIndex = wordCharOffset + charIndexInWord;
                          const globalIndex = lineCharOffset + charIndex;
                          const letterInfo = wordLetters.find(l => l.index === charIndexInWord);
                          const letterIdx = letterInfo ? wordLetters.indexOf(letterInfo) : -1;
                          
                          // Find global letter index
                          const globalLetterIdx = letterIdx !== -1 ? globalLetterOffset + letterIdx : -1;
                          
                          const isCurrentLetter = globalLetterIdx === currentLetterIdx;
                          const isHoveredLetter = globalIndex === hoveredLetterIndex;
                          
                          if (!isHebrewLetter(char)) {
                            return <span key={charIndexInWord}>{char}</span>;
                          }

                          return (
                            <span
                              key={charIndexInWord}
                              className={`pyramid-letter-base ${isCurrentLetter ? 'pyramid-letter-active' : ''}`}
                              onMouseEnter={() => setHoveredLetterIndex(globalIndex)}
                              onMouseLeave={() => setHoveredLetterIndex(null)}
                              style={{
                                backgroundColor: isHoveredLetter
                                  ? HOVER_HIGHLIGHT_COLOR
                                  : isCurrentLetter
                                  ? LETTER_HIGHLIGHT_COLOR
                                  : undefined,
                                outline: "none",
                              }}
                            >
                              {char}
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
    const { words } = syllablesData;
    const currentWordIdx = currentPosition?.wordIndex ?? 0;
    const currentSyllableIdx = currentPosition?.syllableIndex ?? 0;
    const currentLetterIdx = currentPosition?.letterIndex ?? 0;

    // Split original text into lines to preserve line structure
    const textLines = text.split('\n');
    
    // Build word-to-line mapping based on original text
    const wordToLineMap: number[] = [];
    const originalWords = text.split(/\s+/).filter(w => w.trim().length > 0);
    
    // Map syllables words to original text words by line
    let wordCount = 0;
    for (let lineIdx = 0; lineIdx < textLines.length; lineIdx++) {
      const lineWords = textLines[lineIdx].split(/\s+/).filter(w => w.trim().length > 0);
      for (let i = 0; i < lineWords.length && wordCount < words.length; i++) {
        wordToLineMap[wordCount] = lineIdx;
        wordCount++;
      }
    }
    
    // Group words by line
    const wordsByLine: Array<Array<{ wordIdx: number; wordEntry: typeof words[0] }>> = [];
    textLines.forEach((_, lineIdx) => {
      wordsByLine[lineIdx] = [];
    });
    words.forEach((wordEntry, wordIdx) => {
      const lineIdx = wordToLineMap[wordIdx] ?? 0;
      if (!wordsByLine[lineIdx]) {
        wordsByLine[lineIdx] = [];
      }
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
      >
        {textLines.map((lineText, lineIndex) => {
          const lineWords = wordsByLine[lineIndex] || [];

          return (
            <div key={lineIndex} className="pyramid-line-base mb-2" dir="rtl" style={{ letterSpacing: `${letterSpacing}px`, '--dynamic-word-gap': `${wordSpacing}px` } as React.CSSProperties}>
              {navigationMode === "words" ? (
                lineWords.map(({ wordIdx, wordEntry }) => {
                  const wordText = wordEntry.syllables.join("");
                  const isCurrentWord = wordIdx === currentWordIdx;
                  const isHoveredWord = wordIdx === hoveredWordIndex;
                  return (
                    <span
                      key={wordIdx}
                      className={`pyramid-word-base ${isCurrentWord ? 'pyramid-word-active' : ''}`}
                      onMouseEnter={() => setHoveredWordIndex(wordIdx)}
                      onMouseLeave={() => setHoveredWordIndex(null)}
                      style={{
                        backgroundColor: isHoveredWord 
                          ? HOVER_HIGHLIGHT_COLOR 
                          : isCurrentWord 
                          ? WORD_HIGHLIGHT_COLOR 
                          : undefined,
                        outline: "none",
                      }}
                    >
                      {wordText}
                    </span>
                  );
                })
              ) : navigationMode === "syllables" ? (
                // Syllables mode - highlight syllable being navigated
                lineWords.map(({ wordIdx, wordEntry }) => {
                  const syllables = wordEntry.syllables;
                  return (
                    <span key={wordIdx} className="pyramid-word-wrapper">
                      {syllables.map((syllable, syllableIndex) => {
                        const isCurrentSyllable = 
                          wordIdx === currentWordIdx && 
                          syllableIndex === currentSyllableIdx;
                        
                        return (
                          <span
                            key={`${wordIdx}-${syllableIndex}`}
                            className={`pyramid-syllable-base ${isCurrentSyllable ? 'pyramid-syllable-active' : ''}`}
                            style={{
                              backgroundColor: isCurrentSyllable ? CURRENT_HIGHLIGHT_COLOR : undefined,
                              outline: "none",
                            }}
                          >
                            {syllable}
                          </span>
                        );
                      })}
                    </span>
                  );
                })
              ) : (
                // Letters mode - highlight only Hebrew letters
                lineWords.map(({ wordIdx, wordEntry }) => {
                  const syllables = wordEntry.syllables;
                  const wordText = syllables.join("");
                  
                  // Build map of Hebrew letter positions
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
                  
                  return (
                    <span key={wordIdx} className="pyramid-word-wrapper">
                      {wordText.split("").map((char, charIndex) => {
                        // Find if this char position matches current letter position
                        const letterPos = letterPositions.find(lp => lp.charIndex === charIndex);
                        const isCurrentLetter = 
                          wordIdx === currentWordIdx &&
                          letterPos &&
                          letterPos.syllableIdx === currentSyllableIdx &&
                          letterPos.letterIdx === currentLetterIdx &&
                          isHebrewLetter(char);
                        
                        if (!isHebrewLetter(char)) {
                          return <span key={`${wordIdx}-${charIndex}`}>{char}</span>;
                        }

                        return (
                          <span
                            key={`${wordIdx}-${charIndex}`}
                            className={`pyramid-letter-base ${isCurrentLetter ? 'pyramid-letter-active' : ''}`}
                            style={{
                              backgroundColor: isCurrentLetter ? LETTER_HIGHLIGHT_COLOR : undefined,
                              outline: "none",
                            }}
                          >
                            {char}
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

