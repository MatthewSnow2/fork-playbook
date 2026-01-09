import Anthropic from '@anthropic-ai/sdk';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000];

/**
 * Claude API client wrapper with retry logic and error handling.
 * Handles rate limits, server errors, and transient failures.
 */
export class ClaudeClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!this.apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is required. Set it in your environment or pass it to the constructor.\n' +
        'Get your API key at: https://console.anthropic.com/'
      );
    }

    this.client = new Anthropic({ apiKey: this.apiKey });
    this.model = options.model || 'claude-sonnet-4-20250514';
    this.maxTokens = options.maxTokens || 16384;
  }

  /**
   * Send a message to Claude with automatic retry on transient errors.
   *
   * @param {Object} options - Message options
   * @param {string} options.systemPrompt - System prompt for context
   * @param {string} options.userPrompt - User message content
   * @param {number} options.maxTokens - Max tokens for response (optional)
   * @returns {Promise<string>} - Claude's response text
   */
  async sendMessage({ systemPrompt, userPrompt, maxTokens }) {
    let lastError;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: this.model,
          max_tokens: maxTokens || this.maxTokens,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        });

        // Extract text content from response
        const textBlock = response.content.find(block => block.type === 'text');
        if (!textBlock) {
          throw new Error('No text content in response');
        }

        return textBlock.text;

      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (this.isRetryable(error)) {
          const delay = RETRY_DELAYS[attempt];
          console.error(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // Non-retryable error, throw immediately
        throw this.formatError(error);
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`
    );
  }

  /**
   * Send a message and parse JSON response.
   * Handles markdown code fences around JSON.
   *
   * @param {Object} options - Message options (same as sendMessage)
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async sendMessageForJSON({ systemPrompt, userPrompt, maxTokens }) {
    const response = await this.sendMessage({ systemPrompt, userPrompt, maxTokens });

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
      throw new Error(
        `Failed to parse JSON response: ${parseError.message}\n` +
        `Response preview: ${jsonString.substring(0, 200)}...`
      );
    }
  }

  /**
   * Estimate token count for a string (approximate).
   * Uses rough estimate of 4 characters per token.
   *
   * @param {string} text - Text to estimate
   * @returns {number} - Estimated token count
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate estimated cost for a request.
   *
   * @param {number} inputTokens - Input token count
   * @param {number} outputTokens - Output token count
   * @returns {Object} - Cost breakdown { inputCost, outputCost, totalCost }
   */
  estimateCost(inputTokens, outputTokens) {
    // Claude 3.5 Sonnet pricing (as of 2024)
    const INPUT_COST_PER_1K = 0.003;  // $3 per million input tokens
    const OUTPUT_COST_PER_1K = 0.015; // $15 per million output tokens

    const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K;
    const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K;

    return {
      inputTokens,
      outputTokens,
      inputCost: inputCost.toFixed(4),
      outputCost: outputCost.toFixed(4),
      totalCost: (inputCost + outputCost).toFixed(4)
    };
  }

  /**
   * Check if an error is retryable (rate limits, server errors).
   */
  isRetryable(error) {
    // Rate limit (429)
    if (error.status === 429) return true;

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) return true;

    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;

    return false;
  }

  /**
   * Format error for user-friendly display.
   */
  formatError(error) {
    if (error.status === 401) {
      return new Error(
        'Invalid API key. Please check your ANTHROPIC_API_KEY.\n' +
        'Get your API key at: https://console.anthropic.com/'
      );
    }

    if (error.status === 400) {
      return new Error(`Bad request: ${error.message}`);
    }

    if (error.status === 429) {
      return new Error(
        'Rate limit exceeded. Please wait and try again.\n' +
        'Consider reducing request frequency or upgrading your plan.'
      );
    }

    return error;
  }

  /**
   * Sleep for specified milliseconds.
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a new Claude client instance.
 * Convenience function for quick instantiation.
 */
export function createClient(options = {}) {
  return new ClaudeClient(options);
}

export default ClaudeClient;
