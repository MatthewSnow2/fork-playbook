/**
 * Schema validation for generated curriculum content.
 * Validates against existing chapters.js and fullChapters.js structures.
 */

export const VALID_EXERCISE_TYPES = [
  'assessment', 'writing', 'practical', 'roleplay', 'template',
  'analysis', 'design', 'timed', 'presentation', 'strategy'
];

const VALID_ICON_PREFIXES = ['fa-'];

const VALID_COLOR_PATTERNS = [
  /^from-\w+-\d+ to-\w+-\d+$/
];

/**
 * Validate complete curriculum output.
 *
 * @param {Object} curriculum - Generated curriculum object
 * @returns {Object} - Validation result { valid, errors, warnings }
 */
export function validateCurriculum(curriculum) {
  const errors = [];
  const warnings = [];

  // Check top-level structure
  if (!curriculum.chaptersData || !Array.isArray(curriculum.chaptersData)) {
    errors.push('Missing or invalid chaptersData array');
  }

  if (!curriculum.fullChapterContent || typeof curriculum.fullChapterContent !== 'object') {
    errors.push('Missing or invalid fullChapterContent object');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate each chapter
  for (const chapter of curriculum.chaptersData) {
    const chapterErrors = validateChapter(chapter);
    errors.push(...chapterErrors.errors.map(e => `Chapter ${chapter.id}: ${e}`));
    warnings.push(...chapterErrors.warnings.map(w => `Chapter ${chapter.id}: ${w}`));

    // Validate corresponding full content
    const fullContent = curriculum.fullChapterContent[chapter.id];
    if (!fullContent) {
      errors.push(`Chapter ${chapter.id}: Missing fullChapterContent entry`);
    } else {
      const contentErrors = validateFullContent(fullContent, chapter.sections);
      errors.push(...contentErrors.errors.map(e => `Chapter ${chapter.id}: ${e}`));
      warnings.push(...contentErrors.warnings.map(w => `Chapter ${chapter.id}: ${w}`));
    }
  }

  // Check ID sequence
  const ids = curriculum.chaptersData.map(c => c.id);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] !== i + 1) {
      errors.push(`Chapter IDs not sequential: expected ${i + 1}, got ${ids[i]}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a single chapter's metadata.
 */
function validateChapter(chapter) {
  const errors = [];
  const warnings = [];

  // Required fields
  const requiredFields = [
    'id', 'number', 'title', 'subtitle', 'icon', 'color',
    'duration', 'keyTakeaways', 'overview', 'sections',
    'exercises', 'quiz', 'reflection'
  ];

  for (const field of requiredFields) {
    if (chapter[field] === undefined || chapter[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Type validations
  if (typeof chapter.id !== 'number') {
    errors.push('id must be a number');
  }

  if (typeof chapter.number !== 'string') {
    errors.push('number must be a string');
  } else if (!/^\d{2}$/.test(chapter.number)) {
    warnings.push(`number should be zero-padded (e.g., "01"), got "${chapter.number}"`);
  }

  // Icon validation
  if (chapter.icon && !chapter.icon.startsWith('fa-')) {
    warnings.push(`icon should be FontAwesome class (fa-*), got "${chapter.icon}"`);
  }

  // Color validation
  if (chapter.color && !VALID_COLOR_PATTERNS.some(p => p.test(chapter.color))) {
    warnings.push(`color should be Tailwind gradient, got "${chapter.color}"`);
  }

  // Duration format
  if (chapter.duration && !/^\d+ min$/.test(chapter.duration)) {
    warnings.push(`duration should be "XX min" format, got "${chapter.duration}"`);
  }

  // KeyTakeaways
  if (Array.isArray(chapter.keyTakeaways)) {
    if (chapter.keyTakeaways.length < 3) {
      warnings.push('keyTakeaways should have at least 3 items');
    }
    if (chapter.keyTakeaways.length > 5) {
      warnings.push('keyTakeaways should have at most 5 items');
    }
  }

  // Sections
  if (Array.isArray(chapter.sections)) {
    if (chapter.sections.length < 4) {
      warnings.push('Should have at least 4 sections');
    }
    if (chapter.sections.length > 7) {
      warnings.push('Should have at most 7 sections');
    }
    for (let i = 0; i < chapter.sections.length; i++) {
      const section = chapter.sections[i];
      if (!section.title) {
        errors.push(`Section ${i + 1}: missing title`);
      }
    }
  }

  // Exercises
  if (Array.isArray(chapter.exercises)) {
    for (let i = 0; i < chapter.exercises.length; i++) {
      const exercise = chapter.exercises[i];
      if (!VALID_EXERCISE_TYPES.includes(exercise.type)) {
        warnings.push(`Exercise ${i + 1}: type "${exercise.type}" not in standard types`);
      }
      if (typeof exercise.points !== 'number' || exercise.points < 100 || exercise.points > 250) {
        warnings.push(`Exercise ${i + 1}: points should be 100-250, got ${exercise.points}`);
      }
    }
  }

  // Quiz
  if (Array.isArray(chapter.quiz)) {
    if (chapter.quiz.length < 3) {
      warnings.push('Quiz should have at least 3 questions');
    }
    if (chapter.quiz.length > 5) {
      warnings.push('Quiz should have at most 5 questions');
    }
    for (let i = 0; i < chapter.quiz.length; i++) {
      const q = chapter.quiz[i];
      if (!q.question) {
        errors.push(`Quiz ${i + 1}: missing question`);
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`Quiz ${i + 1}: must have exactly 4 options`);
      }
      if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
        errors.push(`Quiz ${i + 1}: correct must be 0-3`);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validate full chapter content.
 */
function validateFullContent(fullContent, sectionsMeta) {
  const errors = [];
  const warnings = [];

  if (!fullContent.sections || !Array.isArray(fullContent.sections)) {
    errors.push('fullChapterContent missing sections array');
    return { errors, warnings };
  }

  // Check section count matches
  if (fullContent.sections.length !== sectionsMeta.length) {
    errors.push(
      `Section count mismatch: metadata has ${sectionsMeta.length}, ` +
      `content has ${fullContent.sections.length}`
    );
  }

  // Validate each section
  for (let i = 0; i < fullContent.sections.length; i++) {
    const section = fullContent.sections[i];
    const meta = sectionsMeta[i];

    if (!section.title) {
      errors.push(`Section ${i + 1}: missing title`);
    }

    if (!section.content) {
      errors.push(`Section ${i + 1}: missing content`);
      continue;
    }

    // Check title matches metadata
    if (meta && section.title !== meta.title) {
      warnings.push(
        `Section ${i + 1}: title mismatch - ` +
        `metadata: "${meta.title}", content: "${section.title}"`
      );
    }

    // Check content length
    const wordCount = section.content.split(/\s+/).length;
    if (wordCount < 300) {
      warnings.push(`Section ${i + 1}: content seems short (${wordCount} words)`);
    }
    if (wordCount > 2000) {
      warnings.push(`Section ${i + 1}: content seems long (${wordCount} words)`);
    }
  }

  return { errors, warnings };
}

/**
 * Validate adaptive content structure.
 *
 * @param {Object} adaptiveContent - Adaptive content object
 * @returns {Object} - Validation result
 */
export function validateAdaptiveContent(adaptiveContent) {
  const errors = [];
  const warnings = [];
  const requiredStyles = ['default', 'visual', 'auditory', 'readWrite', 'kinesthetic'];

  for (const [chapterId, chapter] of Object.entries(adaptiveContent)) {
    for (const style of requiredStyles) {
      if (!chapter[style]) {
        if (style === 'default') {
          errors.push(`Chapter ${chapterId}: missing default content`);
        } else {
          warnings.push(`Chapter ${chapterId}: missing ${style} variant`);
        }
        continue;
      }

      if (!chapter[style].sections || !Array.isArray(chapter[style].sections)) {
        errors.push(`Chapter ${chapterId} ${style}: invalid sections structure`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export default {
  validateCurriculum,
  validateAdaptiveContent,
  VALID_EXERCISE_TYPES
};
