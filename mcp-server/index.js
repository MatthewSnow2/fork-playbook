#!/usr/bin/env node

/**
 * Adaptive Learning MCP Server
 *
 * Provides Claude Desktop/Code with tools for:
 * - generate_curriculum: Create complete learning curriculum from topic
 * - adapt_vark: Transform content into VARK learning style variants
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { handleGenerateCurriculum } from './tools/generate-curriculum.js';
import { handleAdaptVark } from './tools/adapt-vark.js';

// Tool definitions
const TOOLS = [
  {
    name: 'generate_curriculum',
    description: `Generate a complete learning curriculum from a topic description.

Creates chapters.js (metadata) and fullChapters.js (content) that match the Playbook schema.

Outputs:
- Chapter titles, subtitles, icons, colors
- Key takeaways and overviews
- Section content (500-1500 words each)
- Exercises with types and points
- Quiz questions with 4 options
- Reflection prompts

Cost: ~$0.50-1.50 per curriculum (user's API key)`,
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic to generate curriculum for (e.g., "Introduction to Machine Learning")'
        },
        chapters: {
          type: 'number',
          description: 'Number of chapters to generate (default: 10)',
          default: 10
        },
        difficulty: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Difficulty level (default: intermediate)',
          default: 'intermediate'
        },
        duration: {
          type: 'number',
          description: 'Average chapter duration in minutes (default: 45)',
          default: 45
        },
        outputDir: {
          type: 'string',
          description: 'Output directory (default: ./generated)',
          default: './generated'
        },
        dryRun: {
          type: 'boolean',
          description: 'If true, only estimate cost without generating',
          default: false
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'adapt_vark',
    description: `Transform curriculum content into 4 VARK learning style variants.

VARK Styles:
- Visual: Diagrams, tables, flowcharts, spatial layouts
- Auditory: Conversational tone, stories, discussion prompts
- Read/Write: Definitions, lists, note templates, summaries
- Kinesthetic: Hands-on exercises, step-by-step activities

Uses 4-in-1 API calls for cost optimization.
Cost: ~$1.50-3.00 per curriculum (user's API key)`,
    inputSchema: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to fullChapters.js or curriculum.json file'
        },
        outputFile: {
          type: 'string',
          description: 'Output file path (default: ./generated/adaptive-fullChapters.js)',
          default: './generated/adaptive-fullChapters.js'
        },
        chapter: {
          type: 'number',
          description: 'Adapt only this chapter ID (optional, default: all chapters)'
        },
        dryRun: {
          type: 'boolean',
          description: 'If true, only estimate cost without generating',
          default: false
        }
      },
      required: ['inputFile']
    }
  }
];

// Create server instance
const server = new Server(
  {
    name: 'adaptive-learning-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_curriculum':
        return await handleGenerateCurriculum(args);

      case 'adapt_vark':
        return await handleAdaptVark(args);

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}. Available tools: generate_curriculum, adapt_vark`
            }
          ],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Adaptive Learning MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
