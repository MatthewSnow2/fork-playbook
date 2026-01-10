import React, { useEffect, useCallback } from 'react';
import { useCurriculum } from '../../contexts/CurriculumContext';
import { useVARK } from '../../contexts/VARKContext';
import ApiKeyInput from './ApiKeyInput';

/**
 * Settings Modal component
 * Quick access to API key configuration and learning preferences
 */
const SettingsModal = () => {
  const {
    isSettingsModalOpen,
    closeSettingsModal,
    apiKey,
    isKeyValid,
    curricula,
    clearCurricula
  } = useCurriculum();

  const {
    preference,
    resetPreference,
    openAssessmentModal
  } = useVARK();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isSettingsModalOpen) {
        closeSettingsModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isSettingsModalOpen, closeSettingsModal]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      closeSettingsModal();
    }
  }, [closeSettingsModal]);

  // Handle retake VARK assessment
  const handleRetakeAssessment = useCallback(() => {
    closeSettingsModal();
    openAssessmentModal();
  }, [closeSettingsModal, openAssessmentModal]);

  // Handle clear curricula
  const handleClearCurricula = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete all generated curricula? This cannot be undone.')) {
      await clearCurricula();
    }
  }, [clearCurricula]);

  // Handle reset VARK
  const handleResetVARK = useCallback(() => {
    if (window.confirm('Reset your learning style preference?')) {
      resetPreference();
    }
  }, [resetPreference]);

  if (!isSettingsModalOpen) return null;

  // Get learning style label
  const styleLabelMap = {
    visual: 'Visual',
    auditory: 'Auditory',
    readWrite: 'Read/Write',
    kinesthetic: 'Kinesthetic'
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl
                      max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            <i className="fas fa-cog mr-2"></i>
            Settings
          </h2>
          <button
            onClick={closeSettingsModal}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                       rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API Key Section */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <i className="fas fa-key mr-2 text-navy-500"></i>
              API Configuration
            </h3>
            <ApiKeyInput />

            {/* Status indicator */}
            {apiKey && (
              <div className={`mt-3 p-3 rounded-lg text-sm flex items-center
                ${isKeyValid === true
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : isKeyValid === false
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                }`}
              >
                <i className={`fas ${isKeyValid === true ? 'fa-check-circle' : isKeyValid === false ? 'fa-exclamation-circle' : 'fa-question-circle'} mr-2`}></i>
                {isKeyValid === true
                  ? 'API key is valid and ready to use'
                  : isKeyValid === false
                    ? 'API key is invalid. Please check and try again.'
                    : 'API key saved. Click "Save & Test" to validate.'}
              </div>
            )}
          </section>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Learning Style Section */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <i className="fas fa-brain mr-2 text-purple-500"></i>
              Learning Style
            </h3>

            {preference.primaryStyle ? (
              <div className="space-y-3">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-purple-800 dark:text-purple-200">
                    <span className="font-medium">Your style:</span>{' '}
                    {styleLabelMap[preference.primaryStyle] || preference.primaryStyle}
                    {preference.manualOverride && (
                      <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">(manually set)</span>
                    )}
                  </p>
                  {preference.percentages && (
                    <div className="mt-2 text-sm text-purple-600 dark:text-purple-400">
                      V: {preference.percentages.visual}% | A: {preference.percentages.auditory}% |
                      R: {preference.percentages.readWrite}% | K: {preference.percentages.kinesthetic}%
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleRetakeAssessment}
                    className="px-3 py-2 text-sm text-purple-600 dark:text-purple-400
                               border border-purple-300 dark:border-purple-600
                               hover:bg-purple-50 dark:hover:bg-purple-900/20
                               rounded-lg transition-colors"
                  >
                    Retake Assessment
                  </button>
                  <button
                    onClick={handleResetVARK}
                    className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400
                               hover:text-red-600 dark:hover:text-red-400
                               transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-600 dark:text-gray-400">
                  You haven't completed the learning style assessment yet.
                </p>
                <button
                  onClick={handleRetakeAssessment}
                  className="px-4 py-2 text-sm font-medium text-white
                             bg-purple-600 hover:bg-purple-700
                             rounded-lg transition-colors"
                >
                  Take Assessment
                </button>
              </div>
            )}
          </section>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Data Management Section */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <i className="fas fa-database mr-2 text-blue-500"></i>
              Data Management
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Generated Curricula
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {curricula.length} curriculum{curricula.length !== 1 ? 's' : ''} saved
                  </p>
                </div>
                {curricula.length > 0 && (
                  <button
                    onClick={handleClearCurricula}
                    className="px-3 py-1 text-xs text-red-600 dark:text-red-400
                               border border-red-300 dark:border-red-600
                               hover:bg-red-50 dark:hover:bg-red-900/20
                               rounded transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                <i className="fas fa-info-circle mr-1"></i>
                Progress data is stored in localStorage. Curricula are stored in IndexedDB for better performance with large content.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={closeSettingsModal}
            className="w-full px-4 py-2 text-sm font-medium
                       text-gray-700 dark:text-gray-300
                       bg-white dark:bg-gray-700
                       border border-gray-300 dark:border-gray-600
                       hover:bg-gray-50 dark:hover:bg-gray-600
                       rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
