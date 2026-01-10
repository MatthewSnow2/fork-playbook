/**
 * Browser-compatible Anthropic API client
 * Uses fetch with CORS header for direct browser access
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 16384;

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000];

/**
 * Error types for handling different API errors
 */
export const ErrorType = {
  INVALID_KEY: 'INVALID_KEY',
  RATE_LIMITED: 'RATE_LIMITED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  SERVER_ERROR: 'SERVER_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Custom error class with additional metadata
 */
export class AnthropicError extends Error {
  constructor(message, type, status = null, retryable = false) {
    super(message);
    this.name = 'AnthropicError';
    this.type = type;
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * Check if an error is retryable
 */
function isRetryable(error) {
  if (error instanceof AnthropicError) {
    return error.retryable;
  }

  // Network errors are retryable
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

/**
 * Parse API error response and create appropriate error
 */
async function parseError(response) {
  let errorMessage = `API error: ${response.status}`;

  try {
    const errorData = await response.json();
    if (errorData.error?.message) {
      errorMessage = errorData.error.message;
    }
  } catch {
    // Use default message if parsing fails
  }

  switch (response.status) {
    case 401:
      return new AnthropicError(
        'Invalid API key. Please check your key and try again.',
        ErrorType.INVALID_KEY,
        401,
        false
      );
    case 402:
      return new AnthropicError(
        'Insufficient credits. Please check your Anthropic account.',
        ErrorType.INSUFFICIENT_CREDITS,
        402,
        false
      );
    case 400:
      return new AnthropicError(
        `Bad request: ${errorMessage}`,
        ErrorType.BAD_REQUEST,
        400,
        false
      );
    case 429:
      return new AnthropicError(
        'Rate limited. Please wait and try again.',
        ErrorType.RATE_LIMITED,
        429,
        true
      );
    default:
      if (response.status >= 500) {
        return new AnthropicError(
          `Server error: ${errorMessage}`,
          ErrorType.SERVER_ERROR,
          response.status,
          true
        );
      }
      return new AnthropicError(
        errorMessage,
        ErrorType.UNKNOWN,
        response.status,
        false
      );
  }
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send a message to Claude API with retry logic
 *
 * @param {Object} options - Request options
 * @param {string} options.apiKey - Anthropic API key
 * @param {string} options.systemPrompt - System prompt
 * @param {string} options.userPrompt - User message
 * @param {number} options.maxTokens - Max tokens (default: 16384)
 * @param {string} options.model - Model to use (default: claude-sonnet-4-20250514)
 * @param {AbortSignal} options.signal - Optional abort signal for cancellation
 * @param {Function} options.onRetry - Optional callback for retry attempts
 * @returns {Promise<string>} Response text
 */
export async function sendMessage({
  apiKey,
  systemPrompt,
  userPrompt,
  maxTokens = DEFAULT_MAX_TOKENS,
  model = DEFAULT_MODEL,
  signal,
  onRetry
}) {
  if (!apiKey) {
    throw new AnthropicError(
      'API key is required',
      ErrorType.INVALID_KEY,
      null,
      false
    );
  }

  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        }),
        signal
      });

      if (!response.ok) {
        throw await parseError(response);
      }

      const data = await response.json();

      // Extract text content
      const textBlock = data.content?.find(block => block.type === 'text');
      if (!textBlock) {
        throw new AnthropicError(
          'No text content in response',
          ErrorType.PARSE_ERROR,
          null,
          false
        );
      }

      return textBlock.text;

    } catch (error) {
      // Check for abort
      if (error.name === 'AbortError') {
        throw error;
      }

      lastError = error;

      // Network error - wrap it
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        lastError = new AnthropicError(
          'Network error. Please check your internet connection.',
          ErrorType.NETWORK_ERROR,
          null,
          true
        );
      }

      // Check if retryable
      if (isRetryable(lastError) && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt];

        if (onRetry) {
          onRetry({
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES,
            delay,
            error: lastError
          });
        }

        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

/**
 * Send a message and parse JSON response
 * Handles markdown code fences around JSON
 *
 * @param {Object} options - Same as sendMessage
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function sendMessageForJSON(options) {
  const response = await sendMessage(options);

  // Strip markdown code fences if present
  let jsonString = response.trim();

  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.slice(3);
  }

  if (jsonString.endsWith('```')) {
    jsonString = jsonString.slice(0, -3);
  }

  jsonString = jsonString.trim();

  try {
    return JSON.parse(jsonString);
  } catch (parseError) {
    throw new AnthropicError(
      `Failed to parse JSON response: ${parseError.message}\n` +
      `Response preview: ${jsonString.substring(0, 200)}...`,
      ErrorType.PARSE_ERROR,
      null,
      false
    );
  }
}

/**
 * Estimate token count for a string (approximate)
 * Uses rough estimate of 4 characters per token
 *
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate estimated cost for a request
 * Uses Claude Sonnet pricing
 *
 * @param {number} inputTokens - Input token count
 * @param {number} outputTokens - Output token count
 * @returns {Object} Cost breakdown
 */
export function estimateCost(inputTokens, outputTokens) {
  // Claude 4 Sonnet pricing (as of 2025)
  const INPUT_COST_PER_1K = 0.003;  // $3 per million input tokens
  const OUTPUT_COST_PER_1K = 0.015; // $15 per million output tokens

  const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K;
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost: inputCost.toFixed(4),
    outputCost: outputCost.toFixed(4),
    totalCost: (inputCost + outputCost).toFixed(4)
  };
}

