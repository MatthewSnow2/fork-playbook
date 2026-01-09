# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Adaptive Learning Remix** - a fork of Dr. Lutfiya Miller's AI Consulting Playbook, extended to be a self-hosted AI curriculum generator with VARK-based learning style adaptation.

**Original**: Interactive learning platform with 14 chapters of AI consulting content.
**Extension**: CLI/MCP tools to generate custom curricula for any topic with automatic VARK adaptation.

### Key Differentiators
- **Self-hosted**: Users provide their own Claude API keys (no hosted service)
- **CLI + MCP**: Both command-line and MCP server interfaces
- **VARK Adaptation**: Content transforms to 4 learning styles (Visual, Auditory, Read/Write, Kinesthetic)
- **Open-source**: Forkable, community-driven

### Build Status
See `BLUEPRINT.md` for phase tracking and checkboxes.

## Development Commands

### Essential Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development server on http://localhost:3000 (Vite dev server)
- `npm run build` - Build for production (Vite build)
- `npm run preview` - Preview production build locally (wrangler pages dev)
- `npm run deploy` - Build and deploy to Cloudflare Pages (runs build + wrangler pages deploy)
- `npm run cf-typegen` - Generate Cloudflare TypeScript types

**Note**: No lint, test, or typecheck commands are configured in package.json

### CLI Commands (Adaptive Learning Remix)
```bash
# Generate complete curriculum from topic
node cli/index.js generate-curriculum "Topic Name" --chapters 10 --difficulty intermediate

# Adapt content for VARK learning styles
node cli/index.js adapt-vark ./generated/fullChapters.js

# Dry run (estimate cost without generating)
node cli/index.js generate-curriculum "Topic Name" --dry-run
```

### MCP Server
```bash
# Start MCP server (for Claude Desktop integration)
node mcp-server/index.js
```

**MCP Tools**:
- `generate_curriculum` - Generate complete learning curriculum from topic
- `adapt_vark` - Transform curriculum into 4 VARK learning style variants

### Process Management (PM2)
- `pm2 start ecosystem.config.cjs` - Start the application
- `pm2 restart ai-playbook` - Restart the application
- `pm2 logs ai-playbook` - View application logs
- `pm2 status` - Check PM2 status

## Architecture Overview

### Tech Stack
- **Frontend**: React 19.2.0 + TypeScript/JavaScript (mixed) + Vite 6.4.1
- **Styling**: Tailwind CSS 3.4.18 with custom theme (navy/silver palette) 
- **State Management**: React hooks + LocalStorage + Context (ThemeContext)
- **Backend**: Hono 4.10.4 framework (minimal setup)
- **Deployment**: Cloudflare Pages (wrangler 4.4.0) + PM2 for local hosting
- **Content**: Markdown-style formatting in JavaScript modules
- **Build Tools**: Vite with React plugin, PostCSS, Autoprefixer
- **Video**: Loom integration for chapter videos

### Core Data Flow
1. Chapter metadata defined in `src/data/chapters.js` (titles, overviews, exercises, quizzes)
2. Full chapter content stored in `src/data/fullChapters.js` (detailed sections with markdown formatting)
3. Progress tracking via `src/utils/storage.ts` using LocalStorage
4. AI Coach context managed through `src/utils/aiCoach.ts`

### Key Components
- `App.jsx` - Main application shell with routing and state
- `Dashboard.jsx` - Chapter overview and progress visualization
- `ChapterView.jsx` - Individual chapter display with navigation
- `ChapterContent.jsx` - Renders markdown-style content with formatting
- `ProgressTracker.jsx` - Sidebar progress display and chapter navigation
- `AICoach.jsx` - Contextual AI assistance interface
- `Navigation.jsx` - Top navigation component
- `LoomVideoPlayer.jsx` - Embedded Loom video player for chapter videos
- `ThemeContext.jsx` - Dark/light theme management context

### Content System
The app uses a dual-layer content system:
- **chapters.js**: Chapter metadata, brief overviews, exercises, and quiz definitions
- **fullChapters.js**: Complete chapter content with markdown-style formatting

Content rendering supports:
- Headers (`###`), bold (`**text**`), italic (`*text*`)
- Lists (`- item`), checklists (`- [ ] task`)
- Callouts (emoji prefixes: 🎓, 🔧, ⚠️, 💎, etc.)
- Code blocks (`` `code` ``)
- Blockquotes (`*"quote"`)

## Content Integration Workflow

### Content Management System
The platform uses a dual-layer content architecture for structured learning delivery.

