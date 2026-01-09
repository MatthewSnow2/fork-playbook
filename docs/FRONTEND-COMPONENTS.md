# Frontend Components Specification

## Overview

Three new components enable VARK-based adaptive learning:

1. **VARKAssessment** - Learning style questionnaire
2. **StyleSelector** - Manual style override toggle
3. **AdaptiveContentRenderer** - Style-aware content display

Plus one new context:
4. **VARKContext** - Global VARK preference state

---

## File Structure

```
src/
├── contexts/
│   ├── ThemeContext.jsx         # (existing - pattern to follow)
│   └── VARKContext.jsx          # NEW: VARK preference state
├── components/
│   └── adaptive/
│       ├── VARKAssessment.jsx   # 12-question assessment
│       ├── StyleSelector.jsx    # V/A/R/K toggle buttons
│       └── AdaptiveContentRenderer.jsx
├── data/
│   ├── vark-questions.js        # Assessment questions
│   └── adaptive-fullChapters.js # Generated VARK content
└── utils/
    └── varkHelpers.js           # Scoring utilities
```

---

## Component 1: VARKContext

### Purpose
Manage VARK learning style preference state across the application.

### Location
`src/contexts/VARKContext.jsx`

### Pattern Reference
Follow `src/contexts/ThemeContext.jsx` exactly for consistency.

### Interface

```typescript
interface VARKPreference {
  primaryStyle: 'visual' | 'auditory' | 'readWrite' | 'kinesthetic' | null;
  scores: {
    visual: number;      // 0-12 scale (number of answers)
    auditory: number;
    readWrite: number;
    kinesthetic: number;
  } | null;
  percentages: {
    visual: number;      // 0-100%
    auditory: number;
    readWrite: number;
    kinesthetic: number;
  } | null;
  assessmentCompleted: boolean;
  manualOverride: boolean;  // true if user manually selected style
  completedAt: string | null;  // ISO timestamp
}

interface VARKContextValue {
  preference: VARKPreference;
  setLearningStyle: (style: string) => void;
  completeAssessment: (answers: Record<number, string>) => void;
  resetPreference: () => void;
  isAssessmentModalOpen: boolean;
  openAssessmentModal: () => void;
  closeAssessmentModal: () => void;
}
```

### Implementation

```jsx
// src/contexts/VARKContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateVARKScores, getPrimaryStyle } from '../utils/varkHelpers';

const VARKContext = createContext();

export const useVARK = () => {
  const context = useContext(VARKContext);
  if (!context) {
    throw new Error('useVARK must be used within a VARKProvider');
  }
  return context;
};

const STORAGE_KEY = 'ai_playbook_vark_preference';

const defaultPreference = {
  primaryStyle: null,
  scores: null,
  percentages: null,
  assessmentCompleted: false,
  manualOverride: false,
  completedAt: null
};

export const VARKProvider = ({ children }) => {
  const [preference, setPreference] = useState(defaultPreference);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPreference(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse VARK preference:', e);
      }
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (preference.primaryStyle !== null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
    }
  }, [preference]);

  const setLearningStyle = (style) => {
    setPreference(prev => ({
      ...prev,
      primaryStyle: style,
      manualOverride: true
    }));
  };

  const completeAssessment = (answers) => {
    const { scores, percentages, primaryStyle } = calculateVARKScores(answers);
    setPreference({
      primaryStyle,
      scores,
      percentages,
      assessmentCompleted: true,
      manualOverride: false,
      completedAt: new Date().toISOString()
    });
    setIsAssessmentModalOpen(false);
  };

  const resetPreference = () => {
    setPreference(defaultPreference);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <VARKContext.Provider value={{
      preference,
      setLearningStyle,
      completeAssessment,
      resetPreference,
      isAssessmentModalOpen,
      openAssessmentModal: () => setIsAssessmentModalOpen(true),
      closeAssessmentModal: () => setIsAssessmentModalOpen(false)
    }}>
      {children}
    </VARKContext.Provider>
  );
};

export default VARKContext;
```

### localStorage Schema

