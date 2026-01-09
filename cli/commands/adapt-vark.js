/**
 * Adapt VARK Command
 *
 * Transforms curriculum content into 4 VARK learning style variants.
 * Uses 4-in-1 API calls for cost optimization.
 */

import { createClient } from '../lib/claude-client.js';
import {
  SYSTEM_PROMPT,
  buildAdaptationPrompt,
  estimateTokens,
  validateAdaptation
} from '../lib/prompts/vark-prompts.js';
import { validateAdaptiveContent } from '../lib/validators/schema-validator.js';
import { parseContentFile } from '../lib/content-parser.js';
import fs from 'fs/promises';
import path from 'path';
import ora from 'ora';

/**
 * Adapt curriculum content for VARK learning styles.
 *
 * @param {string} inputFile - Path to fullChapters.js or curriculum.json
 * @param {Object} options - Adaptation options
 */
export async function adaptVark(inputFile, options) {
  const {
    output = './generated/adaptive-fullChapters.js',
    styles = null, // null = all styles
    chapter = null, // null = all chapters
    parallel = true,
    dryRun = false
  } = options;

  console.log('\n🎨 VARK Content Adapter');
  console.log('=======================\n');
  console.log(`Input: ${inputFile}`);
  console.log(`Output: ${output}`);
  console.log(`Styles: ${styles ? styles.join(', ') : 'all (visual, auditory, readWrite, kinesthetic)'}`);
  console.log(`Chapter: ${chapter || 'all'}`);

  // Load input content using safe parser (no eval)
  let fullChapterContent;
  try {
    fullChapterContent = await parseContentFile(inputFile, 'fullChapterContent');
  } catch (error) {
    throw new Error(`Failed to load input file: ${error.message}`);
  }

  const chapterIds = Object.keys(fullChapterContent).map(Number);
  const chaptersToProcess = chapter ? [chapter] : chapterIds;

  // Count total sections
  let totalSections = 0;
  let totalChars = 0;
  for (const id of chaptersToProcess) {
    if (!fullChapterContent[id]) {
      throw new Error(`Chapter ${id} not found in input file`);
    }
    for (const section of fullChapterContent[id].sections) {
      totalSections++;
      totalChars += section.content?.length || 0;
    }
  }

  // Estimate tokens and cost
  const avgSectionLength = totalChars / totalSections;
  const estimates = estimateTokens(totalSections, avgSectionLength);

  console.log(`\nChapters to process: ${chaptersToProcess.length}`);
  console.log(`Total sections: ${totalSections}`);
  console.log(`Average section length: ${Math.round(avgSectionLength)} chars`);

  if (dryRun) {
    console.log('\n📊 Dry Run - Cost Estimation');
    console.log('----------------------------');
    console.log(`Input tokens: ~${estimates.inputTokens.toLocaleString()}`);
    console.log(`Output tokens: ~${estimates.outputTokens.toLocaleString()}`);
    console.log(`Total tokens: ~${estimates.totalTokens.toLocaleString()}`);

    const inputCost = (estimates.inputTokens / 1000) * 0.003;
    const outputCost = (estimates.outputTokens / 1000) * 0.015;
    const totalCost = inputCost + outputCost;

    console.log(`\nEstimated cost: $${totalCost.toFixed(2)}`);
    console.log('\nNote: Using 4-in-1 prompts for cost optimization.');
    return;
  }

  const client = createClient();

  // Build adaptive content structure
  const adaptiveContent = {};

  console.log('\n⏳ Adapting content...\n');

  const startTime = Date.now();
  let processedSections = 0;
  let errors = [];

  // Process each chapter
  for (const chapterId of chaptersToProcess) {
    const chapterContent = fullChapterContent[chapterId];
    console.log(`📖 Chapter ${chapterId}: ${chapterContent.sections.length} sections`);

    adaptiveContent[chapterId] = {
      default: { sections: chapterContent.sections },
      visual: { sections: [] },
      auditory: { sections: [] },
      readWrite: { sections: [] },
      kinesthetic: { sections: [] }
    };

    // Process each section
    for (let i = 0; i < chapterContent.sections.length; i++) {
      const section = chapterContent.sections[i];
      processedSections++;

      process.stdout.write(`   Section ${i + 1}/${chapterContent.sections.length}: ${section.title.substring(0, 40)}... `);

      try {
        const userPrompt = buildAdaptationPrompt(section.title, section.content);

        const adapted = await client.sendMessageForJSON({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
          maxTokens: 16000 // 4 variants * ~4000 tokens each
        });

        // Validate adaptation
        const validation = validateAdaptation(adapted, section.title);
        if (!validation.valid) {
          console.log('⚠️');
          errors.push(...validation.errors.map(e => `Ch${chapterId} S${i + 1}: ${e}`));
        } else {
          console.log('✓');
        }

        // Add to adaptive content
        for (const style of ['visual', 'auditory', 'readWrite', 'kinesthetic']) {
          if (adapted[style]) {
            adaptiveContent[chapterId][style].sections.push({
              title: section.title, // Preserve original title
              content: adapted[style].content
            });
          } else {
            // Fallback to default if style missing
            adaptiveContent[chapterId][style].sections.push({
              title: section.title,
              content: section.content
            });
          }
        }

      } catch (error) {
        console.log('❌');
        errors.push(`Ch${chapterId} S${i + 1}: ${error.message}`);

        // Add fallback content for all styles
        for (const style of ['visual', 'auditory', 'readWrite', 'kinesthetic']) {
          adaptiveContent[chapterId][style].sections.push({
            title: section.title,
            content: section.content // Use original as fallback
          });
        }
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Adaptation complete in ${elapsed}s`);

  // Report errors
  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} issues encountered:`);
    errors.slice(0, 10).forEach(e => console.log(`   - ${e}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }

  // Validate final output
  console.log('\n🔍 Validating adaptive content...');
  const validation = validateAdaptiveContent(adaptiveContent);

  if (validation.warnings.length > 0) {
    console.log('⚠️  Validation warnings:');
    validation.warnings.slice(0, 5).forEach(w => console.log(`   - ${w}`));
  }

  if (!validation.valid) {
    console.log('❌ Validation errors:');
    validation.errors.forEach(e => console.log(`   - ${e}`));
    console.log('\nNote: Output will still be written, but may have fallback content.');
  } else {
    console.log('✅ Validation passed');
  }

  // Write output
  console.log('\n📁 Writing output...');

  const outputDir = path.dirname(output);
  await fs.mkdir(outputDir, { recursive: true });

  const outputContent = `// Generated by VARK Content Adapter
// Generated: ${new Date().toISOString()}
// Chapters: ${chaptersToProcess.join(', ')}

export const adaptiveFullChapterContent = ${JSON.stringify(adaptiveContent, null, 2)};
`;

  await fs.writeFile(output, outputContent);
  console.log(`   ✓ ${output}`);

  // Write adaptation log
  const logPath = path.join(outputDir, 'adaptation-log.json');
  await fs.writeFile(logPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    inputFile,
    chaptersProcessed: chaptersToProcess,
    sectionsProcessed: processedSections,
    errors: errors,
    generationTime: `${elapsed}s`
  }, null, 2));
  console.log(`   ✓ ${logPath}`);

  // Summary
  console.log('\n✨ VARK adaptation complete!');
  console.log('-----------------------------');
  console.log(`Chapters adapted: ${chaptersToProcess.length}`);
  console.log(`Sections adapted: ${processedSections}`);
  console.log(`Variants per section: 4 (visual, auditory, readWrite, kinesthetic)`);

  console.log('\n📋 Next steps:');
  console.log(`   1. Review adapted content in ${output}`);
  console.log('   2. Copy to src/data/adaptive-fullChapters.js');
  console.log('   3. Build frontend with VARKContext and StyleSelector');
}

export default adaptVark;
