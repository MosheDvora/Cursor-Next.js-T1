/**
 * Unit tests for morphology-service.ts
 * 
 * Tests the validation functions and prompt building for morphological analysis
 */

import { describe, it, expect } from 'vitest';
import {
  validateMorphologyWord,
  buildMorphologyPrompt,
  VALID_POS,
  VALID_TYPES,
  VALID_ROLES,
  VALID_BINYANIM,
  VALID_GIZROT,
  MorphologyWord,
} from '../morphology-service';

describe('morphology-service', () => {
  describe('validateMorphologyWord', () => {
    // Helper function to create a valid morphology word for testing
    const createValidWord = (overrides?: Partial<MorphologyWord>): MorphologyWord => ({
      word: "הָלַכְתִּי",
      pos: "verb",
      morphology_parts: [
        { text: "הָלַכְ", type: "stem", role: "stem" },
        { text: "תִּי", type: "suffix", role: "tense_person" },
      ],
      syllables: ["הָ", "לַכְ", "תִּי"],
      root: "ה.ל.כ",
      binyan: "paal",
      gizra: "shlemim",
      tense: "past",
      person: "first",
      gender: "common",
      number: "singular",
      construct_state: "absolute",
      definiteness: "indefinite",
      frequency: 5,
      level: "A1",
      related_words: ["הֲלִיכָה", "מַהֲלָךְ"],
      niqqud: [
        { mark: "ָ", name: "kamatz" },
        { mark: "ַ", name: "patach" },
      ],
      confidence: 0.95,
      ...overrides,
    });

    it('should validate a correct morphology word', () => {
      const word = createValidWord();
      const result = validateMorphologyWord(word);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when required fields are missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wordMissingFields = {} as any;
      const result = validateMorphologyWord(wordMissingFields);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('שדה חסר: word');
      expect(result.errors).toContain('שדה חסר: pos');
      expect(result.errors).toContain('שדה חסר: morphology_parts');
      expect(result.errors).toContain('שדה חסר: syllables');
      expect(result.errors).toContain('שדה חסר: confidence');
    });

    it('should fail validation for invalid POS', () => {
      const word = createValidWord({ pos: 'invalid_pos' });
      const result = validateMorphologyWord(word);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("POS לא תקין: 'invalid_pos'");
    });

    it('should validate all valid POS values', () => {
      VALID_POS.forEach(pos => {
        const word = createValidWord({ pos });
        const result = validateMorphologyWord(word);
        
        // POS should be valid (no POS-related errors)
        const posErrors = result.errors.filter(e => e.includes('POS'));
        expect(posErrors).toHaveLength(0);
      });
    });

    it('should fail validation for confidence out of range', () => {
      // Confidence too high
      const wordHigh = createValidWord({ confidence: 1.5 });
      const resultHigh = validateMorphologyWord(wordHigh);
      expect(resultHigh.valid).toBe(false);
      expect(resultHigh.errors.some(e => e.includes('confidence'))).toBe(true);

      // Confidence too low
      const wordLow = createValidWord({ confidence: -0.5 });
      const resultLow = validateMorphologyWord(wordLow);
      expect(resultLow.valid).toBe(false);
      expect(resultLow.errors.some(e => e.includes('confidence'))).toBe(true);
    });

    it('should fail validation for invalid morphology part type', () => {
      const word = createValidWord({
        morphology_parts: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { text: "הָלַכְ", type: "invalid_type" as any, role: "stem" },
          { text: "תִּי", type: "suffix", role: "tense_person" },
        ],
      });
      const result = validateMorphologyWord(word);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('type לא תקין'))).toBe(true);
    });

    it('should fail validation for invalid morphology part role', () => {
      const word = createValidWord({
        morphology_parts: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { text: "הָלַכְ", type: "stem", role: "invalid_role" as any },
          { text: "תִּי", type: "suffix", role: "tense_person" },
        ],
      });
      const result = validateMorphologyWord(word);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('role לא תקין'))).toBe(true);
    });

    it('should fail validation when morphology parts do not join to word', () => {
      const word = createValidWord({
        word: "הָלַכְתִּי",
        morphology_parts: [
          { text: "הָלַ", type: "stem", role: "stem" }, // Missing כְ
          { text: "תִּי", type: "suffix", role: "tense_person" },
        ],
      });
      const result = validateMorphologyWord(word);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('שלמות morphology'))).toBe(true);
    });

    it('should fail validation when syllables do not join to word', () => {
      const word = createValidWord({
        word: "הָלַכְתִּי",
        syllables: ["הָ", "לַכְ"], // Missing תִּי
      });
      const result = validateMorphologyWord(word);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('שלמות syllables'))).toBe(true);
    });

    it('should fail validation for invalid binyan', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const word = createValidWord({ binyan: 'invalid_binyan' as any });
      const result = validateMorphologyWord(word);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('בניין לא תקין'))).toBe(true);
    });

    it('should validate all valid binyanim', () => {
      VALID_BINYANIM.forEach(binyan => {
        const word = createValidWord({ binyan });
        const result = validateMorphologyWord(word);
        
        // Binyan should be valid (no binyan-related errors)
        const binyanErrors = result.errors.filter(e => e.includes('בניין'));
        expect(binyanErrors).toHaveLength(0);
      });
    });

    it('should fail validation for invalid gizra', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const word = createValidWord({ gizra: 'invalid_gizra' as any });
      const result = validateMorphologyWord(word);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('גזרה לא תקינה'))).toBe(true);
    });

    it('should validate all valid gizrot', () => {
      VALID_GIZROT.forEach(gizra => {
        const word = createValidWord({ gizra });
        const result = validateMorphologyWord(word);
        
        // Gizra should be valid (no gizra-related errors)
        const gizraErrors = result.errors.filter(e => e.includes('גזרה'));
        expect(gizraErrors).toHaveLength(0);
      });
    });

    it('should accept null for optional fields', () => {
      const word = createValidWord({
        root: null,
        binyan: null,
        gizra: null,
        tense: null,
        person: null,
        gender: null,
        number: null,
        related_words: null,
      });
      const result = validateMorphologyWord(word);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a noun word correctly', () => {
      const noun: MorphologyWord = {
        word: "הַיְלָדִים",
        pos: "noun",
        morphology_parts: [
          { text: "הַ", type: "prefix", role: "definite_article" },
          { text: "יְלָד", type: "stem", role: "stem" },
          { text: "ִים", type: "suffix", role: "plural" },
        ],
        syllables: ["הַיְ", "לָ", "דִים"],
        root: "י.ל.ד",
        binyan: null,
        gizra: null,
        tense: null,
        person: null,
        gender: "masculine",
        number: "plural",
        construct_state: "absolute",
        definiteness: "definite",
        frequency: 5,
        level: "A1",
        related_words: ["יֶלֶד", "יַלְדָּה"],
        niqqud: [
          { mark: "ַ", name: "patach" },
          { mark: "ְ", name: "shva" },
        ],
        confidence: 0.95,
      };
      
      const result = validateMorphologyWord(noun);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('buildMorphologyPrompt', () => {
    it('should replace {text} placeholder with provided text', () => {
      const text = "שָׁלוֹם";
      const prompt = buildMorphologyPrompt(text);
      
      expect(prompt).toContain(text);
      expect(prompt).not.toContain('{text}');
    });

    it('should use provided custom prompt template', () => {
      const text = "מִלָּה";
      const customPrompt = "Analyze this Hebrew word: {text}";
      const prompt = buildMorphologyPrompt(text, customPrompt);
      
      expect(prompt).toBe("Analyze this Hebrew word: מִלָּה");
    });

    it('should use default prompt when no template is provided', () => {
      const text = "טֶקְסְט";
      const prompt = buildMorphologyPrompt(text);
      
      // Default prompt contains specific morphology instructions
      expect(prompt).toContain('Hebrew Morphological');
      expect(prompt).toContain(text);
    });

    it('should handle Hebrew text with special characters', () => {
      const hebrewText = "הָאָדָם הוֹלֵךְ לַעֲבוֹדָה";
      const prompt = buildMorphologyPrompt(hebrewText);
      
      expect(prompt).toContain(hebrewText);
    });

    it('should handle empty text', () => {
      const prompt = buildMorphologyPrompt("");
      
      // The placeholder should be replaced with empty string
      expect(prompt).not.toContain('{text}');
    });
  });

  describe('VALID_* Sets', () => {
    it('should contain expected POS values', () => {
      expect(VALID_POS.has('noun')).toBe(true);
      expect(VALID_POS.has('verb')).toBe(true);
      expect(VALID_POS.has('adjective')).toBe(true);
      expect(VALID_POS.has('pronoun')).toBe(true);
      expect(VALID_POS.has('preposition')).toBe(true);
      expect(VALID_POS.has('adverb')).toBe(true);
      expect(VALID_POS.has('conjunction')).toBe(true);
      expect(VALID_POS.has('proper_noun')).toBe(true);
      expect(VALID_POS.has('particle')).toBe(true);
      expect(VALID_POS.has('numeral')).toBe(true);
      expect(VALID_POS.has('quantifier')).toBe(true);
      expect(VALID_POS.has('interrogative')).toBe(true);
    });

    it('should contain expected morphology types', () => {
      expect(VALID_TYPES.has('prefix')).toBe(true);
      expect(VALID_TYPES.has('stem')).toBe(true);
      expect(VALID_TYPES.has('suffix')).toBe(true);
    });

    it('should contain expected morphology roles', () => {
      expect(VALID_ROLES.has('conjunction')).toBe(true);
      expect(VALID_ROLES.has('definite_article')).toBe(true);
      expect(VALID_ROLES.has('preposition')).toBe(true);
      expect(VALID_ROLES.has('relativizer')).toBe(true);
      expect(VALID_ROLES.has('stem')).toBe(true);
      expect(VALID_ROLES.has('plural')).toBe(true);
      expect(VALID_ROLES.has('tense_person')).toBe(true);
    });

    it('should contain all 7 binyanim', () => {
      expect(VALID_BINYANIM.size).toBe(7);
      expect(VALID_BINYANIM.has('paal')).toBe(true);
      expect(VALID_BINYANIM.has('nifal')).toBe(true);
      expect(VALID_BINYANIM.has('piel')).toBe(true);
      expect(VALID_BINYANIM.has('pual')).toBe(true);
      expect(VALID_BINYANIM.has('hifil')).toBe(true);
      expect(VALID_BINYANIM.has('hufal')).toBe(true);
      expect(VALID_BINYANIM.has('hitpael')).toBe(true);
    });

    it('should contain expected gizrot', () => {
      expect(VALID_GIZROT.has('shlemim')).toBe(true);
      expect(VALID_GIZROT.has('ayin_vav')).toBe(true);
      expect(VALID_GIZROT.has('lamed_heh')).toBe(true);
      expect(VALID_GIZROT.has('peh_nun')).toBe(true);
    });
  });
});

