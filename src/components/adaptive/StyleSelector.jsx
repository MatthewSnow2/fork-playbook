import React from 'react';
import { styleConfig } from '../../data/vark-questions';

/**
 * StyleSelector Component
 *
 * Toggle between V/A/R/K content variants.
 * Shows current selection and allows switching.
 * Supports both compact (icon-only) and full (with labels) modes.
 */
const StyleSelector = ({
  currentStyle,
  onStyleChange,
  showAssessmentPrompt = false,
  onTakeAssessment,
  compact = false,
  disabled = false
}) => {
  const styles = Object.entries(styleConfig);

  // Compact mode: icon buttons only
  if (compact) {
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
                : 'text-silver-400 hover:text-silver-600 dark:text-silver-500 dark:hover:text-silver-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={config.name}
          >
            <i className={`fas ${config.icon}`}></i>
          </button>
        ))}
        {showAssessmentPrompt && onTakeAssessment && (
          <button
            onClick={onTakeAssessment}
            className="ml-2 p-2 text-navy-600 hover:text-navy-800 dark:text-navy-400 dark:hover:text-navy-300"
            title="Take Assessment"
          >
            <i className="fas fa-clipboard-list"></i>
          </button>
        )}
      </div>
    );
  }

  // Full mode: buttons with labels
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-silver-700 dark:text-silver-300">
          Learning Style
        </span>
        {showAssessmentPrompt && onTakeAssessment && (
          <button
            onClick={onTakeAssessment}
            className="text-sm text-navy-600 hover:underline dark:text-navy-400"
          >
            <i className="fas fa-clipboard-list mr-1"></i>
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
                : 'border-silver-200 dark:border-gray-600 hover:border-silver-300 dark:hover:border-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <i className={`fas ${config.icon} ${config.textColor}`}></i>
            <span className={`text-sm ${
              currentStyle === key
                ? config.textColor
                : 'text-silver-700 dark:text-silver-300'
            }`}>
              {config.name}
            </span>
          </button>
        ))}
      </div>

      {/* Current style description */}
      {currentStyle && (
        <p className="text-xs text-silver-500 dark:text-silver-400 mt-2">
          {styleConfig[currentStyle].description}
        </p>
      )}
    </div>
  );
};

export default StyleSelector;
