/**
 * VARK Helpers Tests
 *
 * Critical tests for VARK scoring algorithm and utilities.
 * These tests ensure correct learning style recommendations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateVARKScores,
  VARK_STORAGE_KEY,
  getStoredVARKPreference,
  saveVARKPreference,
  clearVARKPreference,
  hasCompletedVARK,
  getPrimaryStyle
} from '../src/utils/varkHelpers.js';

// =============================================================================
// calculateVARKScores Tests (CRITICAL - 95%+ coverage needed)
// =============================================================================

describe('calculateVARKScores', () => {
  describe('basic scoring', () => {
    it('should correctly count votes for each style', () => {
      const answers = {
        0: 'visual',
        1: 'visual',
        2: 'auditory',
        3: 'kinesthetic'
      };

      const result = calculateVARKScores(answers);

      expect(result.scores.visual).toBe(2);
      expect(result.scores.auditory).toBe(1);
      expect(result.scores.readWrite).toBe(0);
      expect(result.scores.kinesthetic).toBe(1);
    });

    it('should calculate correct percentages', () => {
      const answers = {
        0: 'visual',
        1: 'visual',
        2: 'auditory',
        3: 'auditory'
      };

      const result = calculateVARKScores(answers);

      expect(result.percentages.visual).toBe(50);
      expect(result.percentages.auditory).toBe(50);
      expect(result.percentages.readWrite).toBe(0);
      expect(result.percentages.kinesthetic).toBe(0);
    });

    it('should identify the correct primary style', () => {
      const answers = {
        0: 'kinesthetic',
        1: 'kinesthetic',
        2: 'kinesthetic',
        3: 'visual'
      };

      const result = calculateVARKScores(answers);

      expect(result.primaryStyle).toBe('kinesthetic');
    });
  });

  describe('edge cases', () => {
    it('should handle empty answers', () => {
      const answers = {};
      const result = calculateVARKScores(answers);

      expect(result.scores.visual).toBe(0);
      expect(result.scores.auditory).toBe(0);
      expect(result.scores.readWrite).toBe(0);
      expect(result.scores.kinesthetic).toBe(0);
      expect(result.percentages.visual).toBe(0);
      expect(result.percentages.auditory).toBe(0);
      expect(result.percentages.readWrite).toBe(0);
      expect(result.percentages.kinesthetic).toBe(0);
    });

    it('should handle all answers being the same style', () => {
      const answers = {
        0: 'readWrite',
        1: 'readWrite',
        2: 'readWrite',
        3: 'readWrite',
        4: 'readWrite'
      };

      const result = calculateVARKScores(answers);

      expect(result.scores.readWrite).toBe(5);
      expect(result.percentages.readWrite).toBe(100);
      expect(result.primaryStyle).toBe('readWrite');
    });

    it('should handle tie between styles (returns first alphabetically)', () => {
      // When there's a tie, the algorithm keeps the first winner found
      // Starting comparison from 'visual', so with equal scores...
      const answers = {
        0: 'visual',
        1: 'auditory'
      };

      const result = calculateVARKScores(answers);

      // Both have score of 1, visual should be selected (first checked)
      expect(result.scores.visual).toBe(1);
      expect(result.scores.auditory).toBe(1);
      // The reduce starts with 'visual' so it stays with visual on tie
      expect(result.primaryStyle).toBe('visual');
    });

    it('should ignore invalid style names', () => {
      const answers = {
        0: 'visual',
        1: 'invalid_style',
        2: 'another_invalid',
        3: 'auditory'
      };

      const result = calculateVARKScores(answers);

      // Only valid styles should be counted
      expect(result.scores.visual).toBe(1);
      expect(result.scores.auditory).toBe(1);
      // Total is 2 (invalid ones ignored)
      expect(result.percentages.visual).toBe(50);
      expect(result.percentages.auditory).toBe(50);
    });

    it('should round percentages correctly', () => {
      // 1/3 = 33.33...%, should round to 33%
      const answers = {
        0: 'visual',
        1: 'auditory',
        2: 'kinesthetic'
      };

      const result = calculateVARKScores(answers);

      expect(result.percentages.visual).toBe(33);
      expect(result.percentages.auditory).toBe(33);
      expect(result.percentages.kinesthetic).toBe(33);
    });

    it('should handle 12-question assessment (standard VARK)', () => {
      // Simulate a full 12-question assessment
      const answers = {
        0: 'visual', 1: 'visual', 2: 'visual',      // 3 visual
        3: 'auditory', 4: 'auditory',                // 2 auditory
        5: 'readWrite', 6: 'readWrite', 7: 'readWrite', 8: 'readWrite', // 4 readWrite
        9: 'kinesthetic', 10: 'kinesthetic', 11: 'kinesthetic' // 3 kinesthetic
      };

      const result = calculateVARKScores(answers);

      expect(result.scores.visual).toBe(3);
      expect(result.scores.auditory).toBe(2);
      expect(result.scores.readWrite).toBe(4);
      expect(result.scores.kinesthetic).toBe(3);
      expect(result.primaryStyle).toBe('readWrite');
      expect(result.percentages.readWrite).toBe(33); // 4/12 = 33%
    });
  });

  describe('return structure', () => {
    it('should return correct structure with all required fields', () => {
      const answers = { 0: 'visual' };
      const result = calculateVARKScores(answers);

      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('percentages');
      expect(result).toHaveProperty('primaryStyle');

      expect(result.scores).toHaveProperty('visual');
      expect(result.scores).toHaveProperty('auditory');
      expect(result.scores).toHaveProperty('readWrite');
      expect(result.scores).toHaveProperty('kinesthetic');

      expect(result.percentages).toHaveProperty('visual');
      expect(result.percentages).toHaveProperty('auditory');
      expect(result.percentages).toHaveProperty('readWrite');
      expect(result.percentages).toHaveProperty('kinesthetic');
    });

    it('should return numbers for all scores', () => {
      const answers = { 0: 'visual' };
      const result = calculateVARKScores(answers);

      Object.values(result.scores).forEach(score => {
        expect(typeof score).toBe('number');
      });
    });

    it('should return numbers for all percentages', () => {
      const answers = { 0: 'visual' };
      const result = calculateVARKScores(answers);

      Object.values(result.percentages).forEach(percentage => {
        expect(typeof percentage).toBe('number');
      });
    });
  });
});

// =============================================================================
// localStorage Utilities Tests
// =============================================================================

describe('localStorage utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('VARK_STORAGE_KEY', () => {
    it('should have correct storage key', () => {
      expect(VARK_STORAGE_KEY).toBe('ai_playbook_vark_preference');
    });
  });

  describe('saveVARKPreference', () => {
    it('should save preference to localStorage', () => {
      const preference = {
        primaryStyle: 'visual',
        scores: { visual: 5, auditory: 3, readWrite: 2, kinesthetic: 2 },
        assessmentCompleted: true
      };

      saveVARKPreference(preference);

      const stored = localStorage.getItem(VARK_STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored)).toEqual(preference);
    });
  });

  describe('getStoredVARKPreference', () => {
    it('should return null if no preference stored', () => {
      const result = getStoredVARKPreference();
      expect(result).toBeNull();
    });

    it('should return stored preference', () => {
      const preference = { primaryStyle: 'auditory' };
      localStorage.setItem(VARK_STORAGE_KEY, JSON.stringify(preference));

      const result = getStoredVARKPreference();
      expect(result).toEqual(preference);
    });

    it('should return null if stored JSON is invalid', () => {
      localStorage.setItem(VARK_STORAGE_KEY, 'invalid json {{{');

      const result = getStoredVARKPreference();
      expect(result).toBeNull();
    });
  });

  describe('clearVARKPreference', () => {
    it('should remove preference from localStorage', () => {
      localStorage.setItem(VARK_STORAGE_KEY, JSON.stringify({ test: true }));

      clearVARKPreference();

      expect(localStorage.getItem(VARK_STORAGE_KEY)).toBeNull();
    });
  });

  describe('hasCompletedVARK', () => {
    it('should return false if no preference stored', () => {
      expect(hasCompletedVARK()).toBe(false);
    });

    it('should return false if assessmentCompleted is false', () => {
      localStorage.setItem(VARK_STORAGE_KEY, JSON.stringify({
        assessmentCompleted: false
      }));

      expect(hasCompletedVARK()).toBe(false);
    });

    it('should return true if assessmentCompleted is true', () => {
      localStorage.setItem(VARK_STORAGE_KEY, JSON.stringify({
        assessmentCompleted: true
      }));

      expect(hasCompletedVARK()).toBe(true);
    });
  });

  describe('getPrimaryStyle', () => {
    it('should return null if no preference stored', () => {
      expect(getPrimaryStyle()).toBeNull();
    });

    it('should return primaryStyle from stored preference', () => {
      localStorage.setItem(VARK_STORAGE_KEY, JSON.stringify({
        primaryStyle: 'kinesthetic'
      }));

      expect(getPrimaryStyle()).toBe('kinesthetic');
    });

    it('should return null if primaryStyle not set', () => {
      localStorage.setItem(VARK_STORAGE_KEY, JSON.stringify({
        someOtherField: 'value'
      }));

      expect(getPrimaryStyle()).toBeNull();
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('VARK workflow integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should complete full assessment workflow', () => {
    // Step 1: User answers questions
    const answers = {
      0: 'visual',
      1: 'visual',
      2: 'auditory',
      3: 'readWrite',
      4: 'readWrite',
      5: 'readWrite',
      6: 'kinesthetic',
      7: 'kinesthetic',
      8: 'visual',
      9: 'auditory',
      10: 'readWrite',
      11: 'kinesthetic'
    };

    // Step 2: Calculate scores
    const { scores, percentages, primaryStyle } = calculateVARKScores(answers);

    // Step 3: Save preference
    const preference = {
      primaryStyle,
      scores,
      percentages,
      assessmentCompleted: true,
      completedAt: new Date().toISOString()
    };
    saveVARKPreference(preference);

    // Step 4: Verify saved correctly
    expect(hasCompletedVARK()).toBe(true);
    expect(getPrimaryStyle()).toBe('readWrite');

    // Step 5: Retrieve full preference
    const retrieved = getStoredVARKPreference();
    expect(retrieved.scores.visual).toBe(3);
    expect(retrieved.scores.auditory).toBe(2);
    expect(retrieved.scores.readWrite).toBe(4);
    expect(retrieved.scores.kinesthetic).toBe(3);
  });
});
