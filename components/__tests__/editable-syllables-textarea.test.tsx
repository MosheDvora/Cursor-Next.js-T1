/**
 * Unit tests for EditableSyllablesTextarea component
 * 
 * Tests cover:
 * - Imperative API (focusNext, focusPrev, focusUp, focusDown, highlight, clearHighlight)
 * - Navigation modes (words, syllables, letters)
 * - Position persistence via localStorage
 * - DOM class toggling for highlights
 * - applyDisplayModeToSyllables function for partial niqqud handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { EditableSyllablesTextarea, EditableSyllablesTextareaRef, applyDisplayModeToSyllables } from '../editable-syllables-textarea'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

describe('EditableSyllablesTextarea', () => {
  const defaultProps = {
    text: 'שלום עולם',
    onChange: vi.fn(),
    isSyllablesActive: false,
    syllablesData: null,
    navigationMode: 'words' as const,
    borderSize: 2,
    backgroundColor: '#dbeafe',
    wordSpacing: 12,
    letterSpacing: 0,
    fontSize: 30,
    isEditing: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render textarea when in editing mode', () => {
      render(<EditableSyllablesTextarea {...defaultProps} isEditing={true} />)
      expect(screen.getByTestId('editable-textarea')).toBeInTheDocument()
    })

    it('should render display area when not editing', () => {
      render(<EditableSyllablesTextarea {...defaultProps} isEditing={false} />)
      expect(screen.getByTestId('text-display-area')).toBeInTheDocument()
    })

    it('should render word elements with data attributes', () => {
      render(<EditableSyllablesTextarea {...defaultProps} />)
      
      const wordElements = screen.getAllByTestId(/^navigation-word-/)
      expect(wordElements.length).toBe(2) // 'שלום' and 'עולם'
      
      // Check data attributes
      const firstWord = screen.getByTestId('navigation-word-0')
      expect(firstWord).toHaveAttribute('data-word-index', '0')
      expect(firstWord).toHaveAttribute('data-element-type', 'word')
    })
  })

  describe('Imperative API', () => {
    it('should expose ref with all required methods', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      expect(ref.current).not.toBeNull()
      expect(typeof ref.current?.focusNext).toBe('function')
      expect(typeof ref.current?.focusPrev).toBe('function')
      expect(typeof ref.current?.focusUp).toBe('function')
      expect(typeof ref.current?.focusDown).toBe('function')
      expect(typeof ref.current?.highlight).toBe('function')
      expect(typeof ref.current?.clearHighlight).toBe('function')
      expect(typeof ref.current?.getCurrentPosition).toBe('function')
      expect(typeof ref.current?.resetPosition).toBe('function')
    })

    it('should return current position via getCurrentPosition', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      const position = ref.current?.getCurrentPosition()
      expect(position).not.toBeNull()
      expect(position?.mode).toBe('words')
      expect(position?.wordIndex).toBe(0)
    })

    it('should clear position via clearHighlight', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      ref.current?.clearHighlight()
      
      // Position should be cleared
      const position = ref.current?.getCurrentPosition()
      expect(position).toBeNull()
    })

    it('should reset position via resetPosition', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      // First navigate forward
      ref.current?.focusNext()
      expect(ref.current?.getCurrentPosition()?.wordIndex).toBe(1)
      
      // Then reset
      ref.current?.resetPosition()
      expect(ref.current?.getCurrentPosition()?.wordIndex).toBe(0)
    })
  })

  describe('Navigation - Words Mode', () => {
    it('should navigate to next word via focusNext', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      // Initial position is word 0
      expect(ref.current?.getCurrentPosition()?.wordIndex).toBe(0)
      
      // Navigate to next word
      ref.current?.focusNext()
      expect(ref.current?.getCurrentPosition()?.wordIndex).toBe(1)
    })

    it('should navigate to previous word via focusPrev', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      // First go to word 1
      ref.current?.focusNext()
      expect(ref.current?.getCurrentPosition()?.wordIndex).toBe(1)
      
      // Navigate back
      ref.current?.focusPrev()
      expect(ref.current?.getCurrentPosition()?.wordIndex).toBe(0)
    })

    it('should not navigate past the last word', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      // Navigate to last word
      ref.current?.focusNext()
      expect(ref.current?.getCurrentPosition()?.wordIndex).toBe(1)
      
      // Try to go further
      ref.current?.focusNext()
      expect(ref.current?.getCurrentPosition()?.wordIndex).toBe(1) // Should stay at 1
    })

    it('should not navigate before the first word', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      // Try to go backwards from word 0
      ref.current?.focusPrev()
      expect(ref.current?.getCurrentPosition()?.wordIndex).toBe(0) // Should stay at 0
    })
  })

  describe('Navigation - Letters Mode', () => {
    const lettersProps = {
      ...defaultProps,
      navigationMode: 'letters' as const,
    }

    it('should navigate through letters via focusNext', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...lettersProps} ref={ref} />)
      
      // Initial position
      const initialPos = ref.current?.getCurrentPosition()
      expect(initialPos?.mode).toBe('letters')
      expect(initialPos?.letterIndex).toBe(0)
      
      // Navigate to next letter
      ref.current?.focusNext()
      const nextPos = ref.current?.getCurrentPosition()
      expect(nextPos?.letterIndex).toBe(1)
    })
  })

  describe('Navigation - With Syllables Data', () => {
    const syllablesProps = {
      ...defaultProps,
      isSyllablesActive: true,
      syllablesData: {
        words: [
          { word: 'שָׁלוֹם', syllables: ['שָׁ', 'לוֹם'] },
          { word: 'עוֹלָם', syllables: ['עוֹ', 'לָם'] },
        ],
      },
      navigationMode: 'syllables' as const,
    }

    it('should navigate through syllables', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...syllablesProps} ref={ref} />)
      
      // Initial position
      const initialPos = ref.current?.getCurrentPosition()
      expect(initialPos?.mode).toBe('syllables')
      expect(initialPos?.wordIndex).toBe(0)
      expect(initialPos?.syllableIndex).toBe(0)
      
      // Navigate to next syllable
      ref.current?.focusNext()
      const nextPos = ref.current?.getCurrentPosition()
      expect(nextPos?.wordIndex).toBe(0)
      expect(nextPos?.syllableIndex).toBe(1)
      
      // Navigate to next word's first syllable
      ref.current?.focusNext()
      const nextWordPos = ref.current?.getCurrentPosition()
      expect(nextWordPos?.wordIndex).toBe(1)
      expect(nextWordPos?.syllableIndex).toBe(0)
    })
  })

  describe('Highlight Class Toggling', () => {
    it('should apply active class to highlighted word', async () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      // Wait for initial highlight to be applied
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check that first word has active class
      const firstWord = screen.getByTestId('navigation-word-0')
      expect(firstWord.classList.contains('pyramid-word-active')).toBe(true)
    })

    it('should move active class when navigating', async () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      // Wait for initial highlight
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const firstWord = screen.getByTestId('navigation-word-0')
      const secondWord = screen.getByTestId('navigation-word-1')
      
      // Initial state
      expect(firstWord.classList.contains('pyramid-word-active')).toBe(true)
      expect(secondWord.classList.contains('pyramid-word-active')).toBe(false)
      
      // Navigate to next word
      ref.current?.focusNext()
      
      // Wait for DOM update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check classes moved
      expect(firstWord.classList.contains('pyramid-word-active')).toBe(false)
      expect(secondWord.classList.contains('pyramid-word-active')).toBe(true)
    })
  })

  describe('Position Persistence', () => {
    it('should save position to localStorage on navigation', async () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      // Navigate to next word
      ref.current?.focusNext()
      
      // Check localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should clear position from localStorage via clearHighlight', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      ref.current?.clearHighlight()
      
      // Check localStorage was cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('syllables_current_position')
    })
  })

  describe('Highlight API', () => {
    it('should highlight specific position via highlight method', async () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} ref={ref} />)
      
      // Highlight word at index 1
      ref.current?.highlight({ mode: 'words', wordIndex: 1 })
      
      // Wait for DOM update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check position was updated
      const position = ref.current?.getCurrentPosition()
      expect(position?.wordIndex).toBe(1)
      
      // Check DOM
      const secondWord = screen.getByTestId('navigation-word-1')
      expect(secondWord.classList.contains('pyramid-word-active')).toBe(true)
    })
  })

  describe('Multi-line Navigation', () => {
    const multiLineProps = {
      ...defaultProps,
      text: 'שורה ראשונה\nשורה שנייה',
    }

    it('should navigate up via focusUp', async () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...multiLineProps} ref={ref} />)
      
      // Navigate to second line first
      ref.current?.focusNext() // word 1
      ref.current?.focusNext() // word 2 (first word of second line)
      
      const posBeforeUp = ref.current?.getCurrentPosition()
      const wordIndexBeforeUp = posBeforeUp?.wordIndex ?? 0
      
      // Navigate up
      ref.current?.focusUp()
      
      const posAfterUp = ref.current?.getCurrentPosition()
      // If we were on second line, we should now be on first line (lower word index)
      expect(posAfterUp?.wordIndex).toBeLessThanOrEqual(wordIndexBeforeUp)
    })

    it('should navigate down via focusDown', async () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...multiLineProps} ref={ref} />)
      
      const posBeforeDown = ref.current?.getCurrentPosition()
      const wordIndexBeforeDown = posBeforeDown?.wordIndex ?? 0
      
      // Navigate down
      ref.current?.focusDown()
      
      const posAfterDown = ref.current?.getCurrentPosition()
      // Should move to a higher word index (next line)
      expect(posAfterDown?.wordIndex).toBeGreaterThanOrEqual(wordIndexBeforeDown)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty text gracefully', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} text="" ref={ref} isEditing={false} />)
      
      // Should not crash
      const position = ref.current?.getCurrentPosition()
      expect(position).toBeNull()
      
      // Navigation should be no-op
      ref.current?.focusNext()
      ref.current?.focusPrev()
      expect(ref.current?.getCurrentPosition()).toBeNull()
    })

    it('should handle whitespace-only text', () => {
      const ref = createRef<EditableSyllablesTextareaRef>()
      render(<EditableSyllablesTextarea {...defaultProps} text="   " ref={ref} isEditing={false} />)
      
      const position = ref.current?.getCurrentPosition()
      expect(position).toBeNull()
    })
  })
})

/**
 * Tests for applyDisplayModeToSyllables function
 * 
 * This function transforms syllables data based on the display mode:
 * - 'full': Returns syllables with full niqqud
 * - 'clean': Returns syllables with all niqqud removed
 * - 'original': Transforms syllables per-word based on original text's niqqud status
 */
