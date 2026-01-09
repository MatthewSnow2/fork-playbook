# VARK Adaptive Learning - Quick Start Guide

**For**: Developers implementing Phase 1
**Status**: Ready to Use
**Last Updated**: 2025-12-28

---

## What You Need to Know (TL;DR)

### The Goal
Add learning style personalization to Playbook so:
- New users take a 12-question VARK assessment
- Content automatically adapts to their learning style (visual, auditory, read/write, kinesthetic)
- AI generates narrations (ElevenLabs), avatar videos (Hedra), and optimized text layouts

### Current Project State
- React 19 + Vite + Tailwind CSS frontend ✓
- Minimal Hono backend ✓
- 15 chapters of AI consulting content ✓
- LocalStorage progress tracking ✓
- **No VARK features yet** (you'll add these)

### What You'll Build (Phase 1: Weeks 1-2)

```
User takes VARK Assessment (12 questions)
         ↓
Scores calculated (Visual, Auditory, Read/Write, Kinesthetic)
         ↓
Profile saved to Context + LocalStorage
         ↓
Dashboard shows personalized recommendations
         ↓
App ready for content variants (Phase 2)
```

---

## Phase 1: Immediate Action Items

### 1. Create VARK Context (manages state)

**File**: `/home/ubuntu/projects/Playbook/src/contexts/VARKContext.jsx`

```javascript
import React, { createContext, useState, useEffect } from 'react';

export const VARKContext = createContext();

export function VARKProvider({ children }) {
  const [varkProfile, setVARKProfile] = useState(null);
  const [adaptationSettings, setAdaptationSettings] = useState({
    enableAuditory: true,
    enableVisual: true,
    readWriteOptimization: true,
    kinestheticActivity: true,
    contentDensity: 'moderate',
    playbackSpeed: 1
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('vark_profile');
    if (saved) {
      setVARKProfile(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage when profile changes
  useEffect(() => {
    if (varkProfile) {
      localStorage.setItem('vark_profile', JSON.stringify(varkProfile));
    }
  }, [varkProfile]);

  return (
    <VARKContext.Provider value={{
      varkProfile,
      setVARKProfile,
      adaptationSettings,
      setAdaptationSettings
    }}>
      {children}
    </VARKContext.Provider>
  );
}
```

**What this does:**
- Provides VARK profile to all child components
- Persists data to localStorage automatically
- Manages adaptation settings (which modalities to show)

### 2. Create VARK Assessment Component

**File**: `/home/ubuntu/projects/Playbook/src/components/VARK/VARKAssessment.jsx`

```javascript
import React, { useState } from 'react';
import { VARKContext } from '../../contexts/VARKContext';
import { calculateVARK } from '../../utils/vark';

export default function VARKAssessment({ onComplete }) {
  const { setVARKProfile } = React.useContext(VARKContext);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  // 12-question assessment
  const questions = [
    {
      id: 0,
      question: "I prefer to learn by:",
      options: [
        { text: "Looking at diagrams and charts", style: "V" },
        { text: "Listening to explanations", style: "A" },
        { text: "Reading detailed text", style: "R" },
        { text: "Doing hands-on practice", style: "K" }
      ]
    },
    // ... 11 more questions (standard VARK assessment)
  ];

  const handleAnswer = (questionId, selectedStyle) => {
    const newAnswers = { ...answers, [questionId]: selectedStyle };
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // All questions answered - calculate scores
      const profile = calculateVARK(newAnswers);
      setVARKProfile(profile);
      onComplete(profile);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">What's Your Learning Style?</h2>
        <p className="text-gray-600">Answer 12 quick questions to personalize your experience</p>
        <div className="mt-4 bg-gray-200 h-2 rounded">
          <div
            className="bg-navy-600 h-2 rounded transition-all"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">
          Question {currentQuestion + 1} of {questions.length}
        </h3>
        <p className="text-lg mb-6">{questions[currentQuestion].question}</p>

        <div className="space-y-3">
          {questions[currentQuestion].options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(currentQuestion, option.style)}
              className="w-full p-4 border-2 border-gray-300 rounded hover:border-navy-500 hover:bg-blue-50 transition-all text-left"
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500 text-center">
        Progress: {currentQuestion + 1}/{questions.length}
      </div>
    </div>
  );
}
```

### 3. Create VARK Calculation Algorithm

**File**: `/home/ubuntu/projects/Playbook/src/utils/vark.ts`

```typescript
export interface VARKProfile {
  visual: number;        // 0-100
  auditory: number;      // 0-100
  readWrite: number;     // 0-100
  kinesthetic: number;   // 0-100
  dominant: string;      // 'visual' | 'auditory' | 'readWrite' | 'kinesthetic' | 'multimodal'
  timestamp: string;
}

export function calculateVARK(answers: Record<number, string>): VARKProfile {
  // Count selections for each style
  const counts = { V: 0, A: 0, R: 0, K: 0 };

  Object.values(answers).forEach(style => {
    counts[style as keyof typeof counts]++;
  });

  // Convert to percentages
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const scores = {
    visual: Math.round((counts.V / total) * 100),
    auditory: Math.round((counts.A / total) * 100),
    readWrite: Math.round((counts.R / total) * 100),
    kinesthetic: Math.round((counts.K / total) * 100)
  };

  // Adjust for rounding errors
  const sum = scores.visual + scores.auditory + scores.readWrite + scores.kinesthetic;
  if (sum !== 100) {
    const diff = 100 - sum;
    scores.visual += diff;
  }

  // Determine dominant style
  const values = Object.values(scores);
  const maxValue = Math.max(...values);
  const dominantCount = values.filter(v => v === maxValue).length;

  let dominant = 'multimodal';
  if (dominantCount === 1) {
    const entries = Object.entries(scores);
    const [style] = entries.find(([_, v]) => v === maxValue)!;
    dominant = style;
  }

  return {
    visual: scores.visual,
    auditory: scores.auditory,
    readWrite: scores.readWrite,
    kinesthetic: scores.kinesthetic,
    dominant,
    timestamp: new Date().toISOString()
  };
}
```

### 4. Update App.jsx (Add VARKProvider)

**File**: `/home/ubuntu/projects/Playbook/src/App.jsx` (Modify top-level)

```javascript
import { VARKProvider } from './contexts/VARKContext';  // ADD THIS

function App() {
  return (
    <VARKProvider>  {/* WRAP EVERYTHING */}
      <ThemeProvider>
        {/* existing code */}
      </ThemeProvider>
    </VARKProvider>
  );
}
```

### 5. Update Dashboard.jsx (Add Assessment Prompt)

**File**: `/home/ubuntu/projects/Playbook/src/components/Dashboard.jsx` (Add this near top)

```javascript
import { VARKContext } from '../contexts/VARKContext';
import VARKAssessment from './VARK/VARKAssessment';

export default function Dashboard({ chapters, onChapterSelect, progress, points }) {
  const { varkProfile, setVARKProfile } = React.useContext(VARKContext);
  const [showAssessment, setShowAssessment] = React.useState(false);

  // Show assessment prompt if no profile
  if (!varkProfile && !showAssessment) {
    return (
      <div className="p-8">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded mb-6">
          <h3 className="text-lg font-bold mb-2">Personalize Your Learning</h3>
          <p className="text-gray-700 mb-4">
            Take a quick learning style quiz to get personalized content recommendations.
          </p>
          <button
            onClick={() => setShowAssessment(true)}
            className="bg-navy-600 text-white px-6 py-2 rounded hover:bg-navy-700"
          >
            Start Assessment (2 min)
          </button>
        </div>
        {/* Show existing dashboard below */}
      </div>
    );
  }

  if (showAssessment) {
    return (
      <VARKAssessment
        onComplete={(profile) => {
          setVARKProfile(profile);
          setShowAssessment(false);
        }}
      />
    );
  }

  // Normal dashboard with existing code
  return (
    <>
      {varkProfile && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500">
          <p className="text-green-700">
            Optimized for your {varkProfile.dominant} learning style
          </p>
        </div>
      )}
      {/* existing dashboard code */}
    </>
  );
}
```

### 6. Write Unit Tests

**File**: `/home/ubuntu/projects/Playbook/src/__tests__/utils/vark.test.ts`

```typescript
import { calculateVARK } from '../../utils/vark';

describe('VARK Calculator', () => {
  test('calculates visual dominance correctly', () => {
    const answers = {
      0: 'V', 1: 'V', 2: 'V', 3: 'A', 4: 'A', 5: 'R',
      6: 'K', 7: 'V', 8: 'V', 9: 'A', 10: 'R', 11: 'K'
    };
    const result = calculateVARK(answers);
    expect(result.visual).toBeGreaterThan(result.auditory);
    expect(result.dominant).toBe('visual');
  });

  test('sums to 100 percent', () => {
    const answers = {
      0: 'V', 1: 'A', 2: 'R', 3: 'K', 4: 'V', 5: 'A',
      6: 'R', 7: 'K', 8: 'V', 9: 'A', 10: 'R', 11: 'K'
    };
    const result = calculateVARK(answers);
    const total = result.visual + result.auditory + result.readWrite + result.kinesthetic;
    expect(total).toBe(100);
  });

  test('identifies multimodal profile', () => {
    const answers = {
      0: 'V', 1: 'A', 2: 'R', 3: 'K', 4: 'V', 5: 'A',
      6: 'R', 7: 'K', 8: 'V', 9: 'A', 10: 'R', 11: 'K'
    };
    const result = calculateVARK(answers);
    expect(result.dominant).toBe('multimodal');
  });
});
```

---

## Testing Locally

### 1. Install & Run
```bash
cd /home/ubuntu/projects/Playbook
npm install
npm run dev
```

### 2. Test the Assessment
- Open http://localhost:3000
- Click "Start Assessment (2 min)" banner
- Answer all 12 questions
- Verify scores display and sum to 100%
- Refresh page - profile should persist

### 3. Run Unit Tests
```bash
npm run test:watch
```

---

## Common Questions

### Q: Where's the 12-question list?
**A**: Use the standard VARK assessment questions. Google "VARK questionnaire" for the official 16-question version, then select 12 balanced questions.

### Q: What if assessment is skipped?
**A**: User can always click the banner again. In Phase 2, we'll add ability to manually enter scores.

### Q: How do we store profiles for logged-in users?
**A**: Phase 1 uses LocalStorage. Phase 3 will sync to backend.

### Q: Is IndexedDB needed in Phase 1?
**A**: No, not yet. Just use LocalStorage for the profile. Phase 4 adds IndexedDB for media files.

### Q: How do I add this to the existing CLAUDE.md?
**A**: The project CLAUDE.md already exists. Update it with Phase 1 progress.

---

## What Comes Next (Phase 2)

Once Phase 1 is done, you'll build:
- `AuditoryContent.jsx` - Audio player UI
- `VisualContent.jsx` - Video player UI
- `ReadWriteContent.jsx` - Text-optimized layouts
- `KinestheticContent.jsx` - Interactive activities

These will use the VARK profile you set up now.

---

## If You Get Stuck

1. **Algorithm not calculating correctly?**
   - Verify V/A/R/K counts are correct
   - Check rounding logic
   - Test with known VARK samples online

2. **Context not persisting?**
   - Check localStorage.getItem('vark_profile') in browser console
   - Verify useEffect dependencies are correct
   - Ensure VARKProvider wraps entire app

3. **Component rendering issues?**
   - Check for console errors (F12)
   - Verify all imports are correct
   - Test with simple hardcoded data first

---

## Success Checklist

Before moving to Phase 2, verify:

- [ ] VARKContext.jsx created and working
- [ ] VARKAssessment.jsx renders and collects answers
- [ ] calculateVARK() algorithm verified against reference
- [ ] Dashboard shows assessment prompt if no profile
- [ ] Profile persists after page refresh
- [ ] All unit tests pass
- [ ] No console errors
- [ ] Code reviewed by peer

---

**Ready to start?** Begin with creating `/src/contexts/VARKContext.jsx` and follow the steps above!

Questions? See the full technical spec at `/home/ubuntu/.claude/plans/vark-implementation-plan.md`
