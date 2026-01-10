import React, { useState, useCallback } from 'react';
import { useCurriculum } from '../../contexts/CurriculumContext';
import CurriculumCard from './CurriculumCard';
import GenerationWizard from './GenerationWizard';
import { importCurriculum } from '../../utils/curriculumStorage';

/**
 * Curriculum Manager view
 * List, create, and manage curricula
 */
const CurriculumManager = ({ onBack }) => {
  const {
    curricula,
    activeCurriculumId,
    switchCurriculum,
    removeCurriculum,
    getCurrentCurriculumInfo,
    DEFAULT_CURRICULUM_ID,
    apiKey,
    openSettingsModal
  } = useCurriculum();

  const [showGenerator, setShowGenerator] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const currentInfo = getCurrentCurriculumInfo();

  // Handle curriculum selection
  const handleSelect = useCallback(async (curriculumId) => {
    try {
      await switchCurriculum(curriculumId);
    } catch (error) {
      alert(`Failed to switch curriculum: ${error.message}`);
    }
  }, [switchCurriculum]);

  // Handle curriculum deletion
  const handleDelete = useCallback(async (curriculumId) => {
    if (!window.confirm('Are you sure you want to delete this curriculum? This cannot be undone.')) {
      return;
    }
    try {
      await removeCurriculum(curriculumId);
    } catch (error) {
      alert(`Failed to delete curriculum: ${error.message}`);
    }
  }, [removeCurriculum]);

  // Handle generation complete
  const handleGenerationComplete = useCallback(() => {
    setShowGenerator(false);
    if (onBack) onBack();
  }, [onBack]);

  // Handle import
  const handleImport = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importCurriculum(data);
      // Refresh the page to show imported curriculum
      window.location.reload();
    } catch (error) {
      alert(`Failed to import curriculum: ${error.message}`);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  }, []);

  // Show generator if requested
  if (showGenerator) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setShowGenerator(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300
                       transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Curricula
          </button>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Generate New Curriculum
        </h2>
        <GenerationWizard
          onComplete={handleGenerationComplete}
          onCancel={() => setShowGenerator(false)}
        />
      </div>
    );
  }

  // Default curriculum info
  const defaultCurriculum = {
    id: DEFAULT_CURRICULUM_ID,
    name: 'AI Consulting Playbook',
    topic: 'AI Consulting',
    chapterCount: 14,
    isDefault: true
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300
                         transition-colors mb-2"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Dashboard
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Curricula
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your learning curricula
          </p>
        </div>

        <div className="flex space-x-3">
          {/* Import Button */}
          <label className="px-4 py-2 text-gray-700 dark:text-gray-300
                           border border-gray-300 dark:border-gray-600
                           hover:bg-gray-50 dark:hover:bg-gray-700
                           rounded-lg transition-colors cursor-pointer flex items-center">
            <i className="fas fa-upload mr-2"></i>
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              disabled={isImporting}
            />
          </label>

          {/* Generate Button */}
          <button
            onClick={() => {
              if (!apiKey) {
                openSettingsModal();
                return;
              }
              setShowGenerator(true);
            }}
            className="px-4 py-2 text-white bg-navy-600 hover:bg-navy-700
                       rounded-lg transition-colors flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>
            Generate New
          </button>
        </div>
      </div>

      {/* Current Curriculum Banner */}
      {currentInfo && (
        <div className="mb-6 p-4 bg-gradient-to-r from-navy-500 to-blue-500 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-100">Currently Active</p>
              <h3 className="text-lg font-semibold">{currentInfo.name}</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-navy-100">{currentInfo.chapterCount} chapters</p>
              {currentInfo.isDefault && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-white/20 rounded">
                  Built-in
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Curricula Grid */}
      <div className="space-y-4">
        {/* Default Curriculum */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Built-in Curriculum
          </h2>
          <CurriculumCard
            curriculum={defaultCurriculum}
            isActive={activeCurriculumId === DEFAULT_CURRICULUM_ID}
            isDefault={true}
            onSelect={handleSelect}
          />
        </div>

        {/* Generated Curricula */}
        {curricula.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Generated Curricula ({curricula.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {curricula.map(curriculum => (
                <CurriculumCard
                  key={curriculum.id}
                  curriculum={curriculum}
                  isActive={activeCurriculumId === curriculum.id}
                  isDefault={false}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {curricula.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <i className="fas fa-graduation-cap text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
              No Generated Curricula Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 mb-4">
              Generate your first custom curriculum for any topic
            </p>
            <button
              onClick={() => {
                if (!apiKey) {
                  openSettingsModal();
                  return;
                }
                setShowGenerator(true);
              }}
              className="px-6 py-2 text-white bg-navy-600 hover:bg-navy-700
                         rounded-lg transition-colors"
            >
              <i className="fas fa-magic mr-2"></i>
              Generate Curriculum
            </button>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
          <i className="fas fa-info-circle mr-2 text-blue-500"></i>
          Tips
        </h4>
        <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <li>• Click on a curriculum to activate it</li>
          <li>• Generated curricula are stored locally in your browser</li>
          <li>• Use Import/Export to backup or share curricula</li>
          <li>• Each generation costs approximately $0.50-1.50 depending on chapters</li>
        </ul>
      </div>
    </div>
  );
};

export default CurriculumManager;
