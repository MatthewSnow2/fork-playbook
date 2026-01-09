/**
 * Generate Curriculum Command
 *
 * Generates complete curriculum (chapters.js + fullChapters.js)
 * from a topic description using Claude API.
 *
 * Uses two-phase generation:
 * 1. Outline phase: Generate chapter metadata
 * 2. Content phase: Generate full content for each chapter
 */

import { createClient } from '../lib/claude-client.js';
import {
  OUTLINE_SYSTEM_PROMPT,
  CONTENT_SYSTEM_PROMPT,
  buildOutlinePrompt,
  buildContentPrompt,
  estimateTokens
} from '../lib/prompts/curriculum-prompt.js';
import { validateCurriculum } from '../lib/validators/schema-validator.js';
import fs from 'fs/promises';
import path from 'path';
import ora from 'ora';

/**
 * Generate a complete curriculum from a topic.
 *
 * @param {string} topic - Topic to generate curriculum for
 * @param {Object} options - Generation options
 */
export async function generateCurriculum(topic, options) {
  const {
    chapters = 10,
    difficulty = 'intermediate',
    duration = 45,
    output = './generated',
    format = 'js',
    dryRun = false
  } = options;

  console.log('\n📚 Adaptive Learning Curriculum Generator');
  console.log('=========================================\n');
  console.log(`Topic: ${topic}`);
  console.log(`Chapters: ${chapters}`);
  console.log(`Difficulty: ${difficulty}`);
  console.log(`Duration: ${duration} min/chapter`);
  console.log(`Output: ${output}`);

  // Estimate tokens and cost
  const estimates = estimateTokens(chapters);

  if (dryRun) {
    console.log('\n📊 Dry Run - Cost Estimation');
    console.log('----------------------------');
    console.log(`Input tokens: ~${estimates.inputTokens.toLocaleString()}`);
    console.log(`Output tokens: ~${estimates.outputTokens.toLocaleString()}`);
    console.log(`Total tokens: ~${estimates.totalTokens.toLocaleString()}`);

    // Cost estimate (Claude Sonnet pricing)
    const inputCost = (estimates.inputTokens / 1000) * 0.003;
    const outputCost = (estimates.outputTokens / 1000) * 0.015;
    const totalCost = inputCost + outputCost;

    console.log(`\nEstimated cost: $${totalCost.toFixed(2)}`);
    console.log('\nNote: Using two-phase generation (outline + content per chapter).');
    return;
  }

  const client = createClient();
  const startTime = Date.now();

  // Phase 1: Generate outline
  const outlineSpinner = ora({
    text: 'Phase 1/2: Generating curriculum outline...',
    spinner: 'dots'
  }).start();

  let chaptersData;
  try {
    const outlinePrompt = buildOutlinePrompt({ topic, chapters, difficulty, duration });
    const outlineResult = await client.sendMessageForJSON({
      systemPrompt: OUTLINE_SYSTEM_PROMPT,
      userPrompt: outlinePrompt,
      maxTokens: 8192
    });
    chaptersData = outlineResult.chaptersData;

    if (!chaptersData || !Array.isArray(chaptersData) || chaptersData.length === 0) {
      throw new Error('No chapters generated in outline');
    }

    outlineSpinner.succeed(`Phase 1/2: Outline complete (${chaptersData.length} chapters)`);
  } catch (error) {
    outlineSpinner.fail('Phase 1/2: Outline generation failed');
    throw new Error(`Failed to generate outline: ${error.message}`);
  }

  // Phase 2: Generate content for each chapter
  console.log('\nPhase 2/2: Generating chapter content...');

  const fullChapterContent = {};
  let successCount = 0;
  let errorCount = 0;

  for (const chapter of chaptersData) {
    const contentSpinner = ora({
      text: `  Chapter ${chapter.id}/${chaptersData.length}: ${chapter.title}`,
      spinner: 'dots'
    }).start();

    try {
      const contentPrompt = buildContentPrompt(chapter);
      const contentResult = await client.sendMessageForJSON({
        systemPrompt: CONTENT_SYSTEM_PROMPT,
        userPrompt: contentPrompt,
        maxTokens: 8192
      });

      if (contentResult.sections && Array.isArray(contentResult.sections)) {
        fullChapterContent[chapter.id] = { sections: contentResult.sections };
        successCount++;
        contentSpinner.succeed(`  Chapter ${chapter.id}/${chaptersData.length}: ${chapter.title}`);
      } else {
        throw new Error('Invalid sections structure');
      }
    } catch (error) {
      errorCount++;
      contentSpinner.fail(`  Chapter ${chapter.id}/${chaptersData.length}: ${chapter.title} (failed: ${error.message})`);

      // Use placeholder content
      fullChapterContent[chapter.id] = {
        sections: chapter.sections.map(s => ({
          title: s.title,
          content: `# ${s.title}\n\n${s.content}\n\n*Content generation failed. Please regenerate this chapter.*`
        }))
      };
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Generation complete in ${elapsed}s (${successCount} success, ${errorCount} failed)`);

  // Build curriculum object
  const curriculum = { chaptersData, fullChapterContent };

  // Validate output
  console.log('\n🔍 Validating curriculum structure...');
  const validation = validateCurriculum(curriculum);

  if (validation.errors.length > 0) {
    console.log('\n❌ Validation errors:');
    validation.errors.slice(0, 5).forEach(e => console.log(`   - ${e}`));
    if (validation.errors.length > 5) {
      console.log(`   ... and ${validation.errors.length - 5} more`);
    }
  }

  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Validation warnings:');
    validation.warnings.slice(0, 5).forEach(w => console.log(`   - ${w}`));
  }

  if (!validation.valid) {
    console.log('\n⚠️  Curriculum has validation errors but will be saved anyway.');
  } else {
    console.log('✅ Validation passed');
  }

  // Ensure output directory exists
  await fs.mkdir(output, { recursive: true });

  // Write output files
  console.log('\n📁 Writing output files...');

  if (format === 'js') {
    // Write chapters.js
    const chaptersContent = `// Generated by Adaptive Learning Curriculum Generator
// Topic: ${topic}
// Generated: ${new Date().toISOString()}

export const chaptersData = ${JSON.stringify(curriculum.chaptersData, null, 2)};
`;
    await fs.writeFile(path.join(output, 'chapters.js'), chaptersContent);
    console.log(`   ✓ ${path.join(output, 'chapters.js')}`);

    // Write fullChapters.js
    const fullChaptersContent = `// Generated by Adaptive Learning Curriculum Generator
// Topic: ${topic}
// Generated: ${new Date().toISOString()}

export const fullChapterContent = ${JSON.stringify(curriculum.fullChapterContent, null, 2)};
`;
    await fs.writeFile(path.join(output, 'fullChapters.js'), fullChaptersContent);
    console.log(`   ✓ ${path.join(output, 'fullChapters.js')}`);
  } else {
    // Write JSON format
    await fs.writeFile(
      path.join(output, 'curriculum.json'),
      JSON.stringify(curriculum, null, 2)
    );
    console.log(`   ✓ ${path.join(output, 'curriculum.json')}`);
  }

  // Write metadata
  const metadata = {
    topic,
    chapters,
    difficulty,
    duration,
    generatedAt: new Date().toISOString(),
    estimatedTokens: estimates,
    generationTime: `${elapsed}s`,
    successCount,
    errorCount
  };
  await fs.writeFile(
    path.join(output, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  console.log(`   ✓ ${path.join(output, 'metadata.json')}`);

  // Summary
  console.log('\n✨ Curriculum generation complete!');
  console.log('-----------------------------------');
  console.log(`Chapters generated: ${curriculum.chaptersData.length}`);
  console.log(`Total sections: ${curriculum.chaptersData.reduce((sum, c) => sum + c.sections.length, 0)}`);
  console.log(`Total exercises: ${curriculum.chaptersData.reduce((sum, c) => sum + c.exercises.length, 0)}`);
  console.log(`Total quiz questions: ${curriculum.chaptersData.reduce((sum, c) => sum + c.quiz.length, 0)}`);

  console.log('\n📋 Next steps:');
  console.log(`   1. Review generated content in ${output}/`);
  console.log(`   2. Run VARK adaptation: node cli/index.js adapt-vark ${output}/fullChapters.js`);
  console.log(`   3. Copy to src/data/ when ready to use`);
}

export default generateCurriculum;
