import React, { useState } from 'react';
import { varkQuestions, styleConfig } from '../../data/vark-questions';
import { calculateVARKScores } from '../../utils/varkHelpers';

/**
 * VARK Learning Style Assessment Component
 *
 * 12-question assessment to determine user's dominant learning style.
 * Shows one question at a time with progress indicator and results display.
 */
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

  // Results screen
  if (showResults && results) {
    const primaryConfig = styleConfig[results.primaryStyle];

    return (
      <div className={`${isModal ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50' : ''}`}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${primaryConfig.bgColor} mb-4`}>
              <i className={`fas ${primaryConfig.icon} text-3xl ${primaryConfig.textColor}`}></i>
            </div>
            <h2 className="text-2xl font-bold text-navy-800 dark:text-white">
              You're a {primaryConfig.name} Learner!
            </h2>
            <p className="text-silver-600 dark:text-silver-400 mt-2">
              {primaryConfig.description}
            </p>
          </div>

          {/* Score breakdown */}
          <div className="space-y-4 mb-8">
            {Object.entries(results.percentages).map(([style, percentage]) => (
              <div key={style} className="flex items-center">
                <div className="w-24 flex items-center">
                  <i className={`fas ${styleConfig[style].icon} mr-2 ${styleConfig[style].textColor}`}></i>
                  <span className="text-sm text-silver-700 dark:text-silver-300">
                    {styleConfig[style].name}
                  </span>
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-3 bg-silver-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        style === results.primaryStyle
                          ? 'bg-navy-600'
                          : 'bg-silver-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-silver-700 dark:text-silver-300 w-12 text-right">
                  {percentage}%
                </span>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className={`p-4 rounded-lg ${primaryConfig.bgColor} mb-8`}>
            <h3 className={`font-semibold ${primaryConfig.textColor} mb-2`}>
              Tips for {primaryConfig.name} Learners
            </h3>
            <ul className="space-y-1">
              {primaryConfig.tips.map((tip, index) => (
                <li key={index} className="flex items-start text-sm text-silver-700 dark:text-silver-300">
                  <i className={`fas fa-check mr-2 mt-0.5 ${primaryConfig.textColor}`}></i>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Continue button */}
          <button
            onClick={handleComplete}
            className="w-full py-3 bg-navy-600 hover:bg-navy-700 text-white rounded-lg font-medium transition-colors"
          >
            Start Learning with Personalized Content
          </button>
        </div>
      </div>
    );
  }

  // Question screen
  const question = varkQuestions[currentQuestion];

  return (
    <div className={`${isModal ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50' : ''}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-xl">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-sm text-silver-600 dark:text-silver-400">
            Question {currentQuestion + 1} of {varkQuestions.length}
          </span>
          <div className="w-48 h-2 bg-silver-200 dark:bg-gray-700 rounded-full">
            <div
              className="h-full bg-navy-600 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / varkQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <h2 className="text-xl font-bold text-navy-800 dark:text-white mb-6">
          {question.question}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {Object.entries(question.options).map(([style, text]) => (
            <button
              key={style}
              onClick={() => handleAnswer(style)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                answers[currentQuestion] === style
                  ? 'border-navy-600 bg-navy-50 dark:bg-gray-700'
                  : 'border-silver-200 dark:border-gray-600 hover:border-navy-300 dark:hover:border-gray-500'
              }`}
            >
              <span className="text-silver-800 dark:text-silver-200">{text}</span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={currentQuestion === 0}
            className="px-6 py-2 text-silver-600 dark:text-silver-400 disabled:opacity-50 hover:text-silver-800 dark:hover:text-silver-200 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={answers[currentQuestion] === undefined}
            className="px-6 py-2 bg-navy-600 text-white rounded-lg disabled:opacity-50 hover:bg-navy-700 transition-colors"
          >
            {currentQuestion === varkQuestions.length - 1 ? (
              <>
                See Results
                <i className="fas fa-check ml-2"></i>
              </>
            ) : (
              <>
                Next
                <i className="fas fa-arrow-right ml-2"></i>
              </>
            )}
          </button>
        </div>

        {/* Skip */}
        {onSkip && (
          <button
            onClick={handleSkip}
            className="w-full mt-4 text-sm text-silver-500 hover:text-silver-700 dark:text-silver-500 dark:hover:text-silver-300 transition-colors"
          >
            Skip assessment for now
          </button>
        )}
      </div>
    </div>
  );
};

export default VARKAssessment;
