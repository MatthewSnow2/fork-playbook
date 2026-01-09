# Curriculum Generator Specification

## Purpose

This document specifies the exact input/output formats for the AI curriculum generator CLI tool. The generator creates complete learning curricula from topic descriptions, outputting JSON that matches the existing Playbook data structures.

---

## Command Interface

### Syntax
```bash
node cli/index.js generate-curriculum "<topic>" [options]
```

### Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--chapters, -c` | number | 10 | Number of chapters to generate |
| `--difficulty, -d` | string | "intermediate" | beginner, intermediate, advanced |
| `--duration` | number | 45 | Average chapter duration in minutes |
| `--output, -o` | string | "./generated" | Output directory |
| `--dry-run` | boolean | false | Estimate tokens/cost without generating |
| `--format` | string | "js" | Output format (js or json) |

### Examples
```bash
# Basic usage
node cli/index.js generate-curriculum "Introduction to Machine Learning"

# With options
node cli/index.js generate-curriculum "React Development" -c 8 -d beginner

# Dry run for cost estimate
node cli/index.js generate-curriculum "Data Science Fundamentals" --dry-run
```

---

## Output Schemas

### File 1: chapters.js (Metadata)

Must match existing `src/data/chapters.js` structure exactly.

```typescript
interface Chapter {
  id: number;                    // Sequential: 1, 2, 3...
  number: string;                // Zero-padded: "01", "02", "03"...
  title: string;                 // Main chapter title
  subtitle: string;              // Chapter tagline
  icon: string;                  // FontAwesome class: "fa-compass"
  color: string;                 // Tailwind gradient: "from-navy-700 to-navy-500"
  duration: string;              // Format: "45 min"
  videoUrl?: string;             // Optional Loom URL (empty for generated)
  keyTakeaways: string[];        // 3-5 bullet points
  overview: string;              // 1-2 sentence chapter summary
  sections: SectionBrief[];      // Section titles with brief descriptions
  exercises: Exercise[];         // 1-3 exercises per chapter
  quiz: QuizQuestion[];          // 3-5 questions per chapter
  reflection: string;            // Reflective question
}

interface SectionBrief {
  title: string;                 // Section title
  content: string;               // 1-2 sentence description
}

interface Exercise {
  type: string;                  // See valid types below
  title: string;                 // Exercise name
  description: string;           // What the learner will do
  points: number;                // 100-250 range
}

interface QuizQuestion {
  question: string;              // The question text
  options: string[];             // Exactly 4 answer choices
  correct: number;               // 0-indexed correct answer (0-3)
  explanation: string;           // Why the answer is correct
}
```

### Valid Exercise Types
```javascript
const exerciseTypes = [
  "assessment",    // Evaluate understanding
  "writing",       // Written response
  "practical",     // Hands-on application
  "roleplay",      // Scenario-based practice
  "template",      // Fill-in framework
  "analysis",      // Evaluate case study
  "design",        // Create something
  "timed",         // Time-boxed challenge
  "presentation",  // Present/explain concept
  "strategy"       // Develop a plan
];
```

### File 2: fullChapters.js (Content)

Must match existing `src/data/fullChapters.js` structure.

```typescript
interface FullChapterContent {
  [chapterId: number]: {
    sections: ContentSection[];
  }
}

interface ContentSection {
  title: string;                 // Must match section title from chapters.js
  content: string;               // Full markdown-formatted content (500-1500 words)
}
```

---

## Markdown Formatting Rules

The `ChapterContent.jsx` component renders these formats. Generated content MUST use only these patterns.

### Block Elements

| Syntax | Example | Renders As |
|--------|---------|------------|
| `###` | `### Section Header` | h3 heading |
| `##` | `## Major Header` | h2 heading |
| `---` | `---` | Horizontal rule |
| `- item` | `- Bullet point` | Unordered list |
| `- [ ] task` | `- [ ] Checkbox` | Checklist item |
| `\| table \|` | `\| Col1 \| Col2 \|` | Data table |
| `*"quote"` | `*"Block quote text"` | Styled blockquote |

### Inline Formatting

| Syntax | Example | Renders As |
|--------|---------|------------|
| `**text**` | `**bold**` | Bold text |
| `*text*` | `*italic*` | Italic text |
| `` `code` `` | `` `inline code` `` | Inline code |
| `"text"` | `"quoted"` | Quoted emphasis |

### Emoji Callouts

Lines starting with these emojis get special callout box styling:

| Emoji | Use Case |
|-------|----------|
| 🎓 | Learning points, educational insights |
| 🔧 | Practical tips, technical advice |
| 🚀 | Action items, next steps |
| ⚠️ | Warnings, important notes |
| 💎 | Key insights, gems of wisdom |
| 📋 | Checklists, summaries |
| ✅ | Confirmations, success criteria |

### Example Content Block
```javascript
{
  title: "The Four Readiness Checkpoints",
  content: `Before implementing AI, assess these four areas:

### 💎 Core Principle

**Readiness must be earned, not assumed.**

---

### The Four Checkpoints

**1. Processes**
Are workflows documented? Most companies run on "tribal knowledge."

**2. Data**
- Is data clean and accessible?
- Do they have a data dictionary?

**3. Buy-in**
- [ ] C-suite sponsor identified
- [ ] Budget allocated
- [ ] Timeline approved

**4. Systems**
Have they automated before? Experience with APIs?

---

⚠️ If they fail 2+ checkpoints, they need **Tier 2 (Prep)** work.

| Checkpoint | Pass Criteria | Red Flag |
|------------|---------------|----------|
| Processes | Documented SOPs | "We just know how" |
| Data | Clean, accessible | Scattered Excel files |
| Buy-in | Executive sponsor | "IT will handle it" |
| Systems | Prior automation | No integrations |`
}
```

---

## Generation Requirements

### Per Chapter Requirements

| Element | Requirements |
|---------|-------------|
| Title | Clear, action-oriented (e.g., "Mastering X" not just "X") |
| Subtitle | Memorable tagline or value proposition |
| Sections | 4-7 sections, each 500-1500 words |
| Exercises | 1-3 practical activities with clear deliverables |
| Quiz | 3-5 questions testing key concepts |
| Reflection | Open-ended question for personalization |

### Content Quality Standards

1. **Audience**: Written for adult professional learners
2. **Tone**: Conversational but authoritative
3. **Balance**: Mix of theory and practical application
4. **Examples**: Include specific, real-world case studies
5. **Actionable**: Every section should have takeaways

### Icon Assignment

Use appropriate FontAwesome icons based on chapter content:

| Topic Type | Icon |
|------------|------|
| Introduction/Overview | `fa-compass` |
| Skills/Techniques | `fa-tools` |
| Communication | `fa-comments` |
| Strategy | `fa-chess` |
| Analysis | `fa-microscope` |
| Design | `fa-pencil-alt` |
| Implementation | `fa-cogs` |
| Testing/Review | `fa-check-circle` |
| Advanced/Expert | `fa-brain` |
| Conclusion | `fa-flag-checkered` |
| Data | `fa-database` |
| Security | `fa-shield-alt` |
| Performance | `fa-tachometer-alt` |
| Collaboration | `fa-users` |

### Color Assignment

Cycle through these Tailwind gradient pairs:

```javascript
const colorPalette = [
  "from-navy-700 to-navy-500",
  "from-navy-600 to-navy-400",
  "from-red-600 to-red-400",
  "from-green-600 to-green-400",
  "from-purple-600 to-purple-400",
  "from-blue-600 to-blue-400",
  "from-indigo-600 to-indigo-400",
  "from-orange-600 to-orange-400",
  "from-teal-600 to-teal-400",
  "from-pink-600 to-pink-400",
  "from-yellow-600 to-yellow-400"
];
```

---

## Prompt Template

### System Prompt
```
You are an expert curriculum designer specializing in creating engaging, practical learning content. You transform any topic into a structured curriculum following a specific JSON schema.

Your content must:
1. Be practical and actionable, not theoretical
2. Include real-world examples and case studies
3. Progress from fundamentals to advanced concepts
4. Use markdown formatting compatible with the renderer:
   - Headers: ### for h3, ## for h2
   - Bold: **text**
   - Lists: - item (with space after dash)
   - Tables: | Header 1 | Header 2 |
   - Blockquotes: *"quoted text"
   - Emoji callouts: 🎯 💡 ⚠️ ✅

Generate EXACTLY the number of chapters requested, fully populated.
```

### User Prompt Template
```
Create a comprehensive curriculum for: "${topic}"

Target Audience: ${audience || "Professionals building practical skills"}
Number of Chapters: ${chapters}
Difficulty: ${difficulty}
Average Chapter Duration: ${duration} minutes

For EACH chapter, provide:

1. **chaptersData entry** with all required fields:
   - id, number, title, subtitle
   - icon (FontAwesome class), color (Tailwind gradient)
   - duration, keyTakeaways (4-5), overview
   - sections (4-7 with title and brief content description)
   - exercises (1-3 with type, title, description, points)
   - quiz (3-5 questions with 4 options each)
   - reflection

2. **fullChapterContent entry** with complete section content:
   - Each section 500-1500 words
   - Use markdown formatting
   - Include practical examples

Respond with valid JSON:
{
  "chaptersData": [...],
  "fullChapterContent": {...}
}
```

---

## Validation Checklist

Before accepting generated output, validate:

### Structure
- [ ] Valid JSON (parseable)
- [ ] All required fields present
- [ ] IDs are sequential integers starting from 1
- [ ] Number strings are zero-padded ("01", "02")

### Metadata
- [ ] Icons are valid FontAwesome classes (fa-*)
- [ ] Colors are valid Tailwind gradient classes
- [ ] Duration follows "XX min" format
- [ ] keyTakeaways has 3-5 items