**Current Status**:
- Chapters 1-14: ✅ Fully integrated (comprehensive content with video URLs)
- All chapters have complete content extracted from source documents

**Content Structure**:
```javascript
export const fullChapterContent = {
  [chapterId]: {
    sections: [
      {
        title: "Section Title",
        content: `Markdown-formatted content here...`
      }
    ]
  }
}
```

**Content Guidelines** (see `CONTENT_UPDATE_GUIDE.md` for detailed formatting):
- Extract content from DOCX/PDF files in `/content/` directory
- Maintain formatting integrity (headers, lists, callouts, emphasis)
- Match section titles with `chapters.js` metadata
- Use markdown-style syntax for consistent rendering

## File Structure

```
├── cli/                        # CLI for curriculum generation (Adaptive Learning Remix)
│   ├── index.js               # Commander entry point
│   ├── commands/
│   │   ├── generate-curriculum.js
│   │   └── adapt-vark.js
│   └── lib/
│       ├── claude-client.js   # Anthropic API wrapper with retry
│       ├── prompts/
│       │   ├── curriculum-prompt.js
│       │   └── vark-prompts.js
│       └── validators/
│           └── schema-validator.js
├── mcp-server/                 # MCP server for Claude Desktop integration
│   ├── index.js
│   ├── tools/
│   │   ├── generate-curriculum.js
│   │   └── adapt-vark.js
│   └── package.json
├── generated/                  # Output directory for generated curricula
│   ├── chapters.js
│   ├── fullChapters.js
│   ├── adaptive-fullChapters.js
│   └── metadata.json
├── docs/                       # Specification documents
│   ├── CURRICULUM-STRUCTURE.md # Generator input/output spec
│   ├── VARK-ADAPTATION.md      # VARK transformation rules
│   ├── FRONTEND-COMPONENTS.md  # Component specifications
│   └── IMPLEMENTATION-GUIDE.md # Build order guide
├── content/                    # Source DOCX/PDF files (14 chapters)
├── src/
│   ├── contexts/
│   │   ├── ThemeContext.jsx   # Dark/light theme
│   │   └── VARKContext.jsx    # Learning style preference (Adaptive)
│   ├── data/
│   │   ├── chapters.js        # Chapter metadata and structure
│   │   ├── fullChapters.js    # Complete chapter content
│   │   ├── adaptive-fullChapters.js  # VARK-adapted content (generated)
│   │   ├── vark-questions.js  # VARK assessment questions
│   │   └── chapters.ts        # TypeScript type definitions
│   ├── components/
│   │   ├── adaptive/          # Adaptive Learning components
│   │   │   ├── VARKAssessment.jsx
│   │   │   ├── StyleSelector.jsx
│   │   │   └── AdaptiveContentRenderer.jsx
│   │   ├── ChapterContent.jsx # Markdown-style content renderer
│   │   ├── ChapterView.jsx    # Individual chapter display
│   │   ├── Dashboard.jsx      # Chapter overview and progress
│   │   └── ProgressTracker.jsx # Sidebar navigation and progress
│   ├── utils/
│   │   ├── storage.ts         # LocalStorage progress tracking
│   │   ├── aiCoach.ts         # AI Coach functionality
│   │   └── varkHelpers.js     # VARK scoring utilities
│   └── App.jsx               # Main application shell
├── public/static/            # Static assets
├── package.json              # Dependencies and scripts
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind customization
├── wrangler.jsonc           # Cloudflare Pages configuration
├── ecosystem.config.cjs     # PM2 process configuration
├── BLUEPRINT.md             # Phase tracking for ralph-loop
├── CONTENT_UPDATE_GUIDE.md  # Detailed content formatting guide
└── GITHUB_WORKFLOW.md       # GitHub workflow documentation
```

## Development Guidelines

### Content Management
- All chapter content should be stored in data files, never hardcoded in components
- Maintain consistency between `chapters.js` metadata and `fullChapters.js` content
- Each chapter includes Loom video URL in `chapters.js` for embedded video playback
- Use atomic commits for content updates: "Add chapter X content", "Fix rendering in section Y"

### Component Patterns
- Follow existing JSX style: `className="btn-primary disabled:opacity-50"`
- Use Tailwind's navy/silver color palette for consistency
- Maintain responsive design patterns already established
- Keep components focused on presentation, business logic in utils/

### State Management
- Progress tracking uses LocalStorage via `storage.ts`
- Chapter progress includes: completion status, sections read, exercises completed, quiz scores
- Points and achievements calculated dynamically from stored progress

