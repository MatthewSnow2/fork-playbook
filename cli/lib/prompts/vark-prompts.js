/**
 * Prompt templates for VARK content adaptation.
 * Based on docs/VARK-ADAPTATION.md specification.
 */

export const SYSTEM_PROMPT = `You are an expert educational content adapter specializing in VARK learning styles. You transform educational content into four variants optimized for different learning preferences.

VARK Learning Styles:
- Visual (V): Learns through seeing - diagrams, charts, spatial layouts, color coding
- Auditory (A): Learns through hearing - stories, discussions, verbal explanations
- Read/Write (R): Learns through text - lists, definitions, written explanations
- Kinesthetic (K): Learns through doing - examples, hands-on practice, real-world application

Your adaptations must:
1. Preserve all original concepts and accuracy
2. Match the learning style characteristics authentically
3. Use markdown formatting compatible with the renderer
4. Include style-specific content markers
5. Maintain roughly equal length (±20%) across variants

Output valid JSON only - no markdown code fences, no explanation text.`;

/**
 * Build user prompt for VARK adaptation.
 *
 * @param {string} sectionTitle - Section title (must be preserved)
 * @param {string} originalContent - Original section content
 * @returns {string} - Formatted user prompt
 */
export function buildAdaptationPrompt(sectionTitle, originalContent) {
  return `Transform the following educational content into ALL FOUR VARK learning style variants.

ORIGINAL CONTENT:
Title: ${sectionTitle}
${originalContent}

TRANSFORMATION REQUIREMENTS:

**VISUAL (V)**:
- Add ASCII diagrams, flowcharts, or spatial representations
- Use tables to organize comparisons
- Include visual metaphors and color/emoji markers
- Structure content with clear visual hierarchy
- Prefix key sections with ### 📊 or ### 🎨

**AUDITORY (A)**:
- Rewrite in conversational, story-driven tone
- Add discussion prompts and questions
- Include "imagine..." and "picture this..." scenarios
- Add verbal explanation scripts ("Try saying this aloud...")
- Prefix key sections with ### 🎙️ or ### 💭

**READ/WRITE (R)**:
- Expand with detailed definitions and terminology
- Structure as numbered/bulleted lists with sub-points
- Add note-taking templates and summary frameworks
- Include "Key Terms:" and "Summary:" sections
- Prefix key sections with ### 📝 or ### 📋

**KINESTHETIC (K)**:
- Add hands-on exercises with immediate application
- Include "try this now" activities with specific steps
- Add time-boxed practice exercises (⏱️ 2 minutes)
- Include real-world application challenges
- Prefix key sections with ### 🔧 or ### 🎯

RULES:
1. Keep section title exactly: "${sectionTitle}"
2. Maintain all core concepts and factual accuracy
3. Each variant should be roughly same length (±20%)
4. Use markdown formatting compatible with renderer
5. Include style-specific content markers and emojis

OUTPUT FORMAT (JSON only, no code fences):
{
  "visual": {
    "title": "${sectionTitle}",
    "content": "Full visual-adapted content with diagrams and tables..."
  },
  "auditory": {
    "title": "${sectionTitle}",
    "content": "Full auditory-adapted content with stories and discussions..."
  },
  "readWrite": {
    "title": "${sectionTitle}",
    "content": "Full read/write-adapted content with lists and definitions..."
  },
  "kinesthetic": {
    "title": "${sectionTitle}",
    "content": "Full kinesthetic-adapted content with exercises and activities..."
  }
}`;
}

/**
 * Estimate tokens for VARK adaptation.
 *
 * @param {number} sectionCount - Number of sections to adapt
 * @param {number} avgSectionLength - Average section length in characters
 * @returns {Object} - Token estimates
 */
export function estimateTokens(sectionCount, avgSectionLength = 4000) {
  const SYSTEM_TOKENS = 400;
  const PROMPT_TEMPLATE_TOKENS = 400;
  const CONTENT_TOKENS_PER_CHAR = 0.25; // ~4 chars per token

  const inputTokensPerSection = PROMPT_TEMPLATE_TOKENS + (avgSectionLength * CONTENT_TOKENS_PER_CHAR);
  const outputTokensPerSection = avgSectionLength * CONTENT_TOKENS_PER_CHAR * 4; // 4 variants

  return {
    inputTokens: SYSTEM_TOKENS + (sectionCount * inputTokensPerSection),
    outputTokens: sectionCount * outputTokensPerSection,
    totalTokens: SYSTEM_TOKENS + sectionCount * (inputTokensPerSection + outputTokensPerSection)
  };
}

/**
 * Validate adapted content structure.
 *
 * @param {Object} adapted - Adapted content object
 * @param {string} expectedTitle - Expected section title
 * @returns {Object} - Validation result { valid, errors }
 */
export function validateAdaptation(adapted, expectedTitle) {
  const errors = [];
  const requiredStyles = ['visual', 'auditory', 'readWrite', 'kinesthetic'];

  for (const style of requiredStyles) {
    if (!adapted[style]) {
      errors.push(`Missing ${style} variant`);
      continue;
    }

    if (!adapted[style].title || !adapted[style].content) {
      errors.push(`${style} variant missing title or content`);
      continue;
    }

    if (adapted[style].title !== expectedTitle) {
      errors.push(`${style} title mismatch: expected "${expectedTitle}", got "${adapted[style].title}"`);
    }

    // Check minimum content length (at least 500 chars)
    if (adapted[style].content.length < 500) {
      errors.push(`${style} content too short (${adapted[style].content.length} chars)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  SYSTEM_PROMPT,
  buildAdaptationPrompt,
  estimateTokens,
  validateAdaptation
};
