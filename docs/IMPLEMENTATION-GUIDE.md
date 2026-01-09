# Implementation Guide - Adaptive Learning Remix

## Overview

This guide provides step-by-step instructions for building the Adaptive Learning Remix features. Follow the phases in order as each builds on the previous.

---

## Prerequisites

### Required Tools
- **Node.js 18+** (for CLI and build)
- **npm 9+** (package management)
- **Git** (version control)
- **Claude API key** (Anthropic account)

### Environment Verification
```bash
cd "/home/ubuntu/projects/web apps/Playbook"

# Verify Node version
node --version  # Should be 18+

# Verify npm
npm --version  # Should be 9+

# Verify project runs
npm install
npm run dev
# Open http://localhost:3000 to verify
```

### Claude API Key
1. Get from: https://console.anthropic.com/
2. Model: claude-3-5-sonnet (recommended for cost/quality balance)
3. Budget: ~$5-10 for full curriculum + VARK adaptation

---

## Phase 1: CLI Infrastructure

**Goal**: Create CLI foundation with API wrapper.

### Step 1.1: Create Directory Structure
```bash
mkdir -p cli/commands cli/lib/prompts cli/lib/validators
touch cli/index.js
touch cli/commands/generate-curriculum.js
touch cli/commands/adapt-vark.js
touch cli/lib/claude-client.js
touch cli/lib/config.js
```

### Step 1.2: Install CLI Dependencies
```bash
npm install commander inquirer @anthropic-ai/sdk chalk ora
```

### Step 1.3: Create CLI Entry Point

```javascript
// cli/index.js
#!/usr/bin/env node
import { program } from 'commander';
import generateCurriculum from './commands/generate-curriculum.js';
import adaptVark from './commands/adapt-vark.js';

program
  .name('playbook-cli')
  .description('AI Curriculum Generator for Playbook')
  .version('1.0.0');

program
  .command('generate-curriculum <topic>')
  .description('Generate a complete curriculum from a topic')
  .option('-c, --chapters <number>', 'Number of chapters', '10')
  .option('-d, --difficulty <level>', 'Difficulty level', 'intermediate')
  .option('-o, --output <path>', 'Output directory', './generated')
  .option('--dry-run', 'Estimate cost without generating')
  .action(generateCurriculum);

program
  .command('adapt-vark <input>')
  .description('Transform content into VARK style variants')
  .option('-o, --output <path>', 'Output path')
  .option('-c, --chapter <number>', 'Adapt single chapter only')
  .action(adaptVark);

program.parse();
```

### Step 1.4: Create Claude API Client

```javascript
// cli/lib/claude-client.js
import Anthropic from '@anthropic-ai/sdk';
import ora from 'ora';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000];

export class ClaudeClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not set.\n' +
        'Set it via: export ANTHROPIC_API_KEY=your-key-here'
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async generate(systemPrompt, userPrompt, options = {}) {
    const {
      model = DEFAULT_MODEL,
      maxTokens = 16000,
      temperature = 0.7
    } = options;

    let lastError;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.messages.create({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        });

        const content = response.content[0].text;

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in response');
        }

        return JSON.parse(jsonMatch[0]);

      } catch (error) {
        lastError = error;

        if (error.status === 429 || error.status >= 500) {
          const delay = RETRY_DELAYS[attempt] || 30000;
          console.log(`Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
          await this.sleep(delay);
        } else if (error.message?.includes('JSON')) {
          console.log('JSON parse error, retrying...');
          await this.sleep(1000);
        } else {
          throw error;
        }
      }
    }

    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  estimateCost(inputTokens, outputTokens) {
    // Claude 3.5 Sonnet pricing
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return { inputCost, outputCost, total: inputCost + outputCost };
  }
}
```

### Step 1.5: Add Package.json Scripts
```json
{
  "scripts": {
    "generate-curriculum": "node cli/index.js generate-curriculum",
    "adapt-vark": "node cli/index.js adapt-vark"
  }
}
```

### Checkpoint 1.1
```bash
node cli/index.js --help
# Should show: generate-curriculum, adapt-vark commands
```

---

## Phase 2: MCP Server Infrastructure

**Goal**: Create MCP server with curriculum generation tools.

### Step 2.1: Create MCP Server Structure
```bash
mkdir -p mcp-server/tools
touch mcp-server/index.js
touch mcp-server/tools/generate-curriculum.js
touch mcp-server/tools/adapt-vark.js
touch mcp-server/package.json
```

### Step 2.2: MCP Server Package.json
```json
{
  "name": "adaptive-learning-mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@anthropic-ai/sdk": "^0.30.0"
  }
}
```

### Step 2.3: MCP Server Implementation
```javascript
// mcp-server/index.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { generateCurriculum } from "./tools/generate-curriculum.js";
import { adaptVark } from "./tools/adapt-vark.js";