### Testing Workflow
1. `npm run dev` - Start development server
2. Navigate through chapters to verify:
   - Content renders correctly with formatting
   - Progress tracking works
   - Exercises and quizzes function
   - AI Coach contextual responses
   - Focus mode toggle
3. `npm run build && npm run preview` - Test production build

**Note**: No automated test suite is configured. Manual testing is the current approach.

## Deployment

### Local Hosting
- Uses PM2 for process management (`ecosystem.config.cjs`)
- Serves on port 3000 with host 0.0.0.0 for sandbox compatibility
- Command: `pm2 start ecosystem.config.cjs`
- Preview mode runs via `npx vite preview --host 0.0.0.0 --port 3000`
- Vite config includes specific allowedHosts for sandbox deployment

### Cloudflare Pages
- Configuration in `wrangler.jsonc`
- Build output in `./dist`
- Uses wrangler pages for deployment and local preview
- Supports nodejs compatibility flags
- Vite config includes allowed hosts for sandbox deployment

## Adaptive Learning Remix Features

### VARK Learning Styles
| Style | Code | Content Adaptation |
|-------|------|-------------------|
| Visual | V | ASCII diagrams, tables, flowcharts, spatial layouts |
| Auditory | A | Conversational tone, discussion prompts, stories |
| Read/Write | R | Definitions, bulleted lists, note templates |
| Kinesthetic | K | Hands-on exercises, "try this now", step-by-step |

### Curriculum Generator
- **Input**: Topic string + options (chapters, difficulty, duration)
- **Output**: `chapters.js` + `fullChapters.js` matching existing schema
- **Cost**: ~$0.50-1.50 per curriculum (user's API key)

### VARK Adapter
- **Input**: Generated `fullChapters.js`
- **Output**: `adaptive-fullChapters.js` with 5 variants per chapter
- **Strategy**: 4-in-1 API call for cost optimization (~$1.50-3.00 per curriculum)

### Frontend Components
- **VARKContext**: Learning style preference state (follows ThemeContext pattern)
- **VARKAssessment**: 12-question assessment (~3 min completion)
- **StyleSelector**: V/A/R/K toggle for manual override
- **AdaptiveContentRenderer**: Renders style-appropriate content with fallback

## Future Enhancements

### Remaining Original Features
- Dark mode toggle (ThemeContext already implemented, needs UI toggle)
- Search across all chapters
- Bookmarking system for sections
- PDF export functionality

### Adaptive Learning Roadmap
- Multiple curriculum support (curriculum switching)
- Progress sync across devices (optional backend)
- Community curriculum sharing
- Additional learning style models (beyond VARK)

## Common Development Tasks

### Adding New Chapter Content
1. Extract content from corresponding DOCX/PDF file in `/content/`
2. Format according to guidelines in `CONTENT_UPDATE_GUIDE.md`
3. Add to `src/data/fullChapters.js` using chapter ID from `chapters.js`
4. Test rendering: `npm run dev` and navigate to the chapter
5. Verify formatting, progress tracking, and AI Coach context

### Debugging Content Issues
- Check console for React rendering errors
- Verify markdown formatting in ChapterContent component
- Ensure chapter IDs match between data files
- Test content with different viewport sizes

### Performance Considerations
- Content is loaded on-demand per chapter
- LocalStorage used for progress persistence
- Consider lazy loading for large content sections
- Monitor bundle size as content grows

## Specification Documents

| Document | Purpose |
|----------|---------|
| `docs/CURRICULUM-STRUCTURE.md` | Generator input/output schemas, markdown rules |
| `docs/VARK-ADAPTATION.md` | Style transformation rules, prompt templates |
| `docs/FRONTEND-COMPONENTS.md` | Component props, state, integration points |
| `docs/IMPLEMENTATION-GUIDE.md` | Step-by-step build order with checkpoints |
| `BLUEPRINT.md` | Phase tracking for ralph-loop implementation |

## Environment Variables

```bash
# Required for curriculum generation
ANTHROPIC_API_KEY=sk-ant-...  # User provides own key
```

---

**Original Project**: Dr. Lutfiya Miller's AI Consulting Playbook
**Remix By**: Matthew Snow / Me, Myself Plus AI LLC
**Framework**: React 19 + Vite 6 + Tailwind CSS 3.4 + Hono
**CLI Stack**: Node.js + Commander + @anthropic-ai/sdk
**License**: MIT (open-source, community contribution)
**Last Updated**: January 2026
**Build Status**: See `BLUEPRINT.md` for current phase