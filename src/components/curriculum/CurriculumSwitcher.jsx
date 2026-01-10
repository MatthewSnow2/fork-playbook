import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useCurriculum } from '../../contexts/CurriculumContext';

/**
 * Curriculum Switcher dropdown for Navigation
 */
const CurriculumSwitcher = ({ onManage }) => {
  const {
    curricula,
    activeCurriculumId,
    switchCurriculum,
    getCurrentCurriculumInfo,
    DEFAULT_CURRICULUM_ID,
    isLoading
  } = useCurriculum();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentInfo = getCurrentCurriculumInfo();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle curriculum selection
  const handleSelect = useCallback(async (curriculumId) => {
    setIsOpen(false);
    if (curriculumId !== activeCurriculumId) {
      try {
        await switchCurriculum(curriculumId);
      } catch (error) {
        console.error('Failed to switch curriculum:', error);
      }
    }
  }, [activeCurriculumId, switchCurriculum]);

  // Handle manage click
  const handleManage = useCallback(() => {
    setIsOpen(false);
    if (onManage) onManage();
  }, [onManage]);

  // Default curriculum option
  const defaultOption = {
    id: DEFAULT_CURRICULUM_ID,
    name: 'AI Consulting Playbook',
    chapterCount: 14,
    isDefault: true
  };

  const allOptions = [defaultOption, ...curricula];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 px-3 py-2 text-sm
                   text-gray-700 dark:text-gray-300
                   hover:bg-gray-100 dark:hover:bg-gray-700
                   rounded-lg transition-colors"
      >
        <i className="fas fa-book text-navy-500"></i>
        <span className="max-w-[150px] truncate">
          {isLoading ? 'Loading...' : currentInfo?.name || 'Select Curriculum'}
        </span>
        <i className={`fas fa-chevron-down text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 py-2
                        bg-white dark:bg-gray-800
                        border border-gray-200 dark:border-gray-700
                        rounded-lg shadow-lg z-50">
          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {allOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                className={`w-full px-4 py-2 text-left flex items-center space-x-3
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                  ${option.id === activeCurriculumId ? 'bg-navy-50 dark:bg-navy-900/30' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0
                  ${option.id === activeCurriculumId ? 'bg-navy-500' : 'bg-transparent'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate
                    ${option.id === activeCurriculumId
                      ? 'font-medium text-navy-700 dark:text-navy-300'
                      : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {option.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {option.chapterCount} chapters
                    {option.isDefault && ' • Built-in'}
                  </p>
                </div>
                {option.id === activeCurriculumId && (
                  <i className="fas fa-check text-navy-500 flex-shrink-0"></i>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <hr className="my-2 border-gray-200 dark:border-gray-700" />

          {/* Manage Button */}
          <button
            onClick={handleManage}
            className="w-full px-4 py-2 text-left text-sm
                       text-navy-600 dark:text-navy-400
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       transition-colors flex items-center space-x-2"
          >
            <i className="fas fa-cog"></i>
            <span>Manage Curricula</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CurriculumSwitcher;
