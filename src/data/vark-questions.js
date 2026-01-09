/**
 * VARK Learning Style Assessment Questions
 *
 * 12 questions designed to identify the user's dominant learning style:
 * - Visual: Learn through diagrams, charts, and visual representations
 * - Auditory: Learn through listening and discussion
 * - Read/Write: Learn through detailed text and note-taking
 * - Kinesthetic: Learn through hands-on practice
 */

export const varkQuestions = [
  {
    id: 1,
    question: "When learning how to use new software, I prefer to:",
    options: {
      visual: "Watch a video tutorial with demonstrations",
      auditory: "Listen to someone explain how it works",
      readWrite: "Read the documentation or user manual",
      kinesthetic: "Jump in and figure it out by trying things"
    }
  },
  {
    id: 2,
    question: "When giving directions to someone, I would:",
    options: {
      visual: "Draw a map or show them on my phone",
      auditory: "Tell them verbally using landmarks",
      readWrite: "Write out step-by-step instructions",
      kinesthetic: "Walk with them or gesture the route"
    }
  },
  {
    id: 3,
    question: "When studying for an important exam, I prefer to:",
    options: {
      visual: "Use diagrams, charts, and color-coded notes",
      auditory: "Discuss topics with others or listen to recordings",
      readWrite: "Read and rewrite my notes multiple times",
      kinesthetic: "Practice with hands-on examples or role-play"
    }
  },
  {
    id: 4,
    question: "When I need to remember something, I:",
    options: {
      visual: "Picture it in my mind or see the page it was on",
      auditory: "Repeat it aloud or hear it in my head",
      readWrite: "Write it down, even if I never look at it again",
      kinesthetic: "Associate it with a physical action or place"
    }
  },
  {
    id: 5,
    question: "When explaining a complex concept to a colleague, I:",
    options: {
      visual: "Draw diagrams or use visual frameworks",
      auditory: "Talk through it with stories and analogies",
      readWrite: "Provide detailed written documentation",
      kinesthetic: "Walk them through a hands-on example"
    }
  },
  {
    id: 6,
    question: "When choosing a book or article, I prefer ones with:",
    options: {
      visual: "Charts, images, and infographics",
      auditory: "Strong narrative voice and dialogue",
      readWrite: "Detailed explanations and comprehensive text",
      kinesthetic: "Practical exercises and real-world examples"
    }
  },
  {
    id: 7,
    question: "When attending a presentation, I engage most when:",
    options: {
      visual: "There are clear slides with diagrams",
      auditory: "The speaker tells compelling stories",
      readWrite: "I can take detailed notes",
      kinesthetic: "There are interactive activities or demos"
    }
  },
  {
    id: 8,
    question: "When solving a problem, I usually:",
    options: {
      visual: "Sketch out the problem visually first",
      auditory: "Talk it through with someone",
      readWrite: "Make a list of options and pros/cons",
      kinesthetic: "Try different solutions until one works"
    }
  },
  {
    id: 9,
    question: "When I want to relax and learn something new, I:",
    options: {
      visual: "Watch documentaries or educational videos",
      auditory: "Listen to podcasts or audiobooks",
      readWrite: "Read articles, books, or blogs",
      kinesthetic: "Take a class or workshop with hands-on activities"
    }
  },
  {
    id: 10,
    question: "When evaluating a new tool or service, I prefer:",
    options: {
      visual: "Demo videos or screenshots",
      auditory: "Talking to someone who has used it",
      readWrite: "Reading reviews and documentation",
      kinesthetic: "Trying it myself with a free trial"
    }
  },
  {
    id: 11,
    question: "When preparing for a client meeting, I focus on:",
    options: {
      visual: "Creating compelling slides with visuals",
      auditory: "Rehearsing what I'll say and how",
      readWrite: "Writing detailed talking points and handouts",
      kinesthetic: "Planning interactive exercises or demos"
    }
  },
  {
    id: 12,
    question: "When something isn't working, I:",
    options: {
      visual: "Look for visual error indicators or diagrams",
      auditory: "Ask someone or search for verbal explanations",
      readWrite: "Read error messages and search documentation",
      kinesthetic: "Try different approaches until it works"
    }
  }
];

/**
 * Style configuration with colors, icons, and descriptions
 */
export const styleConfig = {
  visual: {
    name: 'Visual',
    icon: 'fa-eye',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500',
    description: 'You learn best through diagrams, charts, and visual representations.',
    tips: [
      'Pay attention to flowcharts and diagrams',
      'Create mind maps as you learn',
      'Use color-coding in your notes'
    ]
  },
  auditory: {
    name: 'Auditory',
    icon: 'fa-headphones',
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-500',
    description: 'You learn best through listening and discussion.',
    tips: [
      'Read content aloud to yourself',
      'Discuss concepts with peers',
      'Record yourself summarizing key points'
    ]
  },
  readWrite: {
    name: 'Read/Write',
    icon: 'fa-book',
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-500',
    description: 'You learn best through detailed text and note-taking.',
    tips: [
      'Take detailed notes as you read',
      'Rewrite concepts in your own words',
      'Create written summaries'
    ]
  },
  kinesthetic: {
    name: 'Kinesthetic',
    icon: 'fa-hand-paper',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-500',
    description: 'You learn best through hands-on practice.',
    tips: [
      'Complete exercises before moving on',
      'Apply concepts to real situations immediately',
      'Create physical anchors for key concepts'
    ]
  }
};

/**
 * Get style display name
 */
export const getStyleName = (style) => {
  return styleConfig[style]?.name || style;
};

/**
 * Get all style keys
 */
export const styleKeys = Object.keys(styleConfig);

export default {
  varkQuestions,
  styleConfig,
  getStyleName,
  styleKeys
};
