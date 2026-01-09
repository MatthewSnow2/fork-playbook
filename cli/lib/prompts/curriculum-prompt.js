/**
 * Prompt templates for curriculum generation.
 * Based on docs/CURRICULUM-STRUCTURE.md specification.
 *
 * Uses two-phase generation:
 * 1. Outline phase: Generate chapter metadata (titles, sections, quizzes)
 * 2. Content phase: Generate full content for each chapter
 */

export const SYSTEM_PROMPT = `You are an expert curriculum designer specializing in creating engaging, practical learning content. You transform any topic into a structured curriculum following a specific JSON schema.

Your content must:
1. Be practical and actionable, not theoretical
2. Include real-world examples and case studies
3. Progress from fundamentals to advanced concepts
4. Use markdown formatting compatible with the renderer:
   - Headers: ### for h3, ## for h2
   - Bold: **text**
   - Lists: - item (with space after dash)
   - Tables: | Header 1 | Header 2 |
   - Blockquotes: *"quoted text"
   - Emoji callouts: 🎓 💡 ⚠️ ✅ 🔧 💎 📋

Output valid JSON only - no markdown code fences, no explanation text.`;

export const OUTLINE_SYSTEM_PROMPT = `You are an expert curriculum designer. Generate a curriculum outline with chapter metadata. Output valid JSON only.`;

export const CONTENT_SYSTEM_PROMPT = `You are an expert educational content writer. Generate detailed section content for a chapter. Each section should be 200-400 words with practical examples. Use markdown formatting. Output valid JSON only.`;

/**
 * Build outline-only prompt for Phase 1 generation.
 */
export function buildOutlinePrompt({
  topic,
  chapters = 10,
  difficulty = 'intermediate',
  duration = 45,
  audience = 'Professionals building practical skills'
}) {
  return `Create a curriculum OUTLINE for: "${topic}"

Target Audience: ${audience}
Number of Chapters: ${chapters}
Difficulty: ${difficulty}
Duration: ${duration} min/chapter

Generate chapter metadata ONLY (no full content). For each chapter provide:
- id, number (zero-padded), title, subtitle
- icon (FontAwesome), color (Tailwind gradient)
- duration, keyTakeaways (4 items), overview
- sections (4-5 objects with title and brief 1-sentence content description)
- exercises (1-2 with type, title, description, points 100-200)
- quiz (3-4 questions with question, 4 options, correct 0-3, explanation)
- reflection

ICONS: fa-compass, fa-tools, fa-comments, fa-chess, fa-microscope, fa-cogs, fa-check-circle, fa-brain, fa-flag-checkered
COLORS: from-navy-700 to-navy-500, from-blue-600 to-blue-400, from-green-600 to-green-400, from-purple-600 to-purple-400, from-teal-600 to-teal-400
EXERCISE TYPES: practical, assessment, writing, analysis, design

JSON structure:
{
  "chaptersData": [
    {
      "id": 1, "number": "01", "title": "...", "subtitle": "...",
      "icon": "fa-compass", "color": "from-navy-700 to-navy-500",
      "duration": "${duration} min",
      "keyTakeaways": ["...", "...", "...", "..."],
      "overview": "...",
      "sections": [{"title": "...", "content": "Brief description"}],
      "exercises": [{"type": "practical", "title": "...", "description": "...", "points": 100}],
      "quiz": [{"question": "?", "options": ["A","B","C","D"], "correct": 0, "explanation": "..."}],
      "reflection": "?"
    }
  ]
}`;
}

/**
 * Build content prompt for Phase 2 generation (per chapter).
 */
export function buildContentPrompt(chapterMetadata) {
  const sectionTitles = chapterMetadata.sections.map(s => s.title).join(', ');

  return `Generate full content for Chapter ${chapterMetadata.id}: "${chapterMetadata.title}"

Chapter overview: ${chapterMetadata.overview}

Generate detailed content for these ${chapterMetadata.sections.length} sections:
${chapterMetadata.sections.map((s, i) => `${i + 1}. "${s.title}" - ${s.content}`).join('\n')}

REQUIREMENTS:
- Each section: 200-400 words (concise but complete)
- Use markdown: ###, **, *, -, tables, emoji callouts (🎓 💡 ⚠️ ✅ 🔧 💎)
- Include practical examples
- Build on previous sections

JSON structure:
{
  "sections": [
    {"title": "Exact title from above", "content": "Full markdown content..."},
    ...
  ]
}`;
}

/**
 * Build user prompt for curriculum generation.
 *
 * @param {Object} options - Generation options
 * @param {string} options.topic - Topic to generate curriculum for
 * @param {number} options.chapters - Number of chapters to generate
 * @param {string} options.difficulty - beginner, intermediate, or advanced
 * @param {number} options.duration - Average chapter duration in minutes
 * @param {string} options.audience - Target audience description
 * @returns {string} - Formatted user prompt
 */
