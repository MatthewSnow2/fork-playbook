#!/usr/bin/env node

/**
 * Adaptive Learning Remix CLI
 *
 * Commands:
 * - generate-curriculum: Generate complete curriculum from topic
 * - adapt-vark: Transform content into VARK learning style variants
 *
 * Usage:
 *   node cli/index.js generate-curriculum "Topic Name" --chapters 10
 *   node cli/index.js adapt-vark ./generated/fullChapters.js
 */

import { Command } from 'commander';
import { generateCurriculum } from './commands/generate-curriculum.js';
import { adaptVark } from './commands/adapt-vark.js';

const program = new Command();

program
  .name('adaptive-learning')
  .description('AI-powered curriculum generator with VARK learning style adaptation')
  .version('1.0.0');

// Generate Curriculum Command
program
  .command('generate-curriculum <topic>')
  .description('Generate a complete learning curriculum from a topic description')
  .option('-c, --chapters <number>', 'Number of chapters to generate', '10')
  .option('-d, --difficulty <level>', 'Difficulty level (beginner, intermediate, advanced)', 'intermediate')
  .option('--duration <minutes>', 'Average chapter duration in minutes', '45')
  .option('-o, --output <path>', 'Output directory', './generated')
  .option('--format <type>', 'Output format (js or json)', 'js')
  .option('--dry-run', 'Estimate cost without generating', false)
  .action(async (topic, options) => {
    try {
      await generateCurriculum(topic, {
        chapters: parseInt(options.chapters, 10),
        difficulty: options.difficulty,
        duration: parseInt(options.duration, 10),
        output: options.output,
        format: options.format,
        dryRun: options.dryRun
      });
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Adapt VARK Command
program
  .command('adapt-vark <input-file>')
  .description('Transform curriculum content into VARK learning style variants')
  .option('-o, --output <path>', 'Output file path', './generated/adaptive-fullChapters.js')
  .option('--styles <list>', 'Comma-separated styles to generate (visual,auditory,readWrite,kinesthetic)', 'all')
  .option('-c, --chapter <number>', 'Adapt single chapter only')
  .option('--parallel', 'Process styles in parallel (default)', true)
  .option('--dry-run', 'Estimate cost without generating', false)
  .action(async (inputFile, options) => {
    try {
      await adaptVark(inputFile, {
        output: options.output,
        styles: options.styles === 'all' ? null : options.styles.split(','),
        chapter: options.chapter ? parseInt(options.chapter, 10) : null,
        parallel: options.parallel,
        dryRun: options.dryRun
      });
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    }
  });

// Parse and execute
program.parse();