```json
{
  "primaryStyle": "visual",
  "scores": {
    "visual": 5,
    "auditory": 3,
    "readWrite": 2,
    "kinesthetic": 2
  },
  "percentages": {
    "visual": 42,
    "auditory": 25,
    "readWrite": 17,
    "kinesthetic": 17
  },
  "assessmentCompleted": true,
  "manualOverride": false,
  "completedAt": "2026-01-09T10:30:00.000Z"
}
```

---

## Component 2: VARKAssessment

### Purpose
12-question assessment to determine user's dominant learning style.

### Location
`src/components/adaptive/VARKAssessment.jsx`

### Props

```typescript
interface VARKAssessmentProps {
  onComplete: (answers: Record<number, string>) => void;
  onSkip?: () => void;
  isModal?: boolean;  // true when shown as modal overlay
}
```

### State

```typescript
interface VARKAssessmentState {
  currentQuestion: number;  // 0-11
  answers: Record<number, string>;  // questionId -> style chosen
  showResults: boolean;
}
```

### UI Requirements

1. **Progress Indicator**: "Question X of 12"
2. **Single Question View**: One question per screen
3. **Four Options**: Radio buttons with style labels
4. **Navigation**: Back button (except Q1), Next button
5. **Skip Option**: Skip assessment with confirmation
6. **Results Display**: Show dominant style with percentage breakdown
7. **Continue Button**: After results, proceed to learning

### Component Structure

```jsx
// src/components/adaptive/VARKAssessment.jsx

import React, { useState } from 'react';
import { varkQuestions, styleDescriptions } from '../../data/vark-questions';
import { calculateVARKScores } from '../../utils/varkHelpers';

const VARKAssessment = ({ onComplete, onSkip, isModal = false }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  const handleAnswer = (style) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: style
    }));
  };

  const handleNext = () => {
    if (currentQuestion < varkQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Calculate and show results
      const calculated = calculateVARKScores(answers);
      setResults(calculated);
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    onComplete(answers);
  };

  const handleSkip = () => {
    if (window.confirm('Skip the assessment? You can take it later from settings.')) {
      onSkip?.();
    }
  };

  // ... render logic
};

export default VARKAssessment;
```

### Styling (Tailwind)