const server = new Server({
  name: "adaptive-learning-generator",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
});

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "generate_curriculum",
      description: "Generate a complete learning curriculum from a topic",
      inputSchema: {
        type: "object",
        properties: {
          topic: { type: "string", description: "Topic to create curriculum for" },
          chapters: { type: "number", description: "Number of chapters (default: 10)" },
          difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] }
        },
        required: ["topic"]
      }
    },
    {
      name: "adapt_vark",
      description: "Transform curriculum into 4 VARK learning style variants",
      inputSchema: {
        type: "object",
        properties: {
          chaptersFile: { type: "string", description: "Path to fullChapters.js" },
          chapterId: { type: "number", description: "Optional: single chapter to adapt" }
        },
        required: ["chaptersFile"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "generate_curriculum") {
    return await generateCurriculum(args);
  }
  if (name === "adapt_vark") {
    return await adaptVark(args);
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### Checkpoint 2.1
```bash
cd mcp-server && npm install && cd ..
node mcp-server/index.js
# Should start without errors (Ctrl+C to exit)
```

---

## Phase 3: Curriculum Generator

**Goal**: Generate chapters.js and fullChapters.js from topic.

### Step 3.1: Create Prompt Templates
```javascript
// cli/lib/prompts/curriculum-prompt.js
export const systemPrompt = `You are an expert curriculum designer...`;
// See docs/CURRICULUM-STRUCTURE.md for full prompt
```

### Step 3.2: Implement Generator Command

```javascript
// cli/commands/generate-curriculum.js
import { ClaudeClient } from '../lib/claude-client.js';
import { systemPrompt, generatePrompt } from '../lib/prompts/curriculum-prompt.js';
import { validateChapters } from '../lib/validators/schema-validator.js';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

export default async function generateCurriculum(topic, options) {
  // Get API key
  const apiKey = process.env.ANTHROPIC_API_KEY || await promptForKey();

  if (options.dryRun) {
    console.log('\n📊 Cost Estimate:');
    console.log(`Topic: "${topic}"`);
    console.log(`Chapters: ${options.chapters}`);
    console.log(`Estimated cost: $${(options.chapters * 0.15).toFixed(2)} - $${(options.chapters * 0.30).toFixed(2)}`);
    return;
  }

  const client = new ClaudeClient(apiKey);
  const spinner = ora(`Generating ${options.chapters}-chapter curriculum...`).start();

  try {
    const result = await client.generate(
      systemPrompt,
      generatePrompt(topic, options.chapters, options.difficulty)
    );

    // Validate output
    const validation = validateChapters(result.chaptersData);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Write output
    await fs.mkdir(options.output, { recursive: true });
    await fs.writeFile(
      path.join(options.output, 'chapters.js'),
      `export const chaptersData = ${JSON.stringify(result.chaptersData, null, 2)};`
    );
    await fs.writeFile(
      path.join(options.output, 'fullChapters.js'),
      `export const fullChapterContent = ${JSON.stringify(result.fullChapterContent, null, 2)};`
    );

    spinner.succeed(`Generated ${result.chaptersData.length} chapters`);
    console.log(`\n📁 Output: ${options.output}/`);

  } catch (error) {
    spinner.fail('Generation failed');
    console.error(error.message);
    process.exit(1);
  }
}

async function promptForKey() {
  const { apiKey } = await inquirer.prompt([{
    type: 'password',
    name: 'apiKey',
    message: 'Enter your Claude API key:',
    mask: '*'
  }]);
  return apiKey;
}
```

### Checkpoint 3.1
```bash
export ANTHROPIC_API_KEY=your-key-here
node cli/index.js generate-curriculum "Introduction to JavaScript" --chapters 3 --dry-run
# Should show cost estimate

node cli/index.js generate-curriculum "Introduction to JavaScript" --chapters 3
# Should generate ./generated/chapters.js and fullChapters.js
```

### RALPH-LOOP CHECKPOINT 1
**Human Review Required**:
- [ ] Review generated content quality
- [ ] Verify schema matches src/data/chapters.js
- [ ] Test rendering with `npm run dev`

---

## Phase 4: VARK Adapter

**Goal**: Transform content into 4 learning style variants.

### Step 4.1: Create VARK Prompts
```javascript
// cli/lib/prompts/vark-prompts.js
// See docs/VARK-ADAPTATION.md for full prompts
```

### Step 4.2: Implement VARK Command

```javascript
// cli/commands/adapt-vark.js
import { ClaudeClient } from '../lib/claude-client.js';
import { varkSystemPrompt, varkAdaptPrompt } from '../lib/prompts/vark-prompts.js';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

export default async function adaptVark(inputPath, options) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  // Load input file
  const inputContent = await fs.readFile(inputPath, 'utf-8');
  // Extract fullChapterContent object
  const match = inputContent.match(/export const fullChapterContent = (\{[\s\S]*\});?/);
  if (!match) {
    console.error('Could not parse fullChapters.js');
    process.exit(1);
  }
  const fullChapterContent = eval(`(${match[1]})`);

  const client = new ClaudeClient(apiKey);
  const chapterIds = Object.keys(fullChapterContent).map(Number);

  // Filter to single chapter if specified
  const targetChapters = options.chapter
    ? chapterIds.filter(id => id === parseInt(options.chapter))
    : chapterIds;

  const adaptiveContent = {};

  for (const chapterId of targetChapters) {
    const chapter = fullChapterContent[chapterId];
    const spinner = ora(`Adapting chapter ${chapterId}...`).start();

    adaptiveContent[chapterId] = {
      default: chapter,
      visual: { sections: [] },
      auditory: { sections: [] },
      readWrite: { sections: [] },
      kinesthetic: { sections: [] }
    };

    // Process each section
    for (let i = 0; i < chapter.sections.length; i++) {
      const section = chapter.sections[i];
      spinner.text = `Chapter ${chapterId}: Section ${i + 1}/${chapter.sections.length}`;

      try {
        const variants = await client.generate(
          varkSystemPrompt,
          varkAdaptPrompt(section.content, section.title)
        );

        // Add to each style
        ['visual', 'auditory', 'readWrite', 'kinesthetic'].forEach(style => {
          adaptiveContent[chapterId][style].sections.push({
            title: section.title,
            content: variants[style]?.content || section.content
          });
        });
      } catch (error) {
        // Fallback: use original content for all styles
        ['visual', 'auditory', 'readWrite', 'kinesthetic'].forEach(style => {
          adaptiveContent[chapterId][style].sections.push({
            title: section.title,
            content: section.content
          });
        });
      }
    }

    spinner.succeed(`Chapter ${chapterId} adapted`);
  }

  // Write output
  const outputPath = options.output || inputPath.replace('fullChapters', 'adaptive-fullChapters');
  await fs.writeFile(
    outputPath,
    `export const adaptiveFullChapterContent = ${JSON.stringify(adaptiveContent, null, 2)};`
  );

  console.log(`\n📁 Output: ${outputPath}`);
}
```

### Checkpoint 4.1
```bash
node cli/index.js adapt-vark ./generated/fullChapters.js
# Should create ./generated/adaptive-fullChapters.js
```

---

## Phase 5: Frontend Components

**Goal**: Add VARK assessment and adaptive content display.

### Step 5.1: Create VARKContext

```bash
mkdir -p src/contexts
touch src/contexts/VARKContext.jsx
```

See `docs/FRONTEND-COMPONENTS.md` for full implementation.

### Step 5.2: Create Data Files

```bash
touch src/data/vark-questions.js
touch src/utils/varkHelpers.js
```

See `docs/FRONTEND-COMPONENTS.md` for full implementation.

### Step 5.3: Create Components

```bash
mkdir -p src/components/adaptive
touch src/components/adaptive/VARKAssessment.jsx
touch src/components/adaptive/StyleSelector.jsx
touch src/components/adaptive/AdaptiveContentRenderer.jsx
```

See `docs/FRONTEND-COMPONENTS.md` for full implementation.

### Step 5.4: Integrate into App.jsx

1. Import VARKProvider
2. Wrap app content with VARKProvider
3. Add VARKAssessmentModal component

### Step 5.5: Integrate into ChapterView.jsx

1. Import useVARK hook
2. Add StyleSelector component
3. Replace ChapterContent with AdaptiveContentRenderer

### Checkpoint 5.1
```bash
npm run dev
# 1. Complete VARK assessment
# 2. Navigate to chapter
# 3. Switch styles
# 4. Verify content changes
```

### RALPH-LOOP CHECKPOINT 2
**Human Review Required**:
- [ ] VARK assessment UX works correctly
- [ ] Style switching updates content
- [ ] Visual design matches existing theme

---

## Phase 6: Integration & Testing

**Goal**: End-to-end validation and polish.

### Step 6.1: Full E2E Test

```bash
# 1. Generate test curriculum
node cli/index.js generate-curriculum "AWS Bedrock Fundamentals" --chapters 5

# 2. Adapt for VARK
node cli/index.js adapt-vark ./generated/fullChapters.js

# 3. Copy to app (for testing)
cp ./generated/chapters.js ./src/data/test-chapters.js
cp ./generated/adaptive-fullChapters.js ./src/data/

# 4. Update imports in App.jsx temporarily to use test data

# 5. Run app
npm run dev

# 6. Manual testing checklist:
# - [ ] Dashboard loads
# - [ ] VARK assessment appears for new users
# - [ ] Assessment completes and saves result
# - [ ] Navigate to generated chapter
# - [ ] Style selector appears
# - [ ] Switch between all 4 styles
# - [ ] Content updates for each style
# - [ ] Fallback works when variant missing
# - [ ] Style persists after page refresh
```

### Step 6.2: Security Review

```bash
# Check for API key leaks
grep -r "sk-ant" src/
grep -r "ANTHROPIC_API_KEY" src/ --include="*.js" --include="*.jsx"
# Should find nothing in source files

# Check localStorage
# In browser console: localStorage.getItem('ai_playbook_vark_preference')
# Should NOT contain any API keys
```

### Step 6.3: Update Documentation

1. Update README.md with usage instructions
2. Create .env.example
3. Update CLAUDE.md with final architecture

### Step 6.4: Create .env.example

```bash
# .env.example
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### RALPH-LOOP CHECKPOINT 3 (FINAL)
**Human Review Required**:
- [ ] Full E2E workflow works
- [ ] No security issues found
- [ ] Documentation complete
- [ ] Ready to deploy/publish

---

## Common Issues & Troubleshooting

### Issue: "Cannot find module" errors
```bash
npm install  # Reinstall dependencies
```

### Issue: API rate limiting
- Add delay between requests
- Use exponential backoff (already in claude-client.js)
- Consider using claude-3-haiku for testing

### Issue: JSON parsing errors
- Claude sometimes wraps JSON in markdown code fences
- Strip ``` before parsing (handled in claude-client.js)

### Issue: Content not rendering
- Check browser console for React errors
- Verify JSON structure matches expected schema
- Test markdown in isolation

### Issue: Style not changing
- Clear localStorage: `localStorage.clear()`
- Check VARKContext integration
- Verify adaptive-fullChapters.js is imported

### Issue: Generated content quality poor
- Iterate on prompt templates
- Use Claude Opus for quality-critical generation
- Add more examples to prompts

---

## File Checklist

### CLI Files
- [ ] `cli/index.js`
- [ ] `cli/commands/generate-curriculum.js`
- [ ] `cli/commands/adapt-vark.js`
- [ ] `cli/lib/claude-client.js`
- [ ] `cli/lib/prompts/curriculum-prompt.js`
- [ ] `cli/lib/prompts/vark-prompts.js`
- [ ] `cli/lib/validators/schema-validator.js`

### MCP Server Files
- [ ] `mcp-server/index.js`
- [ ] `mcp-server/tools/generate-curriculum.js`
- [ ] `mcp-server/tools/adapt-vark.js`
- [ ] `mcp-server/package.json`

### Frontend Files
- [ ] `src/contexts/VARKContext.jsx`
- [ ] `src/components/adaptive/VARKAssessment.jsx`
- [ ] `src/components/adaptive/StyleSelector.jsx`
- [ ] `src/components/adaptive/AdaptiveContentRenderer.jsx`
- [ ] `src/data/vark-questions.js`
- [ ] `src/utils/varkHelpers.js`

### Modified Files
- [ ] `package.json` (add scripts and dependencies)
- [ ] `src/App.jsx` (add VARKProvider)
- [ ] `src/components/ChapterView.jsx` (add adaptive rendering)
- [ ] `src/components/Navigation.jsx` (add style indicator)

### Documentation
- [ ] `BLUEPRINT.md` (updated)
- [ ] `docs/CURRICULUM-STRUCTURE.md`
- [ ] `docs/VARK-ADAPTATION.md`
- [ ] `docs/FRONTEND-COMPONENTS.md`
- [ ] `docs/IMPLEMENTATION-GUIDE.md`
- [ ] `README.md` (updated)
- [ ] `.env.example`

---

## Success Metrics

After completing all phases:

1. **CLI works**: `node cli/index.js --help` shows commands
2. **Generation works**: Produces valid chapters.js and fullChapters.js
3. **VARK works**: Produces 4 variants per section
4. **MCP works**: Server starts and responds to tool calls
5. **Frontend works**: Assessment → style selection → adaptive content
6. **Integration works**: Full flow from topic → adaptive learning experience
