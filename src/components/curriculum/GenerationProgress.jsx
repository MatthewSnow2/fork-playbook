import React from 'react';

/**
 * Generation Progress component
 * Shows progress during curriculum generation
 */
const GenerationProgress = ({
  progress,
  error,
  result,
  onActivate,
  onDownload,
  onCancel,
  onRetry
}) => {
  const { phase, currentChapter, totalChapters, message } = progress;

  // Calculate progress percentage
  const getProgressPercent = () => {
    if (phase === 'complete') return 100;
    if (phase === 'outline') return 10;
    if (phase === 'content' && totalChapters > 0) {
      return 10 + (currentChapter / totalChapters) * 90;
    }
    return 0;
  };

  const progressPercent = getProgressPercent();

  // Render error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <i className="fas fa-exclamation-circle text-3xl text-red-500"></i>
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
                Generation Failed
              </h3>
              <p className="mt-2 text-red-600 dark:text-red-400">
                {error.message}
              </p>
              {error.type === 'INVALID_KEY' && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Please check your API key in Settings.
                </p>
              )}
              {error.type === 'INSUFFICIENT_CREDITS' && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-red-500"
                  >
                    Check your Anthropic account
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 text-white bg-navy-600 hover:bg-navy-700
                       rounded-lg transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>
            Try Again
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300
                       border border-gray-300 dark:border-gray-600
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Render success state
  if (phase === 'complete' && result) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <i className="fas fa-check-circle text-3xl text-green-500"></i>
            </div>
            <div>
              <h3 className="text-lg font-medium text-green-800 dark:text-green-200">
                Curriculum Generated!
              </h3>
              <p className="mt-2 text-green-600 dark:text-green-400">
                "{result.metadata.name}" is ready with {result.chaptersData.length} chapters.
              </p>
            </div>
          </div>
        </div>

        {/* Chapter Preview */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-700 dark:text-gray-300">
              Chapter Preview
            </h4>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {result.chaptersData.map((chapter, index) => (
              <div
                key={chapter.id}
                className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0
                           flex items-center space-x-3"
              >
                <span className="text-sm text-gray-400 w-6">{chapter.number}</span>
                <i className={`fas ${chapter.icon} text-navy-500`}></i>
                <span className="text-gray-700 dark:text-gray-300">{chapter.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onActivate}
            className="flex-1 px-4 py-3 text-white bg-green-600 hover:bg-green-700
                       rounded-lg transition-colors font-medium"
          >
            <i className="fas fa-play mr-2"></i>
            Activate Now
          </button>
          <button
            onClick={onDownload}
            className="px-4 py-3 text-gray-700 dark:text-gray-300
                       border border-gray-300 dark:border-gray-600
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       rounded-lg transition-colors"
          >
            <i className="fas fa-download mr-2"></i>
            Download JSON
          </button>
        </div>
      </div>
    );
  }

  // Render progress state
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full
                        bg-navy-100 dark:bg-navy-900 mb-4">
          <i className="fas fa-magic text-2xl text-navy-600 dark:text-navy-400 animate-pulse"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Generating Curriculum
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {message}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-navy-500 to-blue-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            {phase === 'outline' && 'Phase 1: Outline'}
            {phase === 'content' && `Phase 2: Content (${currentChapter}/${totalChapters})`}
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Chapter Progress */}
      {phase === 'content' && totalChapters > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: totalChapters }, (_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${i < currentChapter
                  ? 'bg-green-500 text-white'
                  : i === currentChapter - 1
                    ? 'bg-navy-500 text-white animate-pulse'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
            >
              {i < currentChapter ? (
                <i className="fas fa-check"></i>
              ) : (
                i + 1
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel Button */}
      <div className="text-center">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700
                     dark:text-gray-400 dark:hover:text-gray-300
                     transition-colors"
        >
          <i className="fas fa-times mr-1"></i>
          Cancel Generation
        </button>
      </div>

      {/* Cost Warning */}
      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        <i className="fas fa-info-circle mr-1"></i>
        Generation uses your Anthropic API credits. Do not close this page.
      </p>
    </div>
  );
};

export default GenerationProgress;