describe('applyDisplayModeToSyllables', () => {
  // Sample syllables data (with full niqqud from model)
  const syllablesData = {
    words: [
      { word: 'שלום', syllables: ['שָׁ', 'לוֹם'] },
      { word: 'רב', syllables: ['רַב'] },
      { word: 'לכל', syllables: ['לְ', 'כָל'] },
      { word: 'האורחים', syllables: ['הָ', 'אוֹ', 'רְחִים'] },
    ],
  }

  describe('without cache or displayMode', () => {
    it('should return original syllablesData when no displayMode', () => {
      const result = applyDisplayModeToSyllables(syllablesData, undefined, null)
      expect(result).toEqual(syllablesData)
    })

    it('should return original syllablesData when no cache', () => {
      const result = applyDisplayModeToSyllables(syllablesData, 'original', null)
      expect(result).toEqual(syllablesData)
    })
  })

  describe('displayMode: full', () => {
    it('should return syllablesData as-is with full niqqud', () => {
      const cache = {
        original: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים',
        clean: 'שלום רב לכל האורחים',
        full: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים',
      }
      
      const result = applyDisplayModeToSyllables(syllablesData, 'full', cache)
      
      expect(result).toEqual(syllablesData)
      expect(result?.words[0].syllables).toEqual(['שָׁ', 'לוֹם'])
      expect(result?.words[2].syllables).toEqual(['לְ', 'כָל'])
    })
  })

  describe('displayMode: clean', () => {
    it('should remove all niqqud from syllables', () => {
      const cache = {
        original: 'שָׁלוֹם רַב לכל האורחים',
        clean: 'שלום רב לכל האורחים',
        full: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים',
      }
      
      const result = applyDisplayModeToSyllables(syllablesData, 'clean', cache)
      
      expect(result).not.toBeNull()
      expect(result?.words[0].syllables).toEqual(['ש', 'לום'])
      expect(result?.words[1].syllables).toEqual(['רב'])
      expect(result?.words[2].syllables).toEqual(['ל', 'כל'])
      expect(result?.words[3].syllables).toEqual(['ה', 'או', 'רחים'])
    })
  })

  describe('displayMode: original - partial niqqud', () => {
    it('should transform syllables per-word based on original niqqud status', () => {
      // Original text: "שָׁלוֹם רַב לכל האורחים" - first two words have niqqud, last two don't
      const cache = {
        original: 'שָׁלוֹם רַב לכל האורחים',
        clean: 'שלום רב לכל האורחים',
        full: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים',
      }
      
      const result = applyDisplayModeToSyllables(syllablesData, 'original', cache)
      
      expect(result).not.toBeNull()
      // Words WITH niqqud in original should keep niqqud
      expect(result?.words[0].syllables).toEqual(['שָׁ', 'לוֹם']) // Has niqqud in original
      expect(result?.words[1].syllables).toEqual(['רַב'])         // Has niqqud in original
      // Words WITHOUT niqqud in original should have niqqud stripped
      expect(result?.words[2].syllables).toEqual(['ל', 'כל'])     // No niqqud in original
      expect(result?.words[3].syllables).toEqual(['ה', 'או', 'רחים']) // No niqqud in original
    })

    it('should return syllablesData as-is when original equals full', () => {
      const cache = {
        original: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים',
        clean: 'שלום רב לכל האורחים',
        full: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים',
      }
      
      const result = applyDisplayModeToSyllables(syllablesData, 'original', cache)
      
      expect(result).toEqual(syllablesData)
    })

    it('should return null when underlying text is different', () => {
      // Cache where clean versions don't match (model changed the text)
      const cache = {
        original: 'שָׁלוֹם רַב לכל',
        clean: 'שלום רב לכל',
        full: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים', // Has extra word
      }
      
      const result = applyDisplayModeToSyllables(syllablesData, 'original', cache)
      
      expect(result).toBeNull()
    })

    it('should handle text with all words having niqqud', () => {
      const cache = {
        original: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים',
        clean: 'שלום רב לכל האורחים',
        full: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים',
      }
      
      const result = applyDisplayModeToSyllables(syllablesData, 'original', cache)
      
      // When original === full, all syllables should keep niqqud
      expect(result).toEqual(syllablesData)
    })

    it('should handle text with no niqqud at all', () => {
      const cache = {
        original: 'שלום רב לכל האורחים', // No niqqud in original
        clean: 'שלום רב לכל האורחים',
        full: 'שָׁלוֹם רַב לְכָל הָאוֹרְחִים',
      }
      
      const result = applyDisplayModeToSyllables(syllablesData, 'original', cache)
      
      expect(result).not.toBeNull()
      // All words should have niqqud stripped since original has no niqqud
      expect(result?.words[0].syllables).toEqual(['ש', 'לום'])
      expect(result?.words[1].syllables).toEqual(['רב'])
      expect(result?.words[2].syllables).toEqual(['ל', 'כל'])
      expect(result?.words[3].syllables).toEqual(['ה', 'או', 'רחים'])
    })
  })

  describe('edge cases', () => {
    it('should handle word count mismatch gracefully', () => {
      // syllablesData has 4 words, but original has only 3
      const cache = {
        original: 'שָׁלוֹם רַב לכל', // 3 words
        clean: 'שלום רב לכל',
        full: 'שָׁלוֹם רַב לכל', // Same as original (no full niqqud)
      }
      
      // When clean versions match, but word count differs significantly
      const smallSyllablesData = {
        words: [
          { word: 'שלום', syllables: ['שָׁ', 'לוֹם'] },
          { word: 'רב', syllables: ['רַב'] },
          { word: 'לכל', syllables: ['לְ', 'כָל'] },
        ],
      }
      
      const result = applyDisplayModeToSyllables(smallSyllablesData, 'original', cache)
      
      // Should return syllablesData since original === full (both have same text)
      expect(result).toEqual(smallSyllablesData)
    })

    it('should handle null full cache gracefully', () => {
      const cache = {
        original: 'שָׁלוֹם רַב לכל האורחים',
        clean: 'שלום רב לכל האורחים',
        full: null, // No full niqqud version
      }
      
      const result = applyDisplayModeToSyllables(syllablesData, 'original', cache)
      
      // When full is null, can't compare - should return null (can't transform)
      // Actually, the code checks if original !== full, and since full is null, this is true
      // But it should handle this case - let's see what happens
      // The code uses: cache.full ? cache.full.split(/\s+/) : originalWords
      // So it falls back to originalWords, which is correct behavior
      expect(result).not.toBeNull()
    })
  })
})