```jsx
// Container
<div className={`${isModal ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50' : ''}`}>
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4">

    {/* Progress */}
    <div className="flex items-center justify-between mb-8">
      <span className="text-sm text-silver-600">Question {currentQuestion + 1} of 12</span>
      <div className="w-48 h-2 bg-silver-200 rounded-full">
        <div
          className="h-full bg-navy-600 rounded-full transition-all"
          style={{ width: `${((currentQuestion + 1) / 12) * 100}%` }}
        />
      </div>
    </div>

    {/* Question */}
    <h2 className="text-xl font-bold text-navy-800 dark:text-white mb-6">
      {varkQuestions[currentQuestion].question}
    </h2>

    {/* Options */}
    <div className="space-y-3">
      {Object.entries(varkQuestions[currentQuestion].options).map(([style, text]) => (
        <button
          key={style}
          onClick={() => handleAnswer(style)}
          className={`w-full p-4 rounded-lg border-2 text-left transition-colors
            ${answers[currentQuestion] === style
              ? 'border-navy-600 bg-navy-50 dark:bg-gray-700'
              : 'border-silver-200 hover:border-navy-300'
            }`}
        >
          {text}
        </button>
      ))}
    </div>

    {/* Navigation */}
    <div className="flex justify-between mt-8">
      <button
        onClick={handleBack}
        disabled={currentQuestion === 0}
        className="px-6 py-2 text-silver-600 disabled:opacity-50"
      >
        Back
      </button>
      <button
        onClick={handleNext}
        disabled={!answers[currentQuestion]}
        className="px-6 py-2 bg-navy-600 text-white rounded-lg disabled:opacity-50"
      >
        {currentQuestion === 11 ? 'See Results' : 'Next'}
      </button>
    </div>

    {/* Skip */}
    <button
      onClick={handleSkip}
      className="w-full mt-4 text-sm text-silver-500 hover:text-silver-700"
    >
      Skip assessment for now
    </button>
  </div>
</div>
```

---

## Component 3: StyleSelector

### Purpose
Toggle between V/A/R/K content variants. Shows current selection and allows switching.

### Location
`src/components/adaptive/StyleSelector.jsx`

### Props

```typescript
interface StyleSelectorProps {
  currentStyle: 'visual' | 'auditory' | 'readWrite' | 'kinesthetic' | null;
  onStyleChange: (style: string) => void;
  showAssessmentPrompt?: boolean;
  onTakeAssessment?: () => void;
  compact?: boolean;  // true for header/inline use
  disabled?: boolean;
}
```

### Style Configuration

```javascript
// In vark-questions.js or inline

export const styleConfig = {
  visual: {
    name: 'Visual',
    icon: 'fa-eye',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500'
  },
  auditory: {
    name: 'Auditory',
    icon: 'fa-headphones',
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-500'
  },
  readWrite: {
    name: 'Read/Write',
    icon: 'fa-book',
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-500'
  },
  kinesthetic: {
    name: 'Kinesthetic',
    icon: 'fa-hand-paper',
    color: 'orange',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-500'
  }
};
```

### Component Structure

```jsx
// src/components/adaptive/StyleSelector.jsx

import React from 'react';
import { styleConfig } from '../../data/vark-questions';

const StyleSelector = ({
  currentStyle,
  onStyleChange,
  showAssessmentPrompt = false,
  onTakeAssessment,
  compact = false,
  disabled = false
}) => {
  const styles = Object.entries(styleConfig);

  if (compact) {
    // Compact: icon buttons only
    return (
      <div className="flex items-center space-x-1">
        {styles.map(([key, config]) => (
          <button
            key={key}
            onClick={() => onStyleChange(key)}
            disabled={disabled}
            className={`p-2 rounded-lg transition-colors ${
              currentStyle === key
                ? `${config.bgColor} ${config.textColor}`
                : 'text-silver-400 hover:text-silver-600'
            }`}
            title={config.name}
          >
            <i className={`fas ${config.icon}`}></i>
          </button>
        ))}
      </div>
    );
  }

  // Full: buttons with labels
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-silver-700 dark:text-silver-300">
          Learning Style
        </span>
        {showAssessmentPrompt && onTakeAssessment && (
          <button
            onClick={onTakeAssessment}
            className="text-sm text-navy-600 hover:underline"
          >
            Take Assessment
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {styles.map(([key, config]) => (
          <button
            key={key}
            onClick={() => onStyleChange(key)}
            disabled={disabled}
            className={`p-3 rounded-lg border-2 transition-colors flex items-center space-x-2 ${
              currentStyle === key
                ? `${config.bgColor} ${config.borderColor}`
                : 'border-silver-200 hover:border-silver-300'
            }`}
          >
            <i className={`fas ${config.icon} ${config.textColor}`}></i>
            <span className={currentStyle === key ? config.textColor : 'text-silver-700'}>
              {config.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StyleSelector;
```

---

## Component 4: AdaptiveContentRenderer

### Purpose
Display chapter content based on user's selected learning style with fallback behavior.

### Location
`src/components/adaptive/AdaptiveContentRenderer.jsx`

### Props

```typescript
interface AdaptiveContentRendererProps {
  chapterId: number;
  sectionIndex: number;
  style: 'visual' | 'auditory' | 'readWrite' | 'kinesthetic' | null;
  fallbackContent?: string;  // Original content if adaptive not available
}
```

### Component Structure

```jsx
// src/components/adaptive/AdaptiveContentRenderer.jsx

import React from 'react';
import ChapterContent from '../ChapterContent';
import { adaptiveFullChapterContent } from '../../data/adaptive-fullChapters';
import { fullChapterContent } from '../../data/fullChapters';
import { styleConfig } from '../../data/vark-questions';

const AdaptiveContentRenderer = ({
  chapterId,
  sectionIndex,
  style,
  fallbackContent
}) => {
  // Get content based on style
  const getContent = () => {
    // If no style selected, use default/original
    if (!style) {
      return {
        content: fullChapterContent[chapterId]?.sections?.[sectionIndex]?.content || fallbackContent,
        isAdaptive: false,
        styleUsed: null
      };
    }

    // Try to get adaptive content for selected style
    const adaptiveChapter = adaptiveFullChapterContent?.[chapterId];
    const adaptiveSection = adaptiveChapter?.[style]?.sections?.[sectionIndex];

    if (adaptiveSection?.content) {
      return {
        content: adaptiveSection.content,
        isAdaptive: true,
        styleUsed: style
      };
    }

    // Fallback to default/original
    return {
      content: fullChapterContent[chapterId]?.sections?.[sectionIndex]?.content || fallbackContent,
      isAdaptive: false,
      styleUsed: null
    };
  };

  const { content, isAdaptive, styleUsed } = getContent();

  if (!content) {
    return (
      <div className="text-silver-500 italic p-4">
        Content not available for this section.
      </div>
    );
  }

  return (
    <div className="adaptive-content">
      {/* Style indicator badge */}
      {isAdaptive && styleUsed && (
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm mb-4 ${styleConfig[styleUsed].bgColor}`}>
          <i className={`fas ${styleConfig[styleUsed].icon} mr-2 ${styleConfig[styleUsed].textColor}`}></i>
          <span className={styleConfig[styleUsed].textColor}>
            {styleConfig[styleUsed].name} Mode
          </span>
        </div>
      )}

      {/* Fallback notice */}
      {!isAdaptive && style && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm flex items-center">
          <i className="fas fa-info-circle text-yellow-600 mr-2"></i>
          <span className="text-yellow-800 dark:text-yellow-200">
            {styleConfig[style].name} content not available. Showing standard content.
          </span>
        </div>
      )}

      {/* Render content using existing ChapterContent */}
      <ChapterContent content={content} />
    </div>
  );
};

export default AdaptiveContentRenderer;
```

---

## Data Files

### vark-questions.js

```javascript
// src/data/vark-questions.js

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
```

### varkHelpers.js

```javascript
// src/utils/varkHelpers.js

/**
 * Calculate VARK scores from assessment answers
 * @param {Record<number, string>} answers - Map of questionId to style
 * @returns {{ scores, percentages, primaryStyle }}
 */
export const calculateVARKScores = (answers) => {
  const scores = {
    visual: 0,
    auditory: 0,
    readWrite: 0,
    kinesthetic: 0
  };

  // Count answers for each style
  Object.values(answers).forEach(style => {
    if (scores.hasOwnProperty(style)) {
      scores[style]++;
    }
  });

  const total = Object.values(scores).reduce((sum, val) => sum + val, 0);

  // Calculate percentages
  const percentages = {
    visual: total > 0 ? Math.round((scores.visual / total) * 100) : 0,
    auditory: total > 0 ? Math.round((scores.auditory / total) * 100) : 0,
    readWrite: total > 0 ? Math.round((scores.readWrite / total) * 100) : 0,
    kinesthetic: total > 0 ? Math.round((scores.kinesthetic / total) * 100) : 0
  };

  // Find primary style (highest score)
  const primaryStyle = Object.entries(scores).reduce((max, [style, score]) =>
    score > scores[max] ? style : max
  , 'visual');

  return { scores, percentages, primaryStyle };
};

/**
 * Get style from localStorage
 * @returns {VARKPreference | null}
 */
export const getStoredVARKPreference = () => {
  try {
    const stored = localStorage.getItem('ai_playbook_vark_preference');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Check if user has completed VARK assessment
 * @returns {boolean}
 */
export const hasCompletedVARK = () => {
  const pref = getStoredVARKPreference();
  return pref?.assessmentCompleted === true;
};
```

---

## Integration Points

### App.jsx Modifications

```jsx
// src/App.jsx

import { VARKProvider } from './contexts/VARKContext';
import VARKAssessmentModal from './components/adaptive/VARKAssessmentModal';

function App() {
  return (
    <ThemeProvider>
      <VARKProvider>
        <div className="app">
          {/* Existing app content */}
          <Navigation />
          <main>
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'chapter' && <ChapterView />}
          </main>

          {/* VARK Assessment Modal */}
          <VARKAssessmentModal />
        </div>
      </VARKProvider>
    </ThemeProvider>
  );
}
```

### ChapterView.jsx Modifications

```jsx
// Add to ChapterView.jsx

import { useVARK } from '../contexts/VARKContext';
import StyleSelector from './adaptive/StyleSelector';
import AdaptiveContentRenderer from './adaptive/AdaptiveContentRenderer';

// Inside ChapterView component:
const { preference, setLearningStyle, openAssessmentModal } = useVARK();

// In the section content area:
<div className="chapter-section-content bg-white dark:bg-gray-800 rounded-lg p-8 border">
  {/* Style Selector - compact in section header */}
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-xl font-bold">{currentSectionTitle}</h3>
    <StyleSelector
      currentStyle={preference.primaryStyle}
      onStyleChange={setLearningStyle}
      showAssessmentPrompt={!preference.assessmentCompleted}
      onTakeAssessment={openAssessmentModal}
      compact={true}
    />
  </div>

  {/* Adaptive Content */}
  <AdaptiveContentRenderer
    chapterId={chapter.id}
    sectionIndex={currentSection}
    style={preference.primaryStyle}
  />
</div>
```

### Navigation.jsx Modifications

```jsx
// Add VARK style indicator to navigation

import { useVARK } from '../contexts/VARKContext';
import { styleConfig } from '../data/vark-questions';

// Inside Navigation component:
const { preference, openAssessmentModal } = useVARK();

// Add after theme toggle:
<button
  onClick={openAssessmentModal}
  className="px-3 py-1 rounded-lg bg-navy-700 hover:bg-navy-600 transition-colors flex items-center space-x-2"
  title="Learning Style Settings"
>
  <i className={`fas ${preference.primaryStyle ? styleConfig[preference.primaryStyle].icon : 'fa-brain'}`}></i>
  <span className="text-sm hidden md:inline">
    {preference.primaryStyle ? styleConfig[preference.primaryStyle].name : 'Set Style'}
  </span>
</button>
```

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW USER FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User opens app                                                  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────┐                       │
│  │ Dashboard with subtle prompt:        │                       │
│  │ "Personalize your learning!"         │                       │
│  │ [Take 2-min Assessment] [Skip]       │                       │
│  └──────────────────────────────────────┘                       │
│         │                    │                                   │
│    Takes Assessment      Skips (default: readWrite)             │
│         │                    │                                   │
│         ▼                    │                                   │
│    12 questions              │                                   │
│    (~2 minutes)              │                                   │
│         │                    │                                   │
│         ▼                    │                                   │
│    Results shown             │                                   │
│    (dominant style + %)      │                                   │
│         │                    │                                   │
│         └────────┬───────────┘                                   │
│                  ▼                                               │
│         Learning with                                            │
│         adaptive content                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 CHAPTER VIEW FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────┐                       │
│  │ Chapter Header                        │                       │
│  ├──────────────────────────────────────┤                       │
│  │ Section: "Understanding ML"           │                       │
│  │ Style: [V] [A] [R] [K]    ← compact  │                       │
│  ├──────────────────────────────────────┤                       │
│  │ [Visual Mode Badge]                   │                       │
│  │                                       │                       │
│  │   ADAPTIVE CONTENT                    │                       │
│  │   - Diagrams for Visual              │                       │
│  │   - Stories for Auditory             │                       │
│  │   - Lists for Read/Write             │                       │
│  │   - Exercises for Kinesthetic        │                       │
│  │                                       │                       │
│  └──────────────────────────────────────┘                       │
│                                                                  │
│  Click style → Content re-renders immediately                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### VARKContext
- [ ] Loads preference from localStorage on mount
- [ ] Saves preference to localStorage on change
- [ ] Provides setLearningStyle for manual override
- [ ] Provides completeAssessment for saving results
- [ ] Modal open/close state managed

### VARKAssessment
- [ ] Shows 12 questions, one at a time
- [ ] Progress indicator updates correctly
- [ ] Back/Next navigation works
- [ ] Cannot proceed without selecting answer
- [ ] Shows results with percentages after completion
- [ ] Calls onComplete with answers
- [ ] Skip option with confirmation

### StyleSelector
- [ ] Shows 4 style options with icons
- [ ] Highlights current selection
- [ ] Compact mode shows icons only
- [ ] Calls onStyleChange when clicked
- [ ] Shows "Take Assessment" link when appropriate

### AdaptiveContentRenderer
- [ ] Loads adaptive content for selected style
- [ ] Falls back to default when variant missing
- [ ] Shows style badge when adaptive content loaded
- [ ] Shows fallback notice when using original
- [ ] Renders content through ChapterContent component