/**
 * Estimate cost for curriculum generation
 *
 * @param {number} chapters - Number of chapters
 * @param {number} sectionsPerChapter - Sections per chapter (default: 5)
 * @returns {Object} Cost estimate
 */
export function estimateCurriculumCost(chapters, sectionsPerChapter = 5) {
  // Estimated tokens per component
  const SYSTEM_TOKENS = 500;
  const OUTLINE_PROMPT_TOKENS = 300;
  const OUTLINE_RESPONSE_TOKENS = chapters * 400; // Metadata per chapter
  const CONTENT_PROMPT_TOKENS = 200;
  const CONTENT_RESPONSE_TOKENS = sectionsPerChapter * 600; // ~500 words per section

  // Phase 1: Outline generation
  const outlineInputTokens = SYSTEM_TOKENS + OUTLINE_PROMPT_TOKENS;
  const outlineOutputTokens = OUTLINE_RESPONSE_TOKENS;

  // Phase 2: Content generation (per chapter)
  const contentInputTokens = (SYSTEM_TOKENS + CONTENT_PROMPT_TOKENS) * chapters;
  const contentOutputTokens = CONTENT_RESPONSE_TOKENS * chapters;

  const totalInputTokens = outlineInputTokens + contentInputTokens;
  const totalOutputTokens = outlineOutputTokens + contentOutputTokens;

  const estimate = estimateCost(totalInputTokens, totalOutputTokens);

  return {
    ...estimate,
    breakdown: {
      outline: estimateCost(outlineInputTokens, outlineOutputTokens),
      content: estimateCost(contentInputTokens, contentOutputTokens)
    },
    chapters,
    sectionsPerChapter
  };
}

/**
 * Estimate cost for VARK adaptation
 *
 * @param {number} chapters - Number of chapters
 * @param {number} sectionsPerChapter - Sections per chapter (default: 5)
 * @returns {Object} Cost estimate
 */
export function estimateVARKCost(chapters, sectionsPerChapter = 5) {
  const totalSections = chapters * sectionsPerChapter;

  // Per section: ~500 input tokens, ~2000 output tokens (4 styles)
  const inputTokens = totalSections * 500;
  const outputTokens = totalSections * 2000;

  return estimateCost(inputTokens, outputTokens);
}
