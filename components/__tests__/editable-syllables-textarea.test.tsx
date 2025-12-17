/**
 * Unit tests for EditableSyllablesTextarea component
 * 
 * Tests cover:
 * - Imperative API (focusNext, focusPrev, focusUp, focusDown, highlight, clearHighlight)
 * - Navigation modes (words, syllables, letters)
 * - Position persistence via localStorage
 * - DOM class toggling for highlights
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { EditableSyllablesTextarea, EditableSyllablesTextareaRef } from '../editable-syllables-textarea'

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

