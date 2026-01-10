import React, { useState, useCallback, useRef } from 'react';
import { useCurriculum } from '../../contexts/CurriculumContext';
import {
  sendMessageForJSON,
  estimateCurriculumCost,
  ErrorType
} from '../../utils/anthropicClient';
import GenerationProgress from './GenerationProgress';

// Prompts ported from CLI
const OUTLINE_SYSTEM_PROMPT = `You are an expert curriculum designer. Generate a curriculum outline with chapter metadata. Output valid JSON only.`;

const CONTENT_SYSTEM_PROMPT = `You are an expert educational content writer. Generate detailed section content for a chapter. Each section should be 200-400 words with practical examples. Use markdown formatting. Output valid JSON only.`;

function buildOutlinePrompt({ topic, chapters, difficulty, duration }) {
  return `Create a curriculum OUTLINE for: "${topic}"

Target Audience: Professionals building practical skills
Number of Chapters: ${chapters}
Difficulty: ${difficulty}
Duration: ${duration} min/chapter

Generate chapter metadata ONLY (no full content). For each chapter provide:
- id, number (zero-padded), title, subtitle
- icon (FontAwesome), color (Tailwind gradient)
- duration, keyTakeaways (4 items), overview
- sections (4-5 objects with title and brief 1-sentence content description)
- exercises (1-2 with type, title, description, points 100-200)
- quiz (3-4 questions with question, 4 options, correct 0-3, explanation)
- reflection

ICONS: fa-compass, fa-tools, fa-comments, fa-chess, fa-microscope, fa-cogs, fa-check-circle, fa-brain, fa-flag-checkered
COLORS: from-navy-700 to-navy-500, from-blue-600 to-blue-400, from-green-600 to-green-400, from-purple-600 to-purple-400, from-teal-600 to-teal-400
EXERCISE TYPES: practical, assessment, writing, analysis, design

JSON structure:
{
  "chaptersData": [
    {
      "id": 1, "number": "01", "title": "...", "subtitle": "...",
      "icon": "fa-compass", "color": "from-navy-700 to-navy-500",
      "duration": "${duration} min",
      "keyTakeaways": ["...", "...", "...", "..."],
      "overview": "...",
      "sections": [{"title": "...", "content": "Brief description"}],
      "exercises": [{"type": "practical", "title": "...", "description": "...", "points": 100}],
      "quiz": [{"question": "?", "options": ["A","B","C","D"], "correct": 0, "explanation": "..."}],
      "reflection": "?"
    }
  ]
}`;
}

function buildContentPrompt(chapterMetadata) {
  return `Generate full content for Chapter ${chapterMetadata.id}: "${chapterMetadata.title}"

Chapter overview: ${chapterMetadata.overview}

Generate detailed content for these ${chapterMetadata.sections.length} sections:
${chapterMetadata.sections.map((s, i) => `${i + 1}. "${s.title}" - ${s.content}`).join('\n')}

REQUIREMENTS:
- Each section: 200-400 words (concise but complete)
- Use markdown: ###, **, *, -, tables, emoji callouts (🎓 💡 ⚠️ ✅ 🔧 💎)
- Include practical examples
- Build on previous sections

JSON structure:
{
  "sections": [
    {"title": "Exact title from above", "content": "Full markdown content..."},
    ...
  ]
}`;
}

/**
 * Curriculum Generation Wizard component
 */
