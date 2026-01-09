/**
 * MCP Tool: adapt_vark
 *
 * Wrapper around CLI adapt-vark command for MCP integration.
 */

import { createClient } from '../../cli/lib/claude-client.js';
import {
  SYSTEM_PROMPT,
  buildAdaptationPrompt,
  estimateTokens,
  validateAdaptation
} from '../../cli/lib/prompts/vark-prompts.js';
import { validateAdaptiveContent } from '../../cli/lib/validators/schema-validator.js';
import { parseContentFile } from '../../cli/lib/content-parser.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Handle adapt_vark tool call from MCP.
 *
 * @param {Object} args - Tool arguments
 * @returns {Object} - MCP tool response
 */
export async function handleAdaptVark(args) {
  const {
    inputFile,
    outputFile = './generated/adaptive-fullChapters.js',
    chapter = null,
    dryRun = false
  } = args;

  // Load input content using safe parser (no eval)
  let fullChapterContent;
  try {
    fullChapterContent = await parseContentFile(inputFile, 'fullChapterContent');
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ **Error loading file:** ${error.message}`
      }],
      isError: true
    };
  }

  const chapterIds = Object.keys(fullChapterContent).map(Number);
  const chaptersToProcess = chapter ? [chapter] : chapterIds;

  // Count sections and estimate
  let totalSections = 0;
  let totalChars = 0;
  for (const id of chaptersToProcess) {
    if (!fullChapterContent[id]) {
      return {
        content: [{
          type: 'text',
          text: `❌ **Error:** Chapter ${id} not found in input file`
        }],
        isError: true
      };
    }
    for (const section of fullChapterContent[id].sections) {
      totalSections++;
      totalChars += section.content?.length || 0;
    }
  }

  const avgSectionLength = totalChars / totalSections;
  const estimates = estimateTokens(totalSections, avgSectionLength);
  const inputCost = (estimates.inputTokens / 1000) * 0.003;
  const outputCost = (estimates.outputTokens / 1000) * 0.015;
  const totalCost = inputCost + outputCost;

  if (dryRun) {
    return {
      content: [{
        type: 'text',
        text: `📊 **VARK Adaptation Cost Estimation**

**Input:** ${inputFile}
**Chapters to process:** ${chaptersToProcess.length}
**Total sections:** ${totalSections}
**Average section length:** ${Math.round(avgSectionLength)} chars

**Token Estimates:**
- Input: ~${estimates.inputTokens.toLocaleString()} tokens
- Output: ~${estimates.outputTokens.toLocaleString()} tokens (4 variants per section)
- Total: ~${estimates.totalTokens.toLocaleString()} tokens

**Estimated Cost:** $${totalCost.toFixed(2)}

Note: Using 4-in-1 prompts for cost optimization.`
      }]
    };
  }

  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      content: [{
        type: 'text',
        text: '❌ **Error:** ANTHROPIC_API_KEY not set.\n\nPlease set your API key in the environment.'
      }],
      isError: true
    };
  }

  try {
    const client = createClient();
    const adaptiveContent = {};
    const errors = [];
    let processedSections = 0;

    const startTime = Date.now();

    // Process each chapter
    for (const chapterId of chaptersToProcess) {
      const chapterContent = fullChapterContent[chapterId];

      adaptiveContent[chapterId] = {
        default: { sections: chapterContent.sections },
        visual: { sections: [] },
        auditory: { sections: [] },
        readWrite: { sections: [] },
        kinesthetic: { sections: [] }
      };

      // Process each section
      for (const section of chapterContent.sections) {
        processedSections++;

        try {
          const userPrompt = buildAdaptationPrompt(section.title, section.content);

          const adapted = await client.sendMessageForJSON({
            systemPrompt: SYSTEM_PROMPT,
            userPrompt,
            maxTokens: 16000
          });

          const validation = validateAdaptation(adapted, section.title);
          if (!validation.valid) {
            errors.push(...validation.errors);
          }

          for (const style of ['visual', 'auditory', 'readWrite', 'kinesthetic']) {
            if (adapted[style]) {
              adaptiveContent[chapterId][style].sections.push({
                title: section.title,
                content: adapted[style].content
              });
            } else {
              adaptiveContent[chapterId][style].sections.push({
                title: section.title,
                content: section.content
              });
            }
          }

        } catch (error) {
          errors.push(`Section "${section.title}": ${error.message}`);

          // Fallback to default
          for (const style of ['visual', 'auditory', 'readWrite', 'kinesthetic']) {
            adaptiveContent[chapterId][style].sections.push({
              title: section.title,
              content: section.content
            });
          }
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Write output
    const outputDir = path.dirname(outputFile);
    await fs.mkdir(outputDir, { recursive: true });

    const outputContent = `// Generated by VARK Content Adapter
// Generated: ${new Date().toISOString()}
// Chapters: ${chaptersToProcess.join(', ')}

export const adaptiveFullChapterContent = ${JSON.stringify(adaptiveContent, null, 2)};
`;

    await fs.writeFile(outputFile, outputContent);

    // Validate final output
    const validation = validateAdaptiveContent(adaptiveContent);

    return {
      content: [{
        type: 'text',
        text: `✨ **VARK Adaptation Complete!**

**Adaptation Time:** ${elapsed}s

**Output:** \`${outputFile}\`

**Summary:**
- Chapters adapted: ${chaptersToProcess.length}
- Sections adapted: ${processedSections}
- Variants per section: 5 (default + 4 VARK styles)

${errors.length > 0 ? `**Issues (${errors.length}):**\n${errors.slice(0, 5).map(e => `- ${e}`).join('\n')}${errors.length > 5 ? `\n- ... and ${errors.length - 5} more` : ''}` : ''}

${validation.warnings.length > 0 ? `**Warnings:**\n${validation.warnings.slice(0, 5).map(w => `- ${w}`).join('\n')}` : ''}

**Next Steps:**
1. Review adapted content
2. Copy to \`src/data/adaptive-fullChapters.js\`
3. Build frontend with VARKContext and StyleSelector`
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ **Adaptation Failed**

Error: ${error.message}

Some content may have been processed. Check output directory for partial results.`
      }],
      isError: true
    };
  }
}

export default handleAdaptVark;
