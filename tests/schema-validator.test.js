/**
 * Schema Validator Tests
 *
 * Critical tests for curriculum validation logic.
 * These tests ensure AI-generated content meets the required schema.
 */

import { describe, it, expect } from 'vitest';
import {
  validateCurriculum,
  validateAdaptiveContent,
  VALID_EXERCISE_TYPES
} from '../cli/lib/validators/schema-validator.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const createValidChapter = (id = 1) => ({
  id,
  number: id.toString().padStart(2, '0'),
  title: `Chapter ${id} Title`,
  subtitle: `Chapter ${id} Subtitle`,
  icon: 'fa-book',
  color: 'from-blue-500 to-blue-700',
  duration: '30 min',
  keyTakeaways: [
    'Takeaway 1',
    'Takeaway 2',
    'Takeaway 3'
  ],
  overview: 'This is the chapter overview with enough content to be meaningful.',
  sections: [
    { title: 'Section 1' },
    { title: 'Section 2' },
    { title: 'Section 3' },
    { title: 'Section 4' }
  ],
  exercises: [
    {
      title: 'Exercise 1',
      description: 'Exercise description',
      type: 'writing',
      points: 150
    }
  ],
  quiz: [
    {
      question: 'What is the answer?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: 0,
      explanation: 'Explanation here'
    },
    {
      question: 'Another question?',
      options: ['A', 'B', 'C', 'D'],
      correct: 1,
      explanation: 'Because B'
    },
    {
      question: 'Third question?',
      options: ['1', '2', '3', '4'],
      correct: 2,
      explanation: 'The third option'
    }
  ],
  reflection: 'Chapter reflection prompt'
});

const createValidFullContent = (sectionCount = 4) => ({
  sections: Array.from({ length: sectionCount }, (_, i) => ({
    title: `Section ${i + 1}`,
    content: 'A'.repeat(1500) // ~300+ words worth of content
  }))
});

const createValidCurriculum = (chapterCount = 1) => ({
  chaptersData: Array.from({ length: chapterCount }, (_, i) =>
    createValidChapter(i + 1)
  ),
  fullChapterContent: Object.fromEntries(
    Array.from({ length: chapterCount }, (_, i) => [
      i + 1,
      createValidFullContent(4)
    ])
  )
});

// =============================================================================
// validateCurriculum Tests
// =============================================================================

