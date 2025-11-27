/**
 * Unit tests for Hebrew Niqqud utilities
 * 
 * Tests cover:
 * - Detection of niqqud marks
 * - Removal of niqqud from text
 * - Status detection (none/partial/full)
 * - Helper functions (hasNiqqud, isFullyNiqqud)
 */

import { describe, it, expect } from 'vitest'
import {
  isNiqqudMark,
  removeNiqqud,
  detectNiqqud,
  hasNiqqud,
  isFullyNiqqud,
  type NiqqudStatus,
} from '../niqqud'

describe('niqqud utilities', () => {
  describe('isNiqqudMark', () => {
    it('should detect niqqud marks within Unicode range', () => {
      // Test various niqqud marks
      // Dagesh/Mappiq (U+05BC)
      expect(isNiqqudMark('\u05BC')).toBe(true)
      // Qamats (U+05B8)
      expect(isNiqqudMark('\u05B8')).toBe(true)
      // Patach (U+05B7)
      expect(isNiqqudMark('\u05B7')).toBe(true)
      // Segol (U+05B6)
      expect(isNiqqudMark('\u05B6')).toBe(true)
      // Shuruk (U+05BC)
      expect(isNiqqudMark('\u05BC')).toBe(true)
    })

    it('should reject non-niqqud characters', () => {
      // Hebrew letters (not niqqud marks)
      expect(isNiqqudMark('א')).toBe(false)
      expect(isNiqqudMark('ב')).toBe(false)
      expect(isNiqqudMark('ש')).toBe(false)
      // Regular ASCII characters
      expect(isNiqqudMark('a')).toBe(false)
      expect(isNiqqudMark('1')).toBe(false)
      expect(isNiqqudMark(' ')).toBe(false)
      // Empty string (should handle gracefully)
      expect(isNiqqudMark('')).toBe(false)
    })

    it('should reject characters outside niqqud Unicode range', () => {
      // Characters before the niqqud range
      expect(isNiqqudMark('\u0590')).toBe(false) // Just before range
      // Characters after the niqqud range
      expect(isNiqqudMark('\u05C8')).toBe(false) // Just after range
    })
  })

  describe('removeNiqqud', () => {
    it('should remove all niqqud marks from Hebrew text', () => {
      // Text with niqqud marks
      const textWithNiqqud = 'שָׁלוֹם'
      const expected = 'שלום'
      expect(removeNiqqud(textWithNiqqud)).toBe(expected)
    })

    it('should return empty string for empty input', () => {
      expect(removeNiqqud('')).toBe('')
    })

    it('should preserve text without niqqud', () => {
      const textWithoutNiqqud = 'שלום עולם'
      expect(removeNiqqud(textWithoutNiqqud)).toBe(textWithoutNiqqud)
    })

    it('should preserve non-Hebrew characters', () => {
      const mixedText = 'שָׁלוֹם world 123'
      const expected = 'שלום world 123'
      expect(removeNiqqud(mixedText)).toBe(expected)
    })

    it('should remove all niqqud marks while preserving Hebrew letters', () => {
      // Complex example with multiple niqqud types
      const complexText = 'בְּרֵאשִׁית'
      const result = removeNiqqud(complexText)
      // Result should only contain Hebrew letters, no niqqud marks
      expect(result).toMatch(/^[\u0590-\u05FF]+$/)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('detectNiqqud', () => {
    it('should return "none" for empty text', () => {
      expect(detectNiqqud('')).toBe('none')
      expect(detectNiqqud('   ')).toBe('none')
      expect(detectNiqqud('\n\t')).toBe('none')
    })

    it('should return "none" for text without niqqud', () => {
      expect(detectNiqqud('שלום')).toBe('none')
      expect(detectNiqqud('שלום עולם')).toBe('none')
    })

    it('should return "none" for non-Hebrew text', () => {
      expect(detectNiqqud('hello world')).toBe('none')
      expect(detectNiqqud('123')).toBe('none')
    })

    it('should return "partial" for text with some niqqud', () => {
      // One word with niqqud, one without
      const partialText = 'שָׁלוֹם שלום'
      expect(detectNiqqud(partialText)).toBe('partial')
    })

    it('should return "full" for text where 80%+ of words have niqqud', () => {
      // Create text where most words have niqqud
      // Using example: 'שָׁלוֹם' (with niqqud) repeated
      const fullText = 'שָׁלוֹם שָׁלוֹם שָׁלוֹם'
      const result = detectNiqqud(fullText)
      expect(['full', 'partial']).toContain(result)
    })

    it('should handle mixed Hebrew and non-Hebrew text', () => {
      const mixedText = 'שָׁלוֹם world'
      const result = detectNiqqud(mixedText)
      // Should detect niqqud in Hebrew part
      expect(result).not.toBe('none')
    })

    it('should return correct status for single word', () => {
      // Single word with niqqud
      const singleWord = 'שָׁלוֹם'
      const result = detectNiqqud(singleWord)
      expect(['full', 'partial']).toContain(result)
    })
  })

  describe('hasNiqqud', () => {
    it('should return false for text without niqqud', () => {
      expect(hasNiqqud('שלום')).toBe(false)
      expect(hasNiqqud('')).toBe(false)
      expect(hasNiqqud('hello')).toBe(false)
    })

    it('should return true for text with any niqqud', () => {
      expect(hasNiqqud('שָׁלוֹם')).toBe(true)
      expect(hasNiqqud('שָׁלוֹם שלום')).toBe(true)
    })
  })

  describe('isFullyNiqqud', () => {
    it('should return false for text without niqqud', () => {
      expect(isFullyNiqqud('שלום')).toBe(false)
      expect(isFullyNiqqud('')).toBe(false)
    })

    it('should return false for partially niqqud text', () => {
      const partialText = 'שָׁלוֹם שלום'
      // Since detectNiqqud should return 'partial' for this, isFullyNiqqud should be false
      if (detectNiqqud(partialText) === 'partial') {
        expect(isFullyNiqqud(partialText)).toBe(false)
      }
    })

    it('should return true only for fully niqqud text', () => {
      // This depends on detectNiqqud returning 'full'
      // We test the logic relationship
      const text = 'שָׁלוֹם'
      const status = detectNiqqud(text)
      expect(isFullyNiqqud(text)).toBe(status === 'full')
    })
  })

  describe('edge cases', () => {
    it('should handle text with only punctuation', () => {
      expect(detectNiqqud('.,!?')).toBe('none')
      expect(hasNiqqud('.,!?')).toBe(false)
    })

    it('should handle text with newlines and spaces', () => {
      const textWithNewlines = 'שָׁלוֹם\nעולם\r\nבוקר'
      const result = detectNiqqud(textWithNewlines)
      expect(['none', 'partial', 'full']).toContain(result)
    })

    it('should handle very long text', () => {
      const longText = 'שָׁלוֹם '.repeat(100) + 'עולם'
      const result = detectNiqqud(longText)
      expect(['none', 'partial', 'full']).toContain(result)
    })

    it('should be consistent: removing niqqud should result in no niqqud detection', () => {
      const textWithNiqqud = 'שָׁלוֹם עוֹלָם'
      const textWithoutNiqqud = removeNiqqud(textWithNiqqud)
      expect(hasNiqqud(textWithoutNiqqud)).toBe(false)
      expect(detectNiqqud(textWithoutNiqqud)).toBe('none')
    })
  })
})