### Content
- [ ] Each chapter has 4-7 sections
- [ ] Section content is 500-1500 words
- [ ] Exercises have valid types
- [ ] Quiz questions have exactly 4 options
- [ ] Quiz correct answer is 0-3

### Formatting
- [ ] Markdown syntax is valid
- [ ] No unsupported syntax (no HTML, no code blocks beyond inline)
- [ ] Emoji callouts properly formatted
- [ ] Tables have consistent columns

---

## Example Output

### chapters.js (excerpt)
```javascript
export const chaptersData = [
  {
    id: 1,
    number: "01",
    title: "Introduction to Machine Learning",
    subtitle: "From Confusion to Clarity",
    icon: "fa-compass",
    color: "from-navy-700 to-navy-500",
    duration: "45 min",
    keyTakeaways: [
      "Understanding the three types of machine learning",
      "When ML is the right tool vs. when it's overkill",
      "The data foundation required for success",
      "Building your first mental model of ML"
    ],
    overview: "Master the fundamental concepts of machine learning by understanding what it actually is, when to use it, and how to think about problems through an ML lens.",
    sections: [
      {
        title: "What Machine Learning Actually Is",
        content: "Learn the simple definition that cuts through the hype."
      },
      {
        title: "The Three Flavors of ML",
        content: "Understand supervised, unsupervised, and reinforcement learning."
      },
      {
        title: "When to Use Machine Learning",
        content: "Identify the right problems for ML solutions."
      },
      {
        title: "The Data Foundation",
        content: "Understand data requirements for successful ML projects."
      }
    ],
    exercises: [
      {
        type: "assessment",
        title: "ML Problem Identifier",
        description: "Analyze 5 business scenarios and determine if ML is the right solution",
        points: 100
      }
    ],
    quiz: [
      {
        question: "Which type of ML learns from labeled examples?",
        options: [
          "Supervised Learning",
          "Unsupervised Learning",
          "Reinforcement Learning",
          "Transfer Learning"
        ],
        correct: 0,
        explanation: "Supervised learning uses labeled training data where correct answers are provided."
      }
    ],
    reflection: "Think about a problem in your work that might benefit from machine learning. What data would you need?"
  }
];
```

### fullChapters.js (excerpt)
```javascript
export const fullChapterContent = {
  1: {
    sections: [
      {
        title: "What Machine Learning Actually Is",
        content: `Let's cut through the hype and get to the core of what machine learning actually is.

### 💎 The Simple Definition

**Machine learning is pattern recognition at scale.**

That's it. At its core, ML is about finding patterns in data that humans either:
- Can't see (too much data)
- Don't have time to find (too slow)
- Would be inconsistent at finding (too variable)

### Why This Matters

When you strip away the buzzwords, you're left with a simple question: "Do I have patterns in my data that, if found, would create value?"

---

### The Pattern Recognition Framework

Think about how you learn to recognize spam emails:

1. **You see examples** - Hundreds of spam vs. legitimate emails
2. **You notice patterns** - Certain words, formatting, sender types
3. **You apply rules** - New email comes in, you classify it

Machine learning does the same thing, just faster and with more data.

⚠️ **Key Insight**: If there's no pattern, ML can't help. If the pattern is obvious, you don't need ML.

---

| Human Learning | Machine Learning |
|----------------|------------------|
| Dozens of examples | Thousands to millions |
| Intuitive rules | Mathematical functions |
| Slow to update | Fast to retrain |
| Biased by experience | Biased by data |

🎓 **Takeaway**: ML is not magic. It's pattern recognition automated and scaled.`
      }
    ]
  }
};
```

---

## Cost Estimation

Approximate token usage for curriculum generation:

| Component | Input Tokens | Output Tokens |
|-----------|--------------|---------------|
| System prompt | ~500 | - |
| User prompt per chapter | ~200 | - |
| Chapter metadata | - | ~500 |
| Chapter content (5 sections) | - | ~3000 |
| **Total per chapter** | ~700 | ~3500 |

**Cost estimate** (Claude 3.5 Sonnet):
- Per chapter: ~$0.05-0.15
- 10-chapter curriculum: ~$0.50-1.50

---

## Error Handling

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid JSON | Markdown in response | Strip code fences before parsing |
| Missing fields | Incomplete generation | Retry with explicit field list |
| Wrong schema | Model confusion | Provide example in prompt |
| Token limit | Chapter too long | Generate sections separately |

### Retry Strategy
```javascript
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000];

// Retry on: rate limit (429), server error (5xx), JSON parse error
```

---

## Output Files

Generated files saved to output directory:

```
./generated/
├── chapters.js          # Chapter metadata (chaptersData array)
├── fullChapters.js      # Full content (fullChapterContent object)
├── metadata.json        # Generation info (topic, date, cost, etc.)
└── validation.log       # Schema validation results
```