describe('validateCurriculum', () => {
  describe('valid curriculum', () => {
    it('should pass validation for a valid single-chapter curriculum', () => {
      const curriculum = createValidCurriculum(1);
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation for a multi-chapter curriculum', () => {
      const curriculum = createValidCurriculum(5);
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('top-level structure', () => {
    it('should fail if chaptersData is missing', () => {
      const curriculum = {
        fullChapterContent: { 1: createValidFullContent() }
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid chaptersData array');
    });

    it('should fail if fullChapterContent is missing', () => {
      const curriculum = {
        chaptersData: [createValidChapter(1)]
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid fullChapterContent object');
    });

    it('should fail if chaptersData is not an array', () => {
      const curriculum = {
        chaptersData: {},
        fullChapterContent: { 1: createValidFullContent() }
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid chaptersData array');
    });
  });

  describe('chapter ID sequence', () => {
    it('should fail if chapter IDs are not sequential', () => {
      const curriculum = {
        chaptersData: [
          createValidChapter(1),
          createValidChapter(3) // Missing 2
        ],
        fullChapterContent: {
          1: createValidFullContent(),
          3: createValidFullContent()
        }
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not sequential'))).toBe(true);
    });
  });

  describe('chapter validation', () => {
    it('should fail if required fields are missing', () => {
      const chapter = createValidChapter(1);
      delete chapter.title;
      delete chapter.overview;

      const curriculum = {
        chaptersData: [chapter],
        fullChapterContent: { 1: createValidFullContent() }
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing required field: title'))).toBe(true);
      expect(result.errors.some(e => e.includes('Missing required field: overview'))).toBe(true);
    });

    it('should fail if id is not a number', () => {
      const chapter = createValidChapter(1);
      chapter.id = '1'; // String instead of number

      const curriculum = {
        chaptersData: [chapter],
        fullChapterContent: { 1: createValidFullContent() }
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id must be a number'))).toBe(true);
    });
  });

  describe('quiz validation', () => {
    it('should fail if quiz question has wrong number of options', () => {
      const chapter = createValidChapter(1);
      chapter.quiz[0].options = ['A', 'B', 'C']; // Only 3 options

      const curriculum = {
        chaptersData: [chapter],
        fullChapterContent: { 1: createValidFullContent() }
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must have exactly 4 options'))).toBe(true);
    });

    it('should fail if quiz correct answer is out of range', () => {
      const chapter = createValidChapter(1);
      chapter.quiz[0].correct = 5; // Out of range (should be 0-3)

      const curriculum = {
        chaptersData: [chapter],
        fullChapterContent: { 1: createValidFullContent() }
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('correct must be 0-3'))).toBe(true);
    });
  });

  describe('fullChapterContent validation', () => {
    it('should fail if fullChapterContent entry is missing', () => {
      const curriculum = {
        chaptersData: [createValidChapter(1)],
        fullChapterContent: {} // No entry for chapter 1
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing fullChapterContent entry'))).toBe(true);
    });

    it('should fail if section count mismatches', () => {
      const chapter = createValidChapter(1);
      chapter.sections = [{ title: 'Section 1' }, { title: 'Section 2' }]; // 2 sections

      const curriculum = {
        chaptersData: [chapter],
        fullChapterContent: { 1: createValidFullContent(4) } // 4 sections
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Section count mismatch'))).toBe(true);
    });

    it('should fail if section content is missing', () => {
      const fullContent = createValidFullContent(4);
      fullContent.sections[0].content = null;

      const curriculum = {
        chaptersData: [createValidChapter(1)],
        fullChapterContent: { 1: fullContent }
      };
      const result = validateCurriculum(curriculum);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing content'))).toBe(true);
    });
  });

  describe('warnings', () => {
    it('should warn if chapter number is not zero-padded', () => {
      const chapter = createValidChapter(1);
      chapter.number = '1'; // Not zero-padded

      const curriculum = {
        chaptersData: [chapter],
        fullChapterContent: { 1: createValidFullContent() }
      };
      const result = validateCurriculum(curriculum);

      expect(result.warnings.some(w => w.includes('zero-padded'))).toBe(true);
    });

    it('should warn if exercise type is non-standard', () => {
      const chapter = createValidChapter(1);
      chapter.exercises[0].type = 'custom-type';

      const curriculum = {
        chaptersData: [chapter],
        fullChapterContent: { 1: createValidFullContent() }
      };
      const result = validateCurriculum(curriculum);

      expect(result.warnings.some(w => w.includes('not in standard types'))).toBe(true);
    });

    it('should warn if content is too short', () => {
      const fullContent = createValidFullContent(4);
      fullContent.sections[0].content = 'Short content'; // Too short

      const curriculum = {
        chaptersData: [createValidChapter(1)],
        fullChapterContent: { 1: fullContent }
      };
      const result = validateCurriculum(curriculum);

      expect(result.warnings.some(w => w.includes('seems short'))).toBe(true);
    });
  });
});

// =============================================================================
// validateAdaptiveContent Tests
// =============================================================================

describe('validateAdaptiveContent', () => {
  const createValidAdaptiveContent = () => ({
    1: {
      default: { sections: [{ title: 'Section 1', content: 'Default content' }] },
      visual: { sections: [{ title: 'Section 1', content: 'Visual content' }] },
      auditory: { sections: [{ title: 'Section 1', content: 'Auditory content' }] },
      readWrite: { sections: [{ title: 'Section 1', content: 'Read/Write content' }] },
      kinesthetic: { sections: [{ title: 'Section 1', content: 'Kinesthetic content' }] }
    }
  });

  it('should pass validation for valid adaptive content', () => {
    const content = createValidAdaptiveContent();
    const result = validateAdaptiveContent(content);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if default content is missing', () => {
    const content = createValidAdaptiveContent();
    delete content[1].default;
    const result = validateAdaptiveContent(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('missing default content'))).toBe(true);
  });

  it('should warn if a style variant is missing', () => {
    const content = createValidAdaptiveContent();
    delete content[1].visual;
    const result = validateAdaptiveContent(content);

    // Missing variant is a warning, not an error
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('missing visual variant'))).toBe(true);
  });

  it('should fail if sections structure is invalid', () => {
    const content = createValidAdaptiveContent();
    content[1].default.sections = 'not an array';
    const result = validateAdaptiveContent(content);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('invalid sections structure'))).toBe(true);
  });
});

// =============================================================================
// VALID_EXERCISE_TYPES Tests
// =============================================================================

describe('VALID_EXERCISE_TYPES', () => {
  it('should contain expected exercise types', () => {
    expect(VALID_EXERCISE_TYPES).toContain('writing');
    expect(VALID_EXERCISE_TYPES).toContain('assessment');
    expect(VALID_EXERCISE_TYPES).toContain('practical');
    expect(VALID_EXERCISE_TYPES).toContain('roleplay');
  });

  it('should have 10 exercise types', () => {
    expect(VALID_EXERCISE_TYPES).toHaveLength(10);
  });
});