const GenerationWizard = ({ onComplete, onCancel }) => {
  const { apiKey, addCurriculum, switchCurriculum } = useCurriculum();

  // Form state
  const [topic, setTopic] = useState('');
  const [chapters, setChapters] = useState(5);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [duration, setDuration] = useState(45);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({
    phase: null,
    currentChapter: 0,
    totalChapters: 0,
    message: ''
  });
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Abort controller for cancellation
  const abortControllerRef = useRef(null);

  // Cost estimate
  const costEstimate = estimateCurriculumCost(chapters);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim() || !apiKey) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    abortControllerRef.current = new AbortController();

    const options = { topic, chapters, difficulty, duration };

    try {
      // Phase 1: Generate outline
      setProgress({
        phase: 'outline',
        currentChapter: 0,
        totalChapters: chapters,
        message: 'Generating curriculum outline...'
      });

      const outlineData = await sendMessageForJSON({
        apiKey,
        systemPrompt: OUTLINE_SYSTEM_PROMPT,
        userPrompt: buildOutlinePrompt(options),
        signal: abortControllerRef.current.signal,
        onRetry: ({ attempt, delay }) => {
          setProgress(prev => ({
            ...prev,
            message: `Retry attempt ${attempt}... waiting ${delay / 1000}s`
          }));
        }
      });

      if (!outlineData.chaptersData || !Array.isArray(outlineData.chaptersData)) {
        throw new Error('Invalid outline response: missing chaptersData');
      }

      const chaptersData = outlineData.chaptersData;
      const fullChapterContent = {};

      // Phase 2: Generate content for each chapter
      for (let i = 0; i < chaptersData.length; i++) {
        const chapter = chaptersData[i];

        setProgress({
          phase: 'content',
          currentChapter: i + 1,
          totalChapters: chaptersData.length,
          message: `Generating content for "${chapter.title}"...`
        });

        try {
          const contentData = await sendMessageForJSON({
            apiKey,
            systemPrompt: CONTENT_SYSTEM_PROMPT,
            userPrompt: buildContentPrompt(chapter),
            signal: abortControllerRef.current.signal,
            onRetry: ({ attempt, delay }) => {
              setProgress(prev => ({
                ...prev,
                message: `Retry ${attempt} for "${chapter.title}"...`
              }));
            }
          });

          fullChapterContent[chapter.id] = {
            sections: contentData.sections || []
          };
        } catch (chapterError) {
          // Use placeholder content on chapter failure
          console.error(`Failed to generate chapter ${i + 1}:`, chapterError);
          fullChapterContent[chapter.id] = {
            sections: chapter.sections.map(s => ({
              title: s.title,
              content: `*Content generation failed for this section. Please regenerate.*\n\n${s.content}`
            }))
          };
        }
      }

      // Save the curriculum
      const { id, metadata } = await addCurriculum({
        name: topic,
        topic,
        chaptersData,
        fullChapterContent,
        options
      });

      setResult({ id, metadata, chaptersData, fullChapterContent });
      setProgress({
        phase: 'complete',
        currentChapter: chaptersData.length,
        totalChapters: chaptersData.length,
        message: 'Curriculum generated successfully!'
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        setProgress(prev => ({ ...prev, message: 'Generation cancelled' }));
      } else {
        setError({
          type: err.type || ErrorType.UNKNOWN,
          message: err.message || 'An unexpected error occurred'
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [topic, chapters, difficulty, duration, apiKey, addCurriculum]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (onCancel) onCancel();
  }, [onCancel]);

  const handleActivate = useCallback(async () => {
    if (result?.id) {
      await switchCurriculum(result.id);
      if (onComplete) onComplete(result);
    }
  }, [result, switchCurriculum, onComplete]);

  const handleDownload = useCallback(() => {
    if (!result) return;

    const exportData = {
      name: result.metadata.name,
      topic: result.metadata.topic,
      chaptersData: result.chaptersData,
      fullChapterContent: result.fullChapterContent,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curriculum-${topic.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, topic]);

  // Render generation progress
  if (isGenerating || progress.phase === 'complete') {
    return (
      <GenerationProgress
        progress={progress}
        error={error}
        result={result}
        onActivate={handleActivate}
        onDownload={handleDownload}
        onCancel={handleCancel}
        onRetry={() => {
          setProgress({ phase: null, currentChapter: 0, totalChapters: 0, message: '' });
          setError(null);
          setResult(null);
        }}
      />
    );
  }

  // Render form
  return (
    <div className="space-y-6">
      {/* Topic Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          What would you like to learn?
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Python Machine Learning, AWS Cloud Fundamentals, React Development"
          className="w-full px-4 py-3 text-lg border rounded-lg
                     bg-white dark:bg-gray-700
                     text-gray-900 dark:text-gray-100
                     border-gray-300 dark:border-gray-600
                     focus:ring-2 focus:ring-navy-500 focus:border-transparent
                     placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Chapters
          </label>
          <select
            value={chapters}
            onChange={(e) => setChapters(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-700
                       text-gray-900 dark:text-gray-100
                       border-gray-300 dark:border-gray-600
                       focus:ring-2 focus:ring-navy-500"
          >
            {[3, 5, 7, 10, 12, 15].map(n => (
              <option key={n} value={n}>{n} chapters</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Difficulty Level
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-700
                       text-gray-900 dark:text-gray-100
                       border-gray-300 dark:border-gray-600
                       focus:ring-2 focus:ring-navy-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Minutes per Chapter
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-lg
                       bg-white dark:bg-gray-700
                       text-gray-900 dark:text-gray-100
                       border-gray-300 dark:border-gray-600
                       focus:ring-2 focus:ring-navy-500"
          >
            {[15, 30, 45, 60].map(n => (
              <option key={n} value={n}>{n} minutes</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cost Estimate */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <i className="fas fa-calculator text-blue-500 mt-1"></i>
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Estimated Cost: ${costEstimate.totalCost}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              ~{costEstimate.totalTokens.toLocaleString()} tokens
              ({costEstimate.inputTokens.toLocaleString()} input + {costEstimate.outputTokens.toLocaleString()} output)
            </p>
          </div>
        </div>
      </div>

      {/* API Key Warning */}
      {!apiKey && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <i className="fas fa-exclamation-triangle text-yellow-500 mt-1"></i>
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                API Key Required
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Please add your Anthropic API key in Settings before generating.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-3">
        <button
          onClick={handleGenerate}
          disabled={!topic.trim() || !apiKey}
          className="flex-1 px-6 py-3 text-lg font-medium text-white
                     bg-navy-600 hover:bg-navy-700
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <i className="fas fa-magic"></i>
          <span>Generate Curriculum</span>
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 dark:text-gray-300
                       border border-gray-300 dark:border-gray-600
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default GenerationWizard;