export function buildUserPrompt({
  topic,
  chapters = 10,
  difficulty = 'intermediate',
  duration = 45,
  audience = 'Professionals building practical skills'
}) {
  return `Create a comprehensive curriculum for: "${topic}"

Target Audience: ${audience}
Number of Chapters: ${chapters}
Difficulty: ${difficulty}
Average Chapter Duration: ${duration} minutes

For EACH chapter, provide:

1. **chaptersData entry** with all required fields:
   - id (number, sequential starting from 1)
   - number (string, zero-padded: "01", "02")
   - title (string, action-oriented)
   - subtitle (string, memorable tagline)
   - icon (string, FontAwesome class like "fa-compass")
   - color (string, Tailwind gradient like "from-navy-700 to-navy-500")
   - duration (string, format: "45 min")
   - keyTakeaways (array of 4-5 strings)
   - overview (string, 1-2 sentence summary)
   - sections (array of 4-7 objects with title and brief content description)
   - exercises (array of 1-3 objects with type, title, description, points)
   - quiz (array of 3-5 objects with question, options [4 choices], correct [0-3], explanation)
   - reflection (string, open-ended question)

2. **fullChapterContent entry** with complete section content:
   - Each section 500-1500 words
   - Use markdown formatting (###, **, *, -, tables, emoji callouts)
   - Include practical examples and case studies

ICON OPTIONS (use appropriate):
- fa-compass (intro/overview)
- fa-tools (skills/techniques)
- fa-comments (communication)
- fa-chess (strategy)
- fa-microscope (analysis)
- fa-pencil-alt (design)
- fa-cogs (implementation)
- fa-check-circle (testing/review)
- fa-brain (advanced/expert)
- fa-flag-checkered (conclusion)
- fa-database (data)
- fa-shield-alt (security)
- fa-tachometer-alt (performance)
- fa-users (collaboration)

COLOR OPTIONS (cycle through):
- "from-navy-700 to-navy-500"
- "from-navy-600 to-navy-400"
- "from-red-600 to-red-400"
- "from-green-600 to-green-400"
- "from-purple-600 to-purple-400"
- "from-blue-600 to-blue-400"
- "from-indigo-600 to-indigo-400"
- "from-orange-600 to-orange-400"
- "from-teal-600 to-teal-400"
- "from-pink-600 to-pink-400"

EXERCISE TYPES (use varied):
- assessment, writing, practical, roleplay, template
- analysis, design, timed, presentation, strategy

Respond with ONLY valid JSON in this exact structure:
{
  "chaptersData": [
    {
      "id": 1,
      "number": "01",
      "title": "Chapter Title",
      "subtitle": "Chapter Tagline",
      "icon": "fa-compass",
      "color": "from-navy-700 to-navy-500",
      "duration": "45 min",
      "keyTakeaways": ["Point 1", "Point 2", "Point 3", "Point 4"],
      "overview": "Brief chapter overview.",
      "sections": [
        { "title": "Section Title", "content": "Brief description" }
      ],
      "exercises": [
        { "type": "practical", "title": "Exercise Name", "description": "What to do", "points": 100 }
      ],
      "quiz": [
        { "question": "Question?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "Why A is correct" }
      ],
      "reflection": "Open-ended reflection question?"
    }
  ],
  "fullChapterContent": {
    "1": {
      "sections": [
        { "title": "Section Title", "content": "Full markdown content 500-1500 words..." }
      ]
    }
  }
}`;
}

/**
 * Estimate tokens for curriculum generation.
 *
 * @param {number} chapters - Number of chapters
 * @returns {Object} - Token estimates
 */
export function estimateTokens(chapters) {
  const SYSTEM_TOKENS = 500;
  const USER_PROMPT_TOKENS = 200;
  const CHAPTER_METADATA_TOKENS = 800; // quiz, exercises, takeaways, etc.
  const SECTION_CONTENT_TOKENS = 1500; // 500-1500 words at ~1.3 tokens/word
  const SECTIONS_PER_CHAPTER = 5;

  const inputTokens = SYSTEM_TOKENS + USER_PROMPT_TOKENS;
  const outputTokens = chapters * (
    CHAPTER_METADATA_TOKENS +
    (SECTIONS_PER_CHAPTER * SECTION_CONTENT_TOKENS)
  );

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens
  };
}

export default {
  SYSTEM_PROMPT,
  OUTLINE_SYSTEM_PROMPT,
  CONTENT_SYSTEM_PROMPT,
  buildUserPrompt,
  buildOutlinePrompt,
  buildContentPrompt,
  estimateTokens
};
